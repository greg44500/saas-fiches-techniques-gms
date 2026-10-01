import mongoose from 'mongoose';

import {
    BUSINESS_ACTIVITY_ACTION,
} from '../businessActivity/businessActivity.registry.js';
import {
    resolveSupplierArticle,
} from '../supplierCatalog/supplierPricing.service.js';
import {
    TECHNICAL_SHEET_STATUS,
    TECHNICAL_SHEET_VALUATION_STATUS,
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
    buildTechnicalSheetValuation,
} from './technicalSheetValuation.service.js';
import {
    createTechnicalSheetEvent,
} from './technicalSheetEvent.service.js';
import {
    serializeTechnicalSheetDraft,
} from './technicalSheet.serializer.js';
import {
    assertOperationalDossier,
} from './technicalSheet.service.js';
import { AppError } from '../../utils/appError.js';

const ECONOMIC_FIELDS = Object.freeze([
    'vatRateBasisPoints',
    'targetMarginBasisPoints',
    'finalPriceTtcMinor',
    'finalPriceMode',
]);

const applyAutomaticValuation = async ({
    workspaceId,
    dossierId,
    draft,
    actorId,
    session,
    atDate = new Date(),
}) => {
    if (draft.lines.length === 0) {
        draft.valuationStatus =
            TECHNICAL_SHEET_VALUATION_STATUS
                .NOT_VALUED;
        draft.valuedAt = null;
        draft.valuationFingerprint = null;
        draft.economicSnapshot = null;
        draft.updatedBy = actorId;
        await draft.save({ session });
        return {
            resolutionCandidates: {},
        };
    }

    const valuation =
        await buildTechnicalSheetValuation({
            workspaceId,
            dossierId,
            draft,
            atDate,
            session,
        });

    draft.lines =
        valuation.lines.map((line) => {
            const {
                productVariantSnapshot,
                ...persisted
            } = line;

            return persisted;
        });
    draft.valuationStatus =
        valuation.valuationStatus;
    draft.valuedAt =
        valuation.valuedAt;
    draft.valuationFingerprint =
        valuation.valuationFingerprint;
    draft.economicSnapshot =
        valuation.economicSnapshot;

    if (valuation.economicSnapshot) {
        draft.finalPriceTtcMinor =
            valuation.economicSnapshot
                .finalPriceTtcMinor;
    }

    draft.updatedBy = actorId;
    await draft.save({ session });

    return valuation;
};

