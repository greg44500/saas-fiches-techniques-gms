import mongoose from 'mongoose';

import {
    BUSINESS_ACTIVITY_ACTION,
} from '../businessActivity/businessActivity.registry.js';
import { AppError } from '../../utils/appError.js';
import {
    TECHNICAL_SHEET_CHANGE_KIND,
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
    buildTechnicalSheetValuation,
} from './technicalSheetValuation.service.js';
import {
    createTechnicalSheetEvent,
} from './technicalSheetEvent.service.js';
import {
    serializeTechnicalSheetValidation,
} from './technicalSheet.serializer.js';
import {
    assertOperationalDossier,
} from './technicalSheet.service.js';

const comparableJson = (value) =>
    JSON.stringify(value);

const inferChangeKinds = ({
    previousValidation,
    sheet,
    draft,
    valuation,
}) => {
    if (!previousValidation) {
        return Object.values(
            TECHNICAL_SHEET_CHANGE_KIND,
        );
    }

    const changes = [];

    const previousSheet =
        previousValidation.sheetSnapshot
            ?.toObject?.()
        ?? previousValidation.sheetSnapshot;

    if (
        previousSheet?.name !== sheet.name
        || previousSheet?.description
            !== (sheet.description ?? null)
    ) {
        changes.push(
            TECHNICAL_SHEET_CHANGE_KIND.IDENTITY,
        );
    }

    const currentComposition =
        valuation.lineSnapshots.map(
            (entry) => ({
                productVariantId:
                    entry.productVariant.id,
                line:
                    valuation.lines
                        .find(
                            (line) =>
                                line._id.toString()
                                === entry.lineId,
                        ),
            }),
        ).map(({ productVariantId, line }) => ({
            kind: line.kind,
            productVariantId,
            netQuantity:
                line.netQuantity.toString(),
            inputUnit: line.inputUnit,
            order: line.order,
            note: line.note ?? null,
            optimization: {
                minNetQuantity:
                    line.optimization
                        ?.minNetQuantity
                        ?.toString?.()
                    ?? null,
                maxNetQuantity:
                    line.optimization
                        ?.maxNetQuantity
                        ?.toString?.()
                    ?? null,
                locked:
                    Boolean(
                        line.optimization?.locked,
                    ),
            },
        }));

    const previousComposition =
        (previousValidation.linesSnapshot ?? [])
            .map((line) => ({
                kind: line.kind,
                productVariantId:
                    line.productVariantId.toString(),
                netQuantity:
                    line.netQuantity.toString(),
                inputUnit: line.inputUnit,
                order: line.order,
                note: line.note ?? null,
                optimization: {
                    minNetQuantity:
                        line.optimization
                            ?.minNetQuantity
                            ?.toString?.()
                        ?? null,
                    maxNetQuantity:
                        line.optimization
                            ?.maxNetQuantity
                            ?.toString?.()
                        ?? null,
                    locked:
                        Boolean(
                            line.optimization
                                ?.locked,
                        ),
                },
            }));

    if (
        comparableJson(currentComposition)
        !== comparableJson(previousComposition)
    ) {
        changes.push(
            TECHNICAL_SHEET_CHANGE_KIND.COMPOSITION,
        );
    }

    const currentSourcing =
        valuation.lineSnapshots.map(
            (entry) => ({
                articleId:
                    entry.article?.id
                    ?? null,
                source:
                    entry.price.source,
                sourceId:
                    entry.price.id,
            }),
        );
    const previousSourcing =
        (previousValidation.linesSnapshot ?? [])
            .map((line) => ({
                articleId:
                    line.supplierArticleId
                        ?.toString()
                    ?? null,
                source:
                    line.applicableSource,
                sourceId:
                    line.applicableSourceId,
            }));

    if (
        comparableJson(currentSourcing)
        !== comparableJson(previousSourcing)
    ) {
        changes.push(
            TECHNICAL_SHEET_CHANGE_KIND.SOURCING,
        );
    }

    const previousEconomics =
        previousValidation.economicSnapshot
            ?.toObject?.()
        ?? previousValidation.economicSnapshot;
    const currentEconomics = {
        ...valuation.economicSnapshot,
        vatRateBasisPoints:
            draft.vatRateBasisPoints,
        targetMarginBasisPoints:
            draft.targetMarginBasisPoints,
        portionsPerProductionUnit:
            draft.portionsPerProductionUnit
                ?.toString() ?? null,
        saleBasis:
            draft.saleBasis,
    };

    if (
        comparableJson(currentEconomics)
        !== comparableJson({
            ...previousEconomics,
            vatRateBasisPoints:
                previousSheet
                    ?.vatRateBasisPoints,
            targetMarginBasisPoints:
                previousSheet
                    ?.targetMarginBasisPoints,
            portionsPerProductionUnit:
                previousSheet
                    ?.portionsPerProductionUnit
                    ?.toString?.()
                ?? previousSheet
                    ?.portionsPerProductionUnit
                ?? null,
            saleBasis:
                previousSheet
                    ?.saleBasis
                ?? null,
        })
    ) {
        changes.push(
            TECHNICAL_SHEET_CHANGE_KIND.ECONOMICS,
        );
    }

    return changes;
};

