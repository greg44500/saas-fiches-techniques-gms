import mongoose from 'mongoose';

import {
    BUSINESS_ACTIVITY_ACTION,
} from '../businessActivity/businessActivity.registry.js';
import {
    TECHNICAL_SHEET_VALUATION_STATUS,
} from './technicalSheet.registry.js';
import {
    TechnicalSheet,
} from './technicalSheet.model.js';
import {
    TechnicalSheetDraft,
} from './technicalSheetDraft.model.js';
import {
    prepareTechnicalSheetComposition,
} from './technicalSheetComposition.service.js';
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
            portions:
                Object.hasOwn(data, 'portions')
                    ? data.portions
                    : current.portions
                        ?.toString() ?? null,
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
                    session,
                });

            preparedLines =
                prepared.lines.map((line) => ({
                    ...line,
                    valuation: undefined,
                    productVariantSnapshot:
                        undefined,
                }));
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

export { saveTechnicalSheetDraft };
