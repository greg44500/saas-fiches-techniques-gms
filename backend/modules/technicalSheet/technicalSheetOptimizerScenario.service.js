import {
    TECHNICAL_SHEET_LINE_KIND,
} from './technicalSheet.registry.js';
import {
    TECHNICAL_SHEET_OPTIMIZATION_MODE,
} from './technicalSheetOptimizer.registry.js';
import {
    applyEconomicAdjustmentToQuantity,
    assertQuantityWithinEnvelope,
} from './technicalSheetOptimizerMath.service.js';
import {
    assertProductAlternative,
} from './technicalSheetOptimizerAlternative.service.js';
import {
    assertLineIntent,
    buildFreshValuation,
    toId,
} from './technicalSheetOptimizerProjection.service.js';
import {
    stableFingerprint,
} from './technicalSheetValuation.service.js';
import { AppError } from '../../utils/appError.js';

const buildManualScenarioLines = async ({
    workspaceId,
    draft,
    intents,
    canManageSourcing,
    session,
}) => {
    const intentsById =
        new Map(
            intents.map(
                (intent) => [
                    intent.lineId,
                    intent,
                ],
            ),
        );

    const lines = [];

    for (const draftLine of draft.lines) {
        const lineId =
            draftLine._id.toString();
        const intent =
            intentsById.get(
                lineId,
            );

        if (
            draftLine.kind
            !== TECHNICAL_SHEET_LINE_KIND
                .INGREDIENT
            || !intent
        ) {
            lines.push({
                id: lineId,
                kind:
                    draftLine.kind,
                productVariantId:
                    toId(
                        draftLine.productVariant,
                    ),
                netQuantity:
                    draftLine.netQuantity
                        .toString(),
                inputUnit:
                    draftLine.inputUnit,
                order:
                    draftLine.order,
                note:
                    draftLine.note
                    ?? null,
                selectedSupplierArticleId:
                    toId(
                        draftLine
                            .selectedSupplierArticle,
                    ),
                optimization:
                    draftLine.optimization
                        ?.toObject?.()
                    ?? draftLine.optimization
                    ?? undefined,
            });
            continue;
        }

        assertLineIntent({
            draftLine,
            intent,
        });

        const currentVariantId =
            toId(
                draftLine.productVariant,
            );
        const productVariantId =
            intent.productVariantId
            ?? currentVariantId;
        const productChanged =
            productVariantId
            !== currentVariantId;

        if (productChanged) {
            await assertProductAlternative({
                workspaceId,
                currentProductVariantId:
                    currentVariantId,
                candidateProductVariantId:
                    productVariantId,
                session,
            });
        }

        let netQuantity =
            draftLine.netQuantity
                .toString();

        if (!intent.locked) {
            netQuantity =
                applyEconomicAdjustmentToQuantity({
                    referenceQuantity:
                        draftLine
                            .netQuantity
                            .toString(),
                    minNetQuantity:
                        intent
                            .minNetQuantity,
                    maxNetQuantity:
                        intent
                            .maxNetQuantity,
                    economicAdjustmentPercent:
                        intent
                            .economicAdjustmentPercent,
                });

            if (
                intent.localNetQuantity
            ) {
                netQuantity =
                    assertQuantityWithinEnvelope({
                        quantity:
                            intent.localNetQuantity,
                        referenceQuantity:
                            draftLine
                                .netQuantity
                                .toString(),
                        minNetQuantity:
                            intent
                                .minNetQuantity,
                        maxNetQuantity:
                            intent
                                .maxNetQuantity,
                    });
            }
        }

        const currentSupplierArticleId =
            toId(
                draftLine
                    .selectedSupplierArticle,
            );
        let selectedSupplierArticleId =
            productChanged
                ? null
                : currentSupplierArticleId;

        if (
            intent.supplierArticleExplicit
        ) {
            selectedSupplierArticleId =
                intent.supplierArticleId
                ?? null;
        }

        const sourcingChanged =
            intent.supplierArticleExplicit
            && selectedSupplierArticleId
                !== currentSupplierArticleId;

        if (
            sourcingChanged
            && !canManageSourcing
        ) {
            throw new AppError(
                'Permission de gestion de l’approvisionnement requise pour modifier l’Article fournisseur.',
                403,
            );
        }

        lines.push({
            id: lineId,
            kind:
                draftLine.kind,
            productVariantId,
            netQuantity,
            inputUnit:
                draftLine.inputUnit,
            order:
                draftLine.order,
            note:
                draftLine.note
                ?? null,
            selectedSupplierArticleId,
            optimization: {
                minNetQuantity:
                    intent.minNetQuantity
                    ?? null,
                maxNetQuantity:
                    intent.maxNetQuantity
                    ?? null,
                locked:
                    intent.locked,
            },
        });
    }

    return lines;
};

const buildScenarioDraft = ({
    draft,
    lines,
}) => ({
    _id: draft._id,
    technicalSheet:
        draft.technicalSheet,
    workspace:
        draft.workspace,
    dossier:
        draft.dossier,
    revision:
        draft.revision,
    productionQuantity:
        draft.productionQuantity,
    productionUnit:
        draft.productionUnit,
    portionsPerProductionUnit:
        draft.portionsPerProductionUnit,
    saleBasis:
        draft.saleBasis,
    vatRateBasisPoints:
        draft.vatRateBasisPoints,
    targetMarginBasisPoints:
        draft.targetMarginBasisPoints,
    finalPriceTtcMinor:
        draft.finalPriceTtcMinor,
    finalPriceMode:
        draft.finalPriceMode,
    lines,
});

