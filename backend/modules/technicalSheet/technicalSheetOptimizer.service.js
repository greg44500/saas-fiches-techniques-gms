import mongoose from 'mongoose';

import {
    BUSINESS_ACTIVITY_ACTION,
} from '../businessActivity/businessActivity.registry.js';
import {
    resolveApplicablePrice,
} from '../supplierCatalog/supplierPricing.service.js';
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
    createTechnicalSheetEvent,
} from './technicalSheetEvent.service.js';
import {
    serializeTechnicalSheetDraft,
} from './technicalSheet.serializer.js';
import {
    assertOperationalDossier,
} from './technicalSheet.service.js';
import {
    buildTechnicalSheetValuation,
    stableFingerprint,
} from './technicalSheetValuation.service.js';
import {
    TECHNICAL_SHEET_OPTIMIZATION_CURVE_POINTS,
    TECHNICAL_SHEET_OPTIMIZATION_MODE,
    TECHNICAL_SHEET_OPTIMIZATION_NEUTRAL_CURVE,
} from './technicalSheetOptimizer.registry.js';
import {
    applyCurveToQuantity,
    assertOptimizationEnvelope,
    assertQuantityWithinEnvelope,
    buildQuarterStepTowardMinimum,
    calculateSavings,
    compareFractions,
    isPositiveSaving,
} from './technicalSheetOptimizerMath.service.js';
import {
    assertProductAlternative,
    listProductAlternatives,
    listSupplierAlternatives,
} from './technicalSheetOptimizerAlternative.service.js';
import {
    decimalFraction,
    subtractFractions,
} from './technicalSheetMath.service.js';
import { AppError } from '../../utils/appError.js';

const toId = (value) =>
    value?._id?.toString?.()
    ?? value?.toString?.()
    ?? null;

const cloneCurve = (curve) => ({
    enabled: Boolean(curve.enabled),
    pressures:
        Object.fromEntries(
            TECHNICAL_SHEET_OPTIMIZATION_CURVE_POINTS
                .map(({ key }) => [
                    key,
                    curve.pressures[key],
                ]),
        ),
});

const neutralCurve = () => ({
    enabled:
        TECHNICAL_SHEET_OPTIMIZATION_NEUTRAL_CURVE
            .enabled,
    pressures: {
        ...TECHNICAL_SHEET_OPTIMIZATION_NEUTRAL_CURVE
            .pressures,
    },
});

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
) => {
    const reference =
        line.netQuantity.toString();

    return {
        lineId:
            line._id.toString(),
        minNetQuantity:
            line.optimization
                ?.minNetQuantity
                ?.toString?.()
            ?? reference,
        maxNetQuantity:
            line.optimization
                ?.maxNetQuantity
                ?.toString?.()
            ?? reference,
        locked:
            Boolean(
                line.optimization
                    ?.locked,
            ),
        localNetQuantity: null,
        productVariantId: null,
        supplierArticleId: null,
    };
};

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

            if (!input) {
                return fallback;
            }

            return {
                ...fallback,
                ...input,
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
            };
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

