import mongoose from 'mongoose';

import {
    BUSINESS_ACTIVITY_ACTION,
} from '../businessActivity/businessActivity.registry.js';
import {
    DossierAccessGrant,
} from '../dossier/dossierAccess.model.js';
import {
    DOSSIER_ACCESS_GRANT_STATUS,
} from '../dossier/dossierAccess.registry.js';
import {
    Dossier,
} from '../dossier/dossier.model.js';
import {
    DOSSIER_STATUS,
} from '../dossier/dossier.registry.js';
import {
    enforcePlanLimit,
} from '../plan/planLimit.service.js';
import { AppError } from '../../utils/appError.js';
import {
    TECHNICAL_SHEET_METRIC,
    TECHNICAL_SHEET_STATUS,
} from './technicalSheet.registry.js';
import {
    TechnicalSheet,
} from './technicalSheet.model.js';
import {
    TechnicalSheetDraft,
} from './technicalSheetDraft.model.js';
import {
    TechnicalSheetValidation,
} from './technicalSheetValidation.model.js';
import {
    prepareTechnicalSheetComposition,
} from './technicalSheetComposition.service.js';
import {
    createTechnicalSheetEvent,
} from './technicalSheetEvent.service.js';
import {
    serializeTechnicalSheet,
    serializeTechnicalSheetDraft,
} from './technicalSheet.serializer.js';

const assertTargetDossierAccess = async ({
    workspaceId,
    targetDossierId,
    membershipId,
    isOwner,
    session,
}) => {
    const dossier = await Dossier.findOne({
        _id: targetDossierId,
        workspace: workspaceId,
        status: DOSSIER_STATUS.ACTIVE,
    }).session(session);

    if (!dossier) {
        throw new AppError(
            'Dossier cible introuvable ou non opérationnel.',
            404,
        );
    }

    if (!isOwner) {
        const grant =
            await DossierAccessGrant.findOne({
                workspace: workspaceId,
                dossier: dossier._id,
                workspaceMember:
                    membershipId,
                status:
                    DOSSIER_ACCESS_GRANT_STATUS.ACTIVE,
            }).session(session);

        if (!grant) {
            throw new AppError(
                'Dossier cible introuvable.',
                404,
            );
        }
    }

    return dossier;
};

const sourceComposition = async ({
    sheet,
    workspaceId,
    dossierId,
    session,
}) => {
    if (!sheet.currentValidatedState) {
        throw new AppError(
            'La Fiche source ne possède aucune composition copiable.',
            409,
        );
    }

    const validation =
        await TechnicalSheetValidation
            .findOne({
                _id:
                    sheet.currentValidatedState,
                technicalSheet:
                    sheet._id,
                workspace: workspaceId,
                dossier: dossierId,
            })
            .session(session);

    if (!validation) {
        throw new AppError(
            'État validé source introuvable.',
            409,
        );
    }

    return {
        productionQuantity:
            validation.sheetSnapshot
                .productionQuantity
                .toString(),
        productionUnit:
            validation.sheetSnapshot
                .productionUnit,
        vatRateBasisPoints:
            validation.sheetSnapshot
                .vatRateBasisPoints,
        lines:
            validation.linesSnapshot.map(
                (line) => ({
                    kind: line.kind,
                    productVariantId:
                        line.productVariantId
                            .toString(),
                    netQuantity:
                        line.netQuantity
                            .toString(),
                    inputUnit:
                        line.inputUnit,
                    order: line.order,
                    note:
                        line.note ?? null,
                }),
            ),
    };
};

const copyTechnicalSheet = async ({
    workspaceId,
    sourceDossierId,
    technicalSheetId,
    targetDossierId,
    actorId,
    membershipId,
    isOwner,
}) => mongoose.connection.transaction(
    async (session) => {
        const source =
            await TechnicalSheet.findOne({
                _id: technicalSheetId,
                workspace: workspaceId,
                dossier: sourceDossierId,
                status: mongoose.trusted({
                    $in: [
                        TECHNICAL_SHEET_STATUS.ACTIVE,
                        TECHNICAL_SHEET_STATUS.ARCHIVED,
                    ],
                }),
            }).session(session);

        if (!source) {
            throw new AppError(
                'Fiche technique source introuvable.',
                404,
            );
        }

        const openDraft =
            await TechnicalSheetDraft.findOne({
                technicalSheet:
                    source._id,
                workspace:
                    workspaceId,
                dossier:
                    sourceDossierId,
            })
                .select('_id')
                .session(session)
                .lean();

        if (openDraft) {
            const error = new AppError(
                'La Fiche doit être validée avant de pouvoir être copiée.',
                409,
            );
            error.code =
                'TECHNICAL_SHEET_COPY_DRAFT_FORBIDDEN';
            throw error;
        }

        const target =
            await assertTargetDossierAccess({
                workspaceId,
                targetDossierId,
                membershipId,
                isOwner,
                session,
            });

        await enforcePlanLimit({
            workspaceId,
            metricKey:
                TECHNICAL_SHEET_METRIC.TECHNICAL_SHEETS,
            amount: 1,
            actorId,
            session,
        });

        const composition =
            await sourceComposition({
                sheet: source,
                workspaceId,
                dossierId:
                    sourceDossierId,
                session,
            });

        const prepared =
            await prepareTechnicalSheetComposition({
                workspaceId,
                lines:
                    composition.lines,
                session,
            });

        const [copy] =
            await TechnicalSheet.create(
                [{
                    workspace: workspaceId,
                    dossier:
                        targetDossierId,
                    name: source.name,
                    description:
                        source.description
                        ?? null,
                    status:
                        TECHNICAL_SHEET_STATUS.ACTIVE,
                    statusChangedBy:
                        actorId,
                    copyOrigin: {
                        sourceTechnicalSheet:
                            source._id,
                        sourceDossier:
                            source.dossier,
                        copiedAt:
                            new Date(),
                    },
                    createdBy: actorId,
                    updatedBy: actorId,
                }],
                { session },
            );

        const [draft] =
            await TechnicalSheetDraft.create(
                [{
                    workspace: workspaceId,
                    dossier:
                        targetDossierId,
                    technicalSheet:
                        copy._id,
                    productionQuantity:
                        composition
                            .productionQuantity,
                    productionUnit:
                        composition
                            .productionUnit,
                    vatRateBasisPoints:
                        composition
                            .vatRateBasisPoints,
                    targetMarginBasisPoints:
                        target.technicalSheetSettings
                            ?.defaultTargetMarginBasisPoints
                        ?? null,
                    lines:
                        prepared.lines.map(
                            (line) => ({
                                ...line,
                                selectedSupplierArticle:
                                    null,
                                valuation:
                                    undefined,
                                productVariantSnapshot:
                                    undefined,
                            }),
                        ),
                    createdBy: actorId,
                    updatedBy: actorId,
                }],
                { session },
            );

        await createTechnicalSheetEvent({
            workspaceId,
            dossierId:
                targetDossierId,
            actorId,
            action:
                BUSINESS_ACTIVITY_ACTION
                    .TECHNICAL_SHEET_COPIED,
            technicalSheetId:
                copy._id,
            metadata: {
                sourceTechnicalSheetId:
                    source._id.toString(),
                sourceDossierId:
                    source.dossier.toString(),
            },
            session,
        });

        return {
            sheet:
                serializeTechnicalSheet(
                    copy,
                ),
            draft:
                serializeTechnicalSheetDraft(
                    draft,
                ),
        };
    },
);

export { copyTechnicalSheet };