const buildTransformations = ({
    draft,
    scenario,
}) => {
    const scenarioById =
        new Map(
            scenario.lines.map(
                (line) => [
                    line._id.toString(),
                    line,
                ],
            ),
        );
    const transformations = [];

    for (const line of draft.lines) {
        const lineId =
            line._id.toString();
        const after =
            scenarioById.get(
                lineId,
            );

        if (!after) continue;

        if (
            line.netQuantity.toString()
            !== after.netQuantity.toString()
        ) {
            transformations.push({
                lineId,
                kind: 'QUANTITY',
                before:
                    line.netQuantity
                        .toString(),
                after:
                    after.netQuantity
                        .toString(),
            });
        }

        const beforeVariant =
            toId(line.productVariant);
        const afterVariant =
            toId(after.productVariant);

        if (
            beforeVariant
            !== afterVariant
        ) {
            transformations.push({
                lineId,
                kind: 'PRODUCT',
                before:
                    beforeVariant,
                after:
                    afterVariant,
            });
        }

        const beforeArticle =
            toId(
                line.selectedSupplierArticle,
            );
        const afterArticle =
            toId(
                after.selectedSupplierArticle,
            );

        if (
            beforeArticle
            !== afterArticle
        ) {
            transformations.push({
                lineId,
                kind: 'SOURCING',
                before:
                    beforeArticle,
                after:
                    afterArticle,
            });
        }

        const beforeEnvelope = {
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
        };
        const afterEnvelope = {
            minNetQuantity:
                after.optimization
                    ?.minNetQuantity
                    ?.toString?.()
                ?? null,
            maxNetQuantity:
                after.optimization
                    ?.maxNetQuantity
                    ?.toString?.()
                ?? null,
            locked:
                Boolean(
                    after.optimization
                        ?.locked,
                ),
        };

        if (
            JSON.stringify(
                beforeEnvelope,
            )
            !== JSON.stringify(
                afterEnvelope,
            )
        ) {
            transformations.push({
                lineId,
                kind: 'ENVELOPE',
                before:
                    beforeEnvelope,
                after:
                    afterEnvelope,
            });
        }
    }

    return transformations;
};

const normalizeFingerprintRequest = ({
    mode,
    intents,
    autoOptions,
}) => ({
    mode,
    lines: intents
        .map((intent) => ({
            lineId:
                intent.lineId,
            economicAdjustmentPercent:
                intent.economicAdjustmentPercent
                ?? 0,
            minNetQuantity:
                intent.minNetQuantity,
            maxNetQuantity:
                intent.maxNetQuantity,
            locked:
                intent.locked,
            localNetQuantity:
                intent.localNetQuantity
                ?? null,
            productVariantId:
                intent.productVariantId
                ?? null,
            supplierArticleId:
                intent.supplierArticleId
                ?? null,
            supplierArticleExplicit:
                Boolean(
                    intent.supplierArticleExplicit,
                ),
        }))
        .sort(
            (left, right) =>
                left.lineId.localeCompare(
                    right.lineId,
                ),
        ),
    autoOptions: {
        ...autoOptions,
    },
});

const buildFingerprint = ({
    draft,
    baseline,
    scenario,
    normalizedRequest,
}) => stableFingerprint({
    draftRevision:
        draft.revision,
    baselineValuationFingerprint:
        baseline
            .valuationFingerprint,
    request:
        normalizedRequest,
    scenarioValuationFingerprint:
        scenario
            .valuationFingerprint,
    resolvedLines:
        scenario.lines.map(
            (line) => ({
                id:
                    line._id.toString(),
                productVariantId:
                    toId(
                        line.productVariant,
                    ),
                netQuantity:
                    line.netQuantity
                        .toString(),
                selectedSupplierArticleId:
                    toId(
                        line.selectedSupplierArticle,
                    ),
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
            }),
        ),
});

const manualSimulation = async ({
    workspaceId,
    dossierId,
    draft,
    baseline,
    request,
    intents,
    canManageSourcing,
    atDate,
    session,
}) => {
    const lines =
        await buildManualScenarioLines({
            workspaceId,
            draft,
            intents,
            canManageSourcing,
            session,
        });
    const scenarioDraft =
        buildScenarioDraft({
            draft,
            lines,
        });
    const scenario =
        await buildFreshValuation({
            workspaceId,
            dossierId,
            draft:
                scenarioDraft,
            atDate,
            session,
            label:
                'Le scénario simulé',
        });
    const normalizedRequest =
        normalizeFingerprintRequest({
            mode:
                TECHNICAL_SHEET_OPTIMIZATION_MODE
                    .MANUAL,
            intents,
            autoOptions:
                request.autoOptions,
        });

    return {
        scenario,
        normalizedRequest,
        fingerprint:
            buildFingerprint({
                draft,
                baseline,
                scenario,
                normalizedRequest,
            }),
    };
};

export {
    buildFingerprint,
    buildManualScenarioLines,
    buildScenarioDraft,
    buildTransformations,
    manualSimulation,
    normalizeFingerprintRequest,
};