const buildValidationLines = ({
    valuation,
}) => {
    const snapshotByLine = new Map(
        valuation.lineSnapshots.map(
            (entry) => [entry.lineId, entry],
        ),
    );

    return valuation.lines.map((line) => {
        const source =
            snapshotByLine.get(
                line._id.toString(),
            );

        if (!source) {
            throw new AppError(
                'Snapshot de valorisation incomplet.',
                409,
            );
        }

        const indicativeSource = [
            'INDICATIVE_DOSSIER',
            'INDICATIVE_WORKSPACE',
            'INDICATIVE_GLOBAL',
        ].includes(source.price.source);

        if (
            !indicativeSource
            && !source.article?.supplierName
        ) {
            throw new AppError(
                'Le Fournisseur de l’Article est indisponible pour créer le snapshot historique.',
                409,
            );
        }

        return {
            kind: line.kind,
            productVariantId:
                source.productVariant.id,
            productVariantName:
                source.productVariant.name,
            countUnitLabelSingular:
                source.productVariant
                    .countUnitLabelSingular ?? null,
            countUnitLabelPlural:
                source.productVariant
                    .countUnitLabelPlural ?? null,
            netQuantity:
                line.netQuantity.toString(),
            inputUnit:
                line.inputUnit,
            yieldPercentUsed:
                line.calculation
                    .yieldPercentUsed
                    ?.toString()
                ?? null,
            grossQuantity:
                line.calculation
                    .grossQuantity
                    .toString(),
            grossUnit:
                line.calculation.grossUnit,
            supplierArticleId:
                source.article?.id
                ?? null,
            supplierId:
                source.article?.supplierId
                ?? null,
            supplierName:
                source.article?.supplierName
                ?? null,
            supplierReference:
                source.article?.supplierReference
                ?? null,
            supplierDesignation:
                source.article
                    ?.supplierDesignation
                ?? null,
            brand:
                source.article?.brand ?? null,
            normalizedPriceHt:
                source.price.normalizedAmount,
            normalizedUnit:
                source.price.normalizedUnit,
            applicableSource:
                source.price.source,
            applicableSourceId:
                source.price.id,
            lineCostHt:
                line.valuation.lineCostHt
                    .toString(),
            materialCostSharePercent:
                line.valuation
                    .materialCostSharePercent
                    ?.toString()
                ?? null,
            optimization: {
                minNetQuantity:
                    line.optimization
                        ?.minNetQuantity
                        ?.toString?.()
                    ?? null,
                maxNetQuantity:
                    line.optimization
                        ?.maxNetQuantity
                        ?.toString?.()
                    ?? null,
                locked:
                    Boolean(
                        line.optimization?.locked,
                    ),
            },
            order: line.order,
            note: line.note ?? null,
        };
    });
};

