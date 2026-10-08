import mongoose from 'mongoose';

import {
    BUSINESS_ACTIVITY_ACTION,
} from '../businessActivity/businessActivity.registry.js';
import {
    TECHNICAL_SHEET_LINE_KIND,
} from './technicalSheet.registry.js';
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
    TECHNICAL_SHEET_OPTIMIZATION_MAX_COST_ADJUSTMENT_PERCENT,
    TECHNICAL_SHEET_OPTIMIZATION_MIN_COST_ADJUSTMENT_PERCENT,
    TECHNICAL_SHEET_OPTIMIZATION_MODE,
} from './technicalSheetOptimizer.registry.js';
import {
    calculateSavings,
} from './technicalSheetOptimizerMath.service.js';
import {
    listProductAlternatives,
    listSupplierAlternatives,
} from './technicalSheetOptimizerAlternative.service.js';
import {
    buildFreshValuation,
    loadOptimizerDraft,
    normalizeLineIntents,
    projectValuation,
} from './technicalSheetOptimizerProjection.service.js';
import {
    buildTransformations,
    manualSimulation,
} from './technicalSheetOptimizerScenario.service.js';
import {
    autoSimulation,
} from './technicalSheetOptimizerAuto.service.js';
import { AppError } from '../../utils/appError.js';

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
        costAdjustmentRange: {
            min:
                TECHNICAL_SHEET_OPTIMIZATION_MIN_COST_ADJUSTMENT_PERCENT,
            max:
                TECHNICAL_SHEET_OPTIMIZATION_MAX_COST_ADJUSTMENT_PERCENT,
        },
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

    const result = { ...simulation };
    delete result.resolvedScenario;

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
