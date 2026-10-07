import {
    TECHNICAL_SHEET_LINE_KIND,
} from './technicalSheet.registry.js';
import {
    TECHNICAL_SHEET_OPTIMIZATION_MODE,
} from './technicalSheetOptimizer.registry.js';
import {
    buildQuarterStepTowardMinimum,
    compareFractions,
    isPositiveSaving,
} from './technicalSheetOptimizerMath.service.js';
import {
    listProductAlternatives,
    listSupplierAlternatives,
} from './technicalSheetOptimizerAlternative.service.js';
import {
    assertLineIntent,
    buildFreshValuation,
} from './technicalSheetOptimizerProjection.service.js';
import {
    buildFingerprint,
    buildManualScenarioLines,
    buildScenarioDraft,
    normalizeFingerprintRequest,
} from './technicalSheetOptimizerScenario.service.js';
import {
    decimalFraction,
    subtractFractions,
} from './technicalSheetMath.service.js';

const MAX_AUTO_CANDIDATES = 60;

const createAutoIntent = ({
    intents,
    lineId,
    changes,
}) => intents.map(
    (intent) =>
        intent.lineId === lineId
            ? {
                ...intent,
                economicAdjustmentPercent: 0,
                localNetQuantity:
                    null,
                productVariantId:
                    null,
                supplierArticleId:
                    null,
                supplierArticleExplicit:
                    false,
                ...changes,
            }
            : {
                ...intent,
                economicAdjustmentPercent: 0,
                localNetQuantity:
                    null,
                productVariantId:
                    null,
                supplierArticleId:
                    null,
                supplierArticleExplicit:
                    false,
            },
);

const lineDeformation = ({
    referenceQuantity,
    scenarioQuantity,
}) => {
    const reference =
        decimalFraction(
            referenceQuantity,
        );
    const scenario =
        decimalFraction(
            scenarioQuantity,
        );
    const delta =
        subtractFractions(
            scenario,
            reference,
        );
    const absolute = {
        numerator:
            delta.numerator < 0n
                ? -delta.numerator
                : delta.numerator,
        denominator:
            delta.denominator,
    };

    if (
        reference.numerator === 0n
    ) {
        return {
            numerator: 0n,
            denominator: 1n,
        };
    }

    return {
        numerator:
            absolute.numerator
            * reference.denominator,
        denominator:
            absolute.denominator
            * reference.numerator,
    };
};