const validateTechnicalSheet = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
    actorId,
    expectedSheetRevision,
    expectedDraftRevision,
    comment = null,
    atDate = new Date(),
}) => {
    const result = await mongoose.connection.transaction(
        async (session) => {
        await assertOperationalDossier({
            workspaceId,
            dossierId,
            session,
        });

        const sheet =
            await TechnicalSheet.findOne(
                mongoose.trusted({
                    _id: technicalSheetId,
                    workspace: workspaceId,
                    dossier: dossierId,
                    status:
                        TECHNICAL_SHEET_STATUS.ACTIVE,
                    revision:
                        expectedSheetRevision,
                }),
            ).session(session);

        if (!sheet) {
            throw new AppError(
                'Conflit de modification de la Fiche technique.',
                409,
            );
        }

        const draft =
            await TechnicalSheetDraft.findOne(
                mongoose.trusted({
                    technicalSheet: technicalSheetId,
                    workspace: workspaceId,
                    dossier: dossierId,
                    revision:
                        expectedDraftRevision,
                }),
            ).session(session);

        if (!draft) {
            throw new AppError(
                'Conflit de modification du brouillon.',
                409,
            );
        }

        const fresh =
            await buildTechnicalSheetValuation({
                workspaceId,
                dossierId,
                draft,
                atDate,
                session,
            });

        if (
            fresh.valuationStatus
            !== TECHNICAL_SHEET_VALUATION_STATUS
                .COMPLETE
            || draft.valuationStatus
                !== TECHNICAL_SHEET_VALUATION_STATUS
                    .COMPLETE
            || !draft.valuationFingerprint
            || fresh.valuationFingerprint
                !== draft.valuationFingerprint
        ) {
            const refreshedLines =
                fresh.lines.map((line) => {
                    const persisted = { ...line };
                    delete persisted.productVariantSnapshot;
                    return persisted;
                });

            await TechnicalSheetDraft.updateOne(
                mongoose.trusted({
                    _id: draft._id,
                    revision:
                        expectedDraftRevision,
                }),
                {
                    $set: {
                        lines: refreshedLines,
                        valuationStatus:
                            fresh.valuationStatus,
                        valuedAt:
                            fresh.valuedAt,
                        valuationFingerprint:
                            fresh.valuationFingerprint,
                        economicSnapshot:
                            fresh.economicSnapshot,
                        ...(fresh.economicSnapshot
                            ? {
                                finalPriceTtcMinor:
                                    fresh.economicSnapshot
                                        .finalPriceTtcMinor,
                            }
                            : {}),
                        updatedBy: actorId,
                    },
                    $inc: { revision: 1 },
                },
                { session },
            );

            return {
                valuationRefreshed: true,
                valuationStatus:
                    fresh.valuationStatus,
            };
        }

        const previousValidation =
            sheet.currentValidatedState
                ? await TechnicalSheetValidation
                    .findOne(
                        mongoose.trusted({
                            _id:
                                sheet.currentValidatedState,
                            technicalSheet:
                                sheet._id,
                            workspace: workspaceId,
                            dossier: dossierId,
                        }),
                    )
                    .session(session)
                : null;

        const changeKinds =
            inferChangeKinds({
                previousValidation,
                sheet,
                draft,
                valuation: fresh,
            });

        const [validation] =
            await TechnicalSheetValidation.create(
                [{
                    workspace: workspaceId,
                    dossier: dossierId,
                    technicalSheet:
                        sheet._id,
                    validatedAt: atDate,
                    validatedBy: actorId,
                    comment,
                    changeKinds,
                    sheetSnapshot: {
                        name: sheet.name,
                        description:
                            sheet.description
                            ?? null,
                        productionQuantity:
                            draft.productionQuantity
                                .toString(),
                        productionUnit:
                            draft.productionUnit,
                        portionsPerProductionUnit:
                            draft.portionsPerProductionUnit
                                .toString(),
                        saleBasis:
                            draft.saleBasis,
                        vatRateBasisPoints:
                            draft.vatRateBasisPoints,
                        targetMarginBasisPoints:
                            draft.targetMarginBasisPoints,
                    },
                    linesSnapshot:
                        buildValidationLines({
                            valuation: fresh,
                        }),
                    economicSnapshot: {
                        ...fresh.economicSnapshot,
                        finalPriceMode:
                            draft.finalPriceMode,
                    },
                    valuationFingerprint:
                        fresh
                            .valuationFingerprint,
                }],
                { session },
            );

        const updatedSheet =
            await TechnicalSheet.findOneAndUpdate(
                mongoose.trusted({
                    _id: sheet._id,
                    revision:
                        expectedSheetRevision,
                    status:
                        TECHNICAL_SHEET_STATUS.ACTIVE,
                }),
                {
                    $set: {
                        currentValidatedState:
                            validation._id,
                        updatedBy: actorId,
                    },
                    $inc: { revision: 1 },
                },
                {
                    returnDocument: 'after',
                    session,
                },
            );

        if (!updatedSheet) {
            throw new AppError(
                'Conflit de validation de la Fiche technique.',
                409,
            );
        }

        await TechnicalSheetDraft.deleteOne(
            mongoose.trusted({
                _id: draft._id,
            }),
            { session },
        );

        await createTechnicalSheetEvent({
            workspaceId,
            dossierId,
            actorId,
            action:
                BUSINESS_ACTIVITY_ACTION
                    .TECHNICAL_SHEET_VALIDATED,
            technicalSheetId:
                sheet._id,
            metadata: {
                validationId:
                    validation._id.toString(),
                changeKinds,
            },
            session,
        });

        return {
            validation:
                serializeTechnicalSheetValidation(
                    validation,
                ),
            sheetRevision:
                updatedSheet.revision,
        };
        },
    );

    if (result.valuationRefreshed) {
        const error = new AppError(
            result.valuationStatus
                === TECHNICAL_SHEET_VALUATION_STATUS.COMPLETE
                ? 'Les données économiques ont changé. Les calculs ont été actualisés ; vérifiez-les puis validez à nouveau.'
                : 'La Fiche n’est pas complètement calculable avec les données disponibles. Les calculs ont été actualisés.',
            409,
        );
        error.code =
            'TECHNICAL_SHEET_VALUATION_REFRESHED';
        throw error;
    }

    return result;
};

