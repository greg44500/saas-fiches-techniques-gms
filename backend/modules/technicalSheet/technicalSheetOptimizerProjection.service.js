import mongoose from 'mongoose';

import {
    TECHNICAL_SHEET_LINE_KIND,
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
    assertOperationalDossier,
} from './technicalSheet.service.js';
import {
    buildTechnicalSheetValuation,
} from './technicalSheetValuation.service.js';
import {
    assertOptimizationEnvelope,
    assertQuantityWithinEnvelope,
    compareFractions,
} from './technicalSheetOptimizerMath.service.js';
import {
    decimalFraction,
} from './technicalSheetMath.service.js';
import { AppError } from '../../utils/appError.js';

const toId = (value) =>
    value?._id?.toString?.()
    ?? value?.toString?.()
    ?? null;

const loadOptimizerDraft = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
    expectedRevision = null,
    session = null,
}) => {
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
            }),
        ).session(session);

    if (!sheet) {
        throw new AppError(
            'Fiche technique indisponible pour l’optimisation.',
            409,
        );
    }

    const filter = {
        technicalSheet: technicalSheetId,
        workspace: workspaceId,
        dossier: dossierId,
    };

    if (expectedRevision !== null) {
        filter.revision = expectedRevision;
    }

    const draft =
        await TechnicalSheetDraft.findOne(
            mongoose.trusted(filter),
        ).session(session);

    if (draft) {
        return { sheet, draft };
    }

    const draftExists =
        expectedRevision === null
            ? false
            : await TechnicalSheetDraft.exists(
                mongoose.trusted({
                    technicalSheet:
                        technicalSheetId,
                    workspace: workspaceId,
                    dossier: dossierId,
                }),
            ).session(session);

    const error = new AppError(
        draftExists
            ? 'La simulation n’est plus synchronisée avec le brouillon courant.'
            : 'Créez ou reprenez un brouillon avant d’ouvrir l’Atelier d’optimisation.',
        409,
    );
    error.code =
        draftExists
            ? 'TECHNICAL_SHEET_OPTIMIZER_REVISION_CONFLICT'
            : 'TECHNICAL_SHEET_OPTIMIZER_DRAFT_REQUIRED';
    throw error;
};

const requireCompleteValuation = (
    valuation,
    label,
) => {
    if (
        valuation.valuationStatus
            !== TECHNICAL_SHEET_VALUATION_STATUS
                .COMPLETE
        || !valuation.economicSnapshot
        || !valuation.valuationFingerprint
    ) {
        const error = new AppError(
            label
            + ' ne peut pas être complètement valorisée avec les données actuellement disponibles.',
            409,
        );
        error.code =
            'TECHNICAL_SHEET_OPTIMIZER_VALUATION_INCOMPLETE';
        throw error;
    }

    return valuation;
};

const buildFreshValuation = async ({
    workspaceId,
    dossierId,
    draft,
    atDate,
    session,
    label = 'La Fiche technique',
}) => requireCompleteValuation(
    await buildTechnicalSheetValuation({
        workspaceId,
        dossierId,
        draft,
        atDate,
        session,
    }),
    label,
);

const lineSnapshotById = (
    valuation,
) => new Map(
    valuation.lineSnapshots
        .map((entry) => [
            entry.lineId,
            entry,
        ]),
);

const projectValuation = ({
    draft,
    valuation,
}) => {
    const snapshotMap =
        lineSnapshotById(
            valuation,
        );

    return {
        draftRevision:
            draft.revision,
        valuationFingerprint:
            valuation.valuationFingerprint,
        economicSnapshot:
            valuation.economicSnapshot,
        lines:
            valuation.lines.map(
                (line) => {
                    const id =
                        line._id.toString();
                    const source =
                        snapshotMap.get(id);

                    return {
                        id,
                        kind:
                            line.kind,
                        productVariantId:
                            toId(
                                line.productVariant,
                            ),
                        productVariantName:
                            source
                                ?.productVariant
                                ?.name
                            ?? null,
                        referenceUnit:
                            source
                                ?.productVariant
                                ?.referenceUnit
                            ?? line.inputUnit,
                        netQuantity:
                            line.netQuantity
                                .toString(),
                        grossQuantity:
                            line.calculation
                                ?.grossQuantity
                                ?.toString?.()
                            ?? null,
                        yieldPercentUsed:
                            line.calculation
                                ?.yieldPercentUsed
                                ?.toString?.()
                            ?? null,
                        selectedSupplierArticleId:
                            toId(
                                line.selectedSupplierArticle,
                            ),
                        supplierArticleId:
                            line.valuation
                                ?.supplierArticleId
                                ?.toString?.()
                            ?? null,
                        supplierName:
                            source
                                ?.article
                                ?.supplierName
                            ?? null,
                        applicableSource:
                            line.valuation
                                ?.applicableSource
                            ?? null,
                        normalizedAmount:
                            line.valuation
                                ?.normalizedAmount
                                ?.toString?.()
                            ?? null,
                        normalizedUnit:
                            line.valuation
                                ?.normalizedUnit
                            ?? null,
                        lineCostHt:
                            line.valuation
                                ?.lineCostHt
                                ?.toString?.()
                            ?? null,
                        materialCostSharePercent:
                            line.valuation
                                ?.materialCostSharePercent
                                ?.toString?.()
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
                                    line.optimization
                                        ?.locked,
                                ),
                        },
                    };
                },
            ),
    };
};