const saveTechnicalSheetDraft = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
    actorId,
    expectedRevision,
    data,
    canManageSourcing,
    canManageValuation,
}) => mongoose.connection.transaction(
    async (session) => {
        await assertOperationalDossier({
            workspaceId,
            dossierId,
            session,
        });

        const sheet =
            await TechnicalSheet.findOne({
                _id: technicalSheetId,
                workspace: workspaceId,
                dossier: dossierId,
                status: 'ACTIVE',
            }).session(session);

        if (!sheet) {
            throw new AppError(
                'Fiche technique indisponible pour la modification.',
                409,
            );
        }

        const current =
            await TechnicalSheetDraft.findOne({
                technicalSheet: technicalSheetId,
                workspace: workspaceId,
                dossier: dossierId,
                revision: expectedRevision,
            }).session(session);

        if (!current) {
            throw new AppError(
                'Conflit de modification du brouillon.',
                409,
            );
        }

        const sourcingRequested =
            Array.isArray(data.lines)
            && data.lines.some(
                (line) =>
                    Object.hasOwn(
                        line,
                        'selectedSupplierArticleId',
                    ),
            );

        if (
            sourcingRequested
            && !canManageSourcing
        ) {
            throw new AppError(
                'Permission de gestion de l’approvisionnement requise.',
                403,
            );
        }

        const valuationRequested =
            ECONOMIC_FIELDS.some(
                (field) =>
                    Object.hasOwn(data, field),
            );

        if (
            valuationRequested
            && !canManageValuation
        ) {
            throw new AppError(
                'Permission de gestion de la valorisation requise.',
                403,
            );
        }

        const merged = {
            productionQuantity:
                Object.hasOwn(
                    data,
                    'productionQuantity',
                )
                    ? data.productionQuantity
                    : current.productionQuantity
                        ?.toString() ?? null,
            productionUnit:
                Object.hasOwn(
                    data,
                    'productionUnit',
                )
                    ? data.productionUnit
                    : current.productionUnit,
            vatRateBasisPoints:
                Object.hasOwn(
                    data,
                    'vatRateBasisPoints',
                )
                    ? data.vatRateBasisPoints
                    : current.vatRateBasisPoints,
            targetMarginBasisPoints:
                Object.hasOwn(
                    data,
                    'targetMarginBasisPoints',
                )
                    ? data.targetMarginBasisPoints
                    : current.targetMarginBasisPoints,
            finalPriceTtcMinor:
                Object.hasOwn(
                    data,
                    'finalPriceTtcMinor',
                )
                    ? data.finalPriceTtcMinor
                    : current.finalPriceTtcMinor,
            finalPriceMode:
                Object.hasOwn(
                    data,
                    'finalPriceMode',
                )
                    ? data.finalPriceMode
                    : current.finalPriceMode,
        };

        let preparedLines = current.lines;

        if (Array.isArray(data.lines)) {
            const prepared =
                await prepareTechnicalSheetComposition({
                    lines: data.lines,
                    workspaceId,
                    session,
                });

            const currentLinesById = new Map(
                current.lines.map((line) => [
                    line._id.toString(),
                    line,
                ]),
            );

            preparedLines =
                prepared.lines.map((line, index) => {
                    const inputLine = data.lines[index];
                    const existingLine =
                        inputLine?.id
                            ? currentLinesById.get(
                                inputLine.id.toString(),
                            )
                            : null;
                    const sourcingWasExplicit =
                        Object.hasOwn(
                            inputLine ?? {},
                            'selectedSupplierArticleId',
                        );

                    return {
                        ...line,
                        selectedSupplierArticle:
                            sourcingWasExplicit
                                ? line.selectedSupplierArticle
                                : existingLine
                                    ?.selectedSupplierArticle
                                ?? null,
                        valuation: undefined,
                        productVariantSnapshot:
                            undefined,
                    };
                });
        }

        const wasValued =
            current.valuationStatus
            !== TECHNICAL_SHEET_VALUATION_STATUS
                .NOT_VALUED;
        const valuationStatus =
            wasValued
                ? TECHNICAL_SHEET_VALUATION_STATUS.STALE
                : TECHNICAL_SHEET_VALUATION_STATUS
                    .NOT_VALUED;

        const draft =
            await TechnicalSheetDraft.findOneAndUpdate(
                {
                    _id: current._id,
                    revision: expectedRevision,
                },
                {
                    $set: {
                        ...merged,
                        lines: preparedLines,
                        valuationStatus,
                        valuedAt: null,
                        valuationFingerprint: null,
                        economicSnapshot: null,
                        updatedBy: actorId,
                    },
                    $inc: { revision: 1 },
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                    session,
                },
            );

        if (!draft) {
            throw new AppError(
                'Conflit de modification du brouillon.',
                409,
            );
        }

        const automaticValuation =
            await applyAutomaticValuation({
                workspaceId,
                dossierId,
                draft,
                actorId,
                session,
            });

        await createTechnicalSheetEvent({
            workspaceId,
            dossierId,
            actorId,
            action:
                sourcingRequested
                    ? BUSINESS_ACTIVITY_ACTION
                        .TECHNICAL_SHEET_SOURCING_CHANGED
                    : BUSINESS_ACTIVITY_ACTION
                        .TECHNICAL_SHEET_DRAFT_SAVED,
            technicalSheetId,
            metadata: {
                expectedRevision,
                nextRevision:
                    draft.revision,
                valuationStatus:
                    draft.valuationStatus,
                resolutionCandidateCount:
                    Object.keys(
                        automaticValuation
                            .resolutionCandidates
                        ?? {},
                    ).length,
            },
            session,
        });

        await draft.populate({
            path: 'lines.productVariant',
            select:
                '_id name referenceUnit yieldPercent status',
        });

        return serializeTechnicalSheetDraft(
            draft,
        );
    },
);

const getTechnicalSheetDraft = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
}) => {
    const sheet =
        await TechnicalSheet.findOne({
            _id: technicalSheetId,
            workspace: workspaceId,
            dossier: dossierId,
            status: mongoose.trusted({
                $ne:
                    TECHNICAL_SHEET_STATUS.DELETED,
            }),
        })
            .select('_id')
            .lean();

    if (!sheet) {
        throw new AppError(
            'Fiche technique introuvable.',
            404,
        );
    }

    const draft =
        await TechnicalSheetDraft.findOne({
            technicalSheet: technicalSheetId,
            workspace: workspaceId,
            dossier: dossierId,
        }).populate({
            path: 'lines.productVariant',
            select:
                '_id name referenceUnit yieldPercent status',
        });

    return draft
        ? serializeTechnicalSheetDraft(draft)
        : null;
};