const listTechnicalSheetHistory = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
    page = 1,
    limit = 20,
}) => {
    const sheetExists =
        await TechnicalSheet.exists(
            mongoose.trusted({
                _id: technicalSheetId,
                workspace: workspaceId,
                dossier: dossierId,
                status: mongoose.trusted({
                    $ne:
                        TECHNICAL_SHEET_STATUS.DELETED,
                }),
            }),
        );

    if (!sheetExists) {
        throw new AppError(
            'Fiche technique introuvable.',
            404,
        );
    }

    const skip = (page - 1) * limit;
    const filter = mongoose.trusted({
        workspace: workspaceId,
        dossier: dossierId,
        technicalSheet: technicalSheetId,
    });

    const [validations, total] =
        await Promise.all([
            TechnicalSheetValidation.find(filter)
                .sort({
                    validatedAt: -1,
                    _id: -1,
                })
                .skip(skip)
                .limit(limit),
            TechnicalSheetValidation
                .countDocuments(filter),
        ]);

    return {
        validations:
            validations.map(
                serializeTechnicalSheetValidation,
            ),
        pagination: {
            page,
            limit,
            total,
            totalPages:
                Math.ceil(total / limit),
        },
    };
};

const getTechnicalSheetValidation = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
    validationId,
}) => {
    const sheetExists =
        await TechnicalSheet.exists(
            mongoose.trusted({
                _id: technicalSheetId,
                workspace: workspaceId,
                dossier: dossierId,
                status: mongoose.trusted({
                    $ne:
                        TECHNICAL_SHEET_STATUS.DELETED,
                }),
            }),
        );

    if (!sheetExists) {
        throw new AppError(
            'Fiche technique introuvable.',
            404,
        );
    }

    const validation =
        await TechnicalSheetValidation.findOne(
            mongoose.trusted({
                _id: validationId,
                workspace: workspaceId,
                dossier: dossierId,
                technicalSheet: technicalSheetId,
            }),
        );

    if (!validation) {
        throw new AppError(
            'Version validée introuvable.',
            404,
        );
    }

    return serializeTechnicalSheetValidation(
        validation,
    );
};

export {
    getTechnicalSheetValidation,
    listTechnicalSheetHistory,
    validateTechnicalSheet,
};