const autoSimulation = async ({
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
    const candidates = [];

    for (const line of draft.lines) {
        if (
            line.kind
            !== TECHNICAL_SHEET_LINE_KIND
                .INGREDIENT
        ) {
            continue;
        }

        const lineId =
            line._id.toString();
        const intent =
            intents.find(
                (entry) =>
                    entry.lineId
                    === lineId,
            );

        if (!intent) continue;

        assertLineIntent({
            draftLine: line,
            intent,
        });

        if (
            request.autoOptions
                .adjustQuantities
            && !intent.locked
        ) {
            const nextQuantity =
                buildQuarterStepTowardMinimum({
                    referenceQuantity:
                        line.netQuantity
                            .toString(),
                    minNetQuantity:
                        intent.minNetQuantity,
                });

            if (nextQuantity) {
                if (
                    candidates.length
                    >= MAX_AUTO_CANDIDATES
                ) {
                    break;
                }

                candidates.push({
                    lineId,
                    kind: 'QUANTITY',
                    intents:
                        createAutoIntent({
                            intents,
                            lineId,
                            changes: {
                                localNetQuantity:
                                    nextQuantity,
                            },
                        }),
                });
            }
        }

        if (
            request.autoOptions
                .productAlternatives
        ) {
            const alternatives =
                await listProductAlternatives({
                    workspaceId,
                    dossierId,
                    productVariantId:
                        line.productVariant,
                    atDate,
                    session,
                });

            for (
                const alternative
                of alternatives
            ) {
                if (
                    candidates.length
                    >= MAX_AUTO_CANDIDATES
                ) {
                    break;
                }

                candidates.push({
                    lineId,
                    kind: 'PRODUCT',
                    label:
                        alternative.name,
                    intents:
                        createAutoIntent({
                            intents,
                            lineId,
                            changes: {
                                productVariantId:
                                    alternative.id,
                            },
                        }),
                });
            }
        }

        if (
            request.autoOptions
                .sourcingAlternatives
            && canManageSourcing
        ) {
            const alternatives =
                await listSupplierAlternatives({
                    workspaceId,
                    dossierId,
                    productVariantId:
                        line.productVariant,
                    selectedSupplierArticleId:
                        line.selectedSupplierArticle,
                    atDate,
                    session,
                });

            for (
                const alternative
                of alternatives
            ) {
                if (
                    candidates.length
                    >= MAX_AUTO_CANDIDATES
                ) {
                    break;
                }

                candidates.push({
                    lineId,
                    kind: 'SOURCING',
                    label:
                        alternative
                            .supplierName,
                    intents:
                        createAutoIntent({
                            intents,
                            lineId,
                            changes: {
                                supplierArticleId:
                                    alternative.id,
                                supplierArticleExplicit:
                                    true,
                            },
                        }),
                });
            }
        }
    }

    const evaluated = [];

    for (const candidate of candidates) {
        try {
            const lines =
                await buildManualScenarioLines({
                    workspaceId,
                    draft,
                    intents:
                        candidate.intents,
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
                        'Le scénario automatique',
                });

            if (
                !isPositiveSaving({
                    beforeManufacturingCostHt:
                        baseline
                            .economicSnapshot
                            .manufacturingCostHt,
                    afterManufacturingCostHt:
                        scenario
                            .economicSnapshot
                            .manufacturingCostHt,
                })
            ) {
                continue;
            }

            const scenarioLine =
                scenario.lines.find(
                    (entry) =>
                        entry._id.toString()
                        === candidate.lineId,
                );
            const draftLine =
                draft.lines.id(
                    candidate.lineId,
                );

            evaluated.push({
                ...candidate,
                scenario,
                deformation:
                    candidate.kind
                    === 'QUANTITY'
                        ? lineDeformation({
                            referenceQuantity:
                                draftLine
                                    .netQuantity
                                    .toString(),
                            scenarioQuantity:
                                scenarioLine
                                    .netQuantity
                                    .toString(),
                        })
                        : candidate.kind
                            === 'PRODUCT'
                            ? {
                                numerator: 1n,
                                denominator: 1n,
                            }
                            : {
                                numerator: 0n,
                                denominator: 1n,
                            },
            });
        } catch (error) {
            if (
                [
                    404,
                    409,
                ].includes(
                    error.statusCode,
                )
            ) {
                continue;
            }

            throw error;
        }
    }

    evaluated.sort(
        (left, right) => {
            const leftCost =
                decimalFraction(
                    left.scenario
                        .economicSnapshot
                        .manufacturingCostHt,
                );
            const rightCost =
                decimalFraction(
                    right.scenario
                        .economicSnapshot
                        .manufacturingCostHt,
                );
            const costOrder =
                compareFractions(
                    leftCost,
                    rightCost,
                );

            if (costOrder !== 0) {
                return costOrder;
            }

            const deformationOrder =
                compareFractions(
                    left.deformation,
                    right.deformation,
                );

            if (
                deformationOrder !== 0
            ) {
                return deformationOrder;
            }

            return (
                left.kind.localeCompare(
                    right.kind,
                )
                || left.lineId.localeCompare(
                    right.lineId,
                )
                || (
                    left.label
                    ?? ''
                ).localeCompare(
                    right.label
                    ?? '',
                    'fr',
                )
            );
        },
    );

    const best =
        evaluated[0]
        ?? null;

    const scenario =
        best?.scenario
        ?? baseline;
    const resolvedIntents =
        best?.intents
        ?? intents.map(
            (intent) => ({
                ...intent,
                economicAdjustmentPercent: 0,
                localNetQuantity:
                    null,
                productVariantId:
                    null,
                supplierArticleId:
                    null,
                supplierArticleExplicit:
                    false,
            }),
        );
    const normalizedRequest =
        normalizeFingerprintRequest({
            mode:
                TECHNICAL_SHEET_OPTIMIZATION_MODE
                    .AUTO,
            intents:
                resolvedIntents,
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
        autoSuggestion:
            best
                ? {
                    lineId:
                        best.lineId,
                    kind:
                        best.kind,
                    label:
                        best.label
                        ?? null,
                    resolvedIntents:
                        resolvedIntents.map(
                            ({
                                supplierArticleExplicit,
                                ...intent
                            }) => intent,
                        ),
                }
                : null,
    };
};

export {
    autoSimulation,
};