const defaultLineIntent = (
    line,
) => ({
    lineId:
        line._id.toString(),
    economicAdjustmentPercent: 0,
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
    localNetQuantity: null,
    productVariantId: null,
    supplierArticleId: null,
});

const normalizeLineIntents = ({
    draft,
    requestLines,
}) => {
    const requested =
        new Map(
            requestLines.map(
                (line) => [
                    line.lineId,
                    line,
                ],
            ),
        );

    for (const lineId of requested.keys()) {
        if (
            !draft.lines.id(
                lineId,
            )
        ) {
            throw new AppError(
                'Une ligne de simulation n’existe plus dans le brouillon.',
                409,
            );
        }
    }

    return draft.lines
        .filter(
            (line) =>
                line.kind
                === TECHNICAL_SHEET_LINE_KIND
                    .INGREDIENT,
        )
        .map((line) => {
            const fallback =
                defaultLineIntent(line);
            const input =
                requested.get(
                    fallback.lineId,
                );

            const normalized =
                input
                    ? {
                        ...fallback,
                        ...input,
                        economicAdjustmentPercent:
                            input.economicAdjustmentPercent
                            ?? 0,
                        localNetQuantity:
                            input.localNetQuantity
                            ?? null,
                        productVariantId:
                            input.productVariantId
                            ?? null,
                        supplierArticleId:
                            input.supplierArticleId
                            ?? null,
                        supplierArticleExplicit:
                            Object.hasOwn(
                                input,
                                'supplierArticleId',
                            ),
                    }
                    : {
                        ...fallback,
                        supplierArticleExplicit:
                            false,
                    };

            if (
                !normalized.locked
                && normalized.minNetQuantity
                && normalized.maxNetQuantity
            ) {
                const reference =
                    decimalFraction(
                        line.netQuantity
                            .toString(),
                    );
                const minimum =
                    decimalFraction(
                        normalized
                            .minNetQuantity,
                    );
                const maximum =
                    decimalFraction(
                        normalized
                            .maxNetQuantity,
                    );

                if (
                    compareFractions(
                        minimum,
                        reference,
                    ) === 0
                    && compareFractions(
                        maximum,
                        reference,
                    ) === 0
                ) {
                    normalized.minNetQuantity =
                        null;
                    normalized.maxNetQuantity =
                        null;
                }
            }

            return normalized;
        });
};

const assertLineIntent = ({
    draftLine,
    intent,
}) => {
    const referenceQuantity =
        draftLine.netQuantity
            .toString();

    assertOptimizationEnvelope({
        referenceQuantity,
        minNetQuantity:
            intent.minNetQuantity,
        maxNetQuantity:
            intent.maxNetQuantity,
    });

    if (
        intent.locked
        && intent.localNetQuantity
        && compareFractions(
            decimalFraction(
                intent.localNetQuantity,
            ),
            decimalFraction(
                referenceQuantity,
            ),
        ) !== 0
    ) {
        throw new AppError(
            'Une ligne verrouillée ne peut pas recevoir une autre quantité.',
            400,
        );
    }

    if (
        intent.localNetQuantity
    ) {
        assertQuantityWithinEnvelope({
            quantity:
                intent.localNetQuantity,
            referenceQuantity,
            minNetQuantity:
                intent.minNetQuantity,
            maxNetQuantity:
                intent.maxNetQuantity,
        });
    }
};

export {
    assertLineIntent,
    buildFreshValuation,
    loadOptimizerDraft,
    normalizeLineIntents,
    projectValuation,
    toId,
};