const buildManualScenarioLines = async ({
    workspaceId,
    draft,
    baseline,
    curve,
    intents,
    canManageSourcing,
    session,
}) => {
    const baselineById =
        new Map(
            baseline.lines.map(
                (line) => [
                    line._id.toString(),
                    line,
                ],
            ),
        );
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
        const baselineLine =
            baselineById.get(
                lineId,
            );
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
                applyCurveToQuantity({
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
                    materialCostSharePercent:
                        baselineLine
                            ?.valuation
                            ?.materialCostSharePercent
                            ?.toString?.()
                        ?? '0',
                    curve,
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

        const sourcingRequested =
            intent.supplierArticleExplicit
            && intent.supplierArticleId;

        if (
            sourcingRequested
            && !canManageSourcing
        ) {
            throw new AppError(
                'Permission de gestion de l’approvisionnement requise pour sélectionner un autre Article fournisseur.',
                403,
            );
        }

        let selectedSupplierArticleId =
            productChanged
                ? null
                : toId(
                    draftLine
                        .selectedSupplierArticle,
                );

        if (
            intent.supplierArticleExplicit
        ) {
            selectedSupplierArticleId =
                intent.supplierArticleId
                ?? null;
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
                    intent.minNetQuantity,
                maxNetQuantity:
                    intent.maxNetQuantity,
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
                ?? line.netQuantity
                    .toString(),
            maxNetQuantity:
                line.optimization
                    ?.maxNetQuantity
                    ?.toString?.()
                ?? line.netQuantity
                    .toString(),
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
                ?? after.netQuantity
                    .toString(),
            maxNetQuantity:
                after.optimization
                    ?.maxNetQuantity
                    ?.toString?.()
                ?? after.netQuantity
                    .toString(),
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
    curve,
    intents,
    autoOptions,
}) => ({
    mode,
    curve: cloneCurve(curve),
    lines: intents
        .map((intent) => ({
            lineId:
                intent.lineId,
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
            baseline,
            curve:
                request.curve,
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
            curve:
                request.curve,
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

const createAutoIntent = ({
    intents,
    lineId,
    changes,
}) => intents.map(
    (intent) =>
        intent.lineId === lineId
            ? {
                ...intent,
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
    const baseCurve =
        neutralCurve();

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
                    baseline,
                    curve:
                        baseCurve,
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
            curve:
                baseCurve,
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

const buildSimulation = async ({
    workspaceId,
    dossierId,
    draft,
    request,
    canManageSourcing,
    atDate = new Date(),
    session = null,
}) => {
    const baseline =
        await buildFreshValuation({
            workspaceId,
            dossierId,
            draft,
            atDate,
            session,
            label:
                'La Fiche technique',
        });
    const intents =
        normalizeLineIntents({
            draft,
            requestLines:
                request.lines,
        });

    const resolved =
        request.mode
        === TECHNICAL_SHEET_OPTIMIZATION_MODE.AUTO
            ? await autoSimulation({
                workspaceId,
                dossierId,
                draft,
                baseline,
                request,
                intents,
                canManageSourcing,
                atDate,
                session,
            })
            : await manualSimulation({
                workspaceId,
                dossierId,
                draft,
                baseline,
                request,
                intents,
                canManageSourcing,
                atDate,
                session,
            });

    const before =
        projectValuation({
            draft,
            valuation:
                baseline,
        });
    const after =
        projectValuation({
            draft,
            valuation:
                resolved.scenario,
        });
    const savings =
        calculateSavings({
            beforeManufacturingCostHt:
                baseline
                    .economicSnapshot
                    .manufacturingCostHt,
            afterManufacturingCostHt:
                resolved
                    .scenario
                    .economicSnapshot
                    .manufacturingCostHt,
        });

    return {
        draftRevision:
            draft.revision,
        mode:
            request.mode,
        before,
        after,
        savings,
        transformations:
            buildTransformations({
                draft,
                scenario:
                    resolved.scenario,
            }),
        simulationFingerprint:
            resolved.fingerprint,
        autoSuggestion:
            resolved.autoSuggestion
            ?? null,
        resolvedScenario:
            resolved.scenario,
    };
};

const getTechnicalSheetOptimizationContext = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
    canManageSourcing = false,
    atDate = new Date(),
}) => {
    const {
        sheet,
        draft,
    } = await loadOptimizerDraft({
        workspaceId,
        dossierId,
        technicalSheetId,
    });
    const baseline =
        await buildFreshValuation({
            workspaceId,
            dossierId,
            draft,
            atDate,
            session: null,
        });
    const baselineProjection =
        projectValuation({
            draft,
            valuation:
                baseline,
        });
    const alternatives = {};

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

        alternatives[lineId] = {
            products:
                await listProductAlternatives({
                    workspaceId,
                    dossierId,
                    productVariantId:
                        line.productVariant,
                    atDate,
                }),
            suppliers:
                canManageSourcing
                    ? await listSupplierAlternatives({
                        workspaceId,
                        dossierId,
                        productVariantId:
                            line.productVariant,
                        selectedSupplierArticleId:
                            line.selectedSupplierArticle,
                        atDate,
                    })
                    : [],
        };
    }

    return {
        sheet: {
            id:
                sheet._id.toString(),
            name:
                sheet.name,
            revision:
                sheet.revision,
        },
        draft:
            serializeTechnicalSheetDraft(
                await draft.populate({
                    path:
                        'lines.productVariant',
                    select:
                        '_id name referenceUnit countUnitLabelSingular countUnitLabelPlural yieldPercent status',
                }),
            ),
        baseline:
            baselineProjection,
        curvePoints:
            TECHNICAL_SHEET_OPTIMIZATION_CURVE_POINTS,
        neutralCurve:
            neutralCurve(),
        alternatives,
        canManageSourcing,
    };
};

const simulateTechnicalSheetOptimization = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
    request,
    canManageSourcing = false,
    atDate = new Date(),
}) => {
    const { draft } =
        await loadOptimizerDraft({
            workspaceId,
            dossierId,
            technicalSheetId,
            expectedRevision:
                request.expectedRevision,
        });

    const simulation =
        await buildSimulation({
            workspaceId,
            dossierId,
            draft,
            request,
            canManageSourcing,
            atDate,
        });

    const {
        resolvedScenario,
        ...result
    } = simulation;

    return result;
};

const applyTechnicalSheetOptimization = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
    actorId,
    request,
    canManageSourcing = false,
    atDate = new Date(),
}) => mongoose.connection.transaction(
    async (session) => {
        const { draft } =
            await loadOptimizerDraft({
                workspaceId,
                dossierId,
                technicalSheetId,
                expectedRevision:
                    request.expectedRevision,
                session,
            });
        const simulation =
            await buildSimulation({
                workspaceId,
                dossierId,
                draft,
                request,
                canManageSourcing,
                atDate,
                session,
            });

        if (
            simulation
                .simulationFingerprint
            !== request
                .simulationFingerprint
        ) {
            const error = new AppError(
                'La simulation est devenue obsolète. Actualisez l’Atelier avant de l’appliquer.',
                409,
            );
            error.code =
                'TECHNICAL_SHEET_OPTIMIZER_SIMULATION_STALE';
            throw error;
        }

        const valuation =
            simulation
                .resolvedScenario;
        const persistedLines =
            valuation.lines.map(
                (line) => {
                    const persisted = {
                        ...line,
                    };
                    delete persisted
                        .productVariantSnapshot;
                    return persisted;
                },
            );

        const updated =
            await TechnicalSheetDraft
                .findOneAndUpdate(
                    mongoose.trusted({
                        _id:
                            draft._id,
                        revision:
                            request
                                .expectedRevision,
                    }),
                    {
                        $set: {
                            lines:
                                persistedLines,
                            valuationStatus:
                                valuation
                                    .valuationStatus,
                            valuedAt:
                                valuation
                                    .valuedAt,
                            valuationFingerprint:
                                valuation
                                    .valuationFingerprint,
                            economicSnapshot:
                                valuation
                                    .economicSnapshot,
                            finalPriceTtcMinor:
                                valuation
                                    .economicSnapshot
                                    .finalPriceTtcMinor,
                            updatedBy:
                                actorId,
                        },
                        $inc: {
                            revision: 1,
                        },
                    },
                    {
                        returnDocument:
                            'after',
                        runValidators: true,
                        session,
                    },
                );

        if (!updated) {
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
                BUSINESS_ACTIVITY_ACTION
                    .TECHNICAL_SHEET_OPTIMIZATION_APPLIED,
            technicalSheetId,
            metadata: {
                previousRevision:
                    request
                        .expectedRevision,
                nextRevision:
                    updated.revision,
                mode:
                    request.mode,
                transformationCount:
                    simulation
                        .transformations
                        .length,
                savingsHt:
                    simulation
                        .savings
                        .amountHt,
            },
            session,
        });

        await updated.populate({
            path:
                'lines.productVariant',
            select:
                '_id name referenceUnit countUnitLabelSingular countUnitLabelPlural yieldPercent status',
        });

        return {
            draft:
                serializeTechnicalSheetDraft(
                    updated,
                ),
            savings:
                simulation.savings,
            transformations:
                simulation
                    .transformations,
        };
    },
);

export {
    applyTechnicalSheetOptimization,
    getTechnicalSheetOptimizationContext,
    simulateTechnicalSheetOptimization,
};