const createDraftFromValidatedState = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
    actorId,
    expectedSheetRevision,
}) => mongoose.connection.transaction(
    async (session) => {
        await assertOperationalDossier({
            workspaceId,
            dossierId,
            session,
        });

        const sheet =
            await TechnicalSheet.findOne({
                _id: technicalSheetId,
                workspace: workspaceId,
                dossier: dossierId,
                status: 'ACTIVE',
                revision:
                    expectedSheetRevision,
            }).session(session);

        if (!sheet) {
            throw new AppError(
                'Conflit de modification de la Fiche technique.',
                409,
            );
        }

        const existing =
            await TechnicalSheetDraft.findOne({
                technicalSheet:
                    technicalSheetId,
                workspace: workspaceId,
                dossier: dossierId,
            }).session(session);

        if (existing) {
            throw new AppError(
                'Un brouillon existe déjà pour cette Fiche technique.',
                409,
            );
        }

        if (!sheet.currentValidatedState) {
            throw new AppError(
                'Aucun état validé ne permet d’initialiser un nouveau brouillon.',
                409,
            );
        }

        const validation =
            await TechnicalSheetValidation.findOne({
                _id:
                    sheet.currentValidatedState,
                technicalSheet:
                    technicalSheetId,
                workspace: workspaceId,
                dossier: dossierId,
            }).session(session);

        if (!validation) {
            throw new AppError(
                'État validé courant introuvable.',
                409,
            );
        }

        const prepared =
            await prepareTechnicalSheetComposition({
                workspaceId,
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
                            selectedSupplierArticleId:
                                line.supplierArticleId
                                    .toString(),
                        }),
                    ),
                session,
            });

        const [draft] =
            await TechnicalSheetDraft.create(
                [{
                    workspace: workspaceId,
                    dossier: dossierId,
                    technicalSheet:
                        technicalSheetId,
                    productionQuantity:
                        validation
                            .sheetSnapshot
                            .productionQuantity
                            .toString(),
                    productionUnit:
                        validation
                            .sheetSnapshot
                            .productionUnit,
                    vatRateBasisPoints:
                        validation
                            .sheetSnapshot
                            .vatRateBasisPoints,
                    targetMarginBasisPoints:
                        validation
                            .sheetSnapshot
                            .targetMarginBasisPoints,
                    finalPriceTtcMinor:
                        validation
                            .economicSnapshot
                            .finalPriceTtcMinor,
                    finalPriceMode:
                        validation
                            .economicSnapshot
                            .finalPriceMode,
                    lines:
                        prepared.lines.map(
                            (line) => ({
                                ...line,
                                valuation:
                                    undefined,
                                productVariantSnapshot:
                                    undefined,
                            }),
                        ),
                    valuationStatus:
                        TECHNICAL_SHEET_VALUATION_STATUS.STALE,
                    createdBy: actorId,
                    updatedBy: actorId,
                }],
                { session },
            );

        await applyAutomaticValuation({
            workspaceId,
            dossierId,
            draft,
            actorId,
            session,
        });

        await createTechnicalSheetEvent({
            workspaceId,
            dossierId,
            actorId,
            action:
                BUSINESS_ACTIVITY_ACTION
                    .TECHNICAL_SHEET_DRAFT_SAVED,
            technicalSheetId,
            metadata: {
                initializedFromValidationId:
                    validation._id.toString(),
            },
            session,
        });

        await draft.populate({
            path: 'lines.productVariant',
            select:
                '_id name referenceUnit yieldPercent status',
        });

        return serializeTechnicalSheetDraft(
            draft,
        );
    },
);

const selectTechnicalSheetSupplierArticle = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
    actorId,
    expectedRevision,
    lineId,
    supplierArticleId,
}) => mongoose.connection.transaction(
    async (session) => {
        await assertOperationalDossier({
            workspaceId,
            dossierId,
            session,
        });

        const draft =
            await TechnicalSheetDraft.findOne({
                technicalSheet: technicalSheetId,
                workspace: workspaceId,
                dossier: dossierId,
                revision: expectedRevision,
            }).session(session);

        if (!draft) {
            throw new AppError(
                'Conflit de modification du brouillon.',
                409,
            );
        }

        const line = draft.lines.id(lineId);

        if (!line) {
            throw new AppError(
                'Ligne de Fiche technique introuvable.',
                404,
            );
        }

        const article = await resolveSupplierArticle({
            workspaceId,
            articleId: supplierArticleId,
            session,
        });

        const articleVariantId = (
            article.productVariant?._id
            ?? article.productVariant
        ).toString();

        if (
            articleVariantId
            !== line.productVariant.toString()
        ) {
            throw new AppError(
                'L’Article fournisseur ne correspond pas à la Référence Produit de cette ligne.',
                409,
            );
        }

        line.selectedSupplierArticle =
            article._id;
        draft.updatedBy = actorId;
        draft.revision += 1;

        const automaticValuation =
            await applyAutomaticValuation({
                workspaceId,
                dossierId,
                draft,
                actorId,
                session,
            });

        await createTechnicalSheetEvent({
            workspaceId,
            dossierId,
            actorId,
            action:
                BUSINESS_ACTIVITY_ACTION
                    .TECHNICAL_SHEET_SOURCING_CHANGED,
            technicalSheetId,
            metadata: {
                lineId:
                    line._id.toString(),
                supplierArticleId:
                    article._id.toString(),
                valuationStatus:
                    draft.valuationStatus,
                resolutionCandidateCount:
                    Object.keys(
                        automaticValuation
                            .resolutionCandidates
                        ?? {},
                    ).length,
            },
            session,
        });

        await draft.populate({
            path: 'lines.productVariant',
            select:
                '_id name referenceUnit yieldPercent status',
        });

        return serializeTechnicalSheetDraft(
            draft,
        );
    },
);

export {
    applyAutomaticValuation,
    createDraftFromValidatedState,
    getTechnicalSheetDraft,
    saveTechnicalSheetDraft,
    selectTechnicalSheetSupplierArticle,
};
