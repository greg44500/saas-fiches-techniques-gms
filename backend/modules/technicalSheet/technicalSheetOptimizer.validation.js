import { z } from 'zod';

import {
    objectIdSchema,
} from '../dossier/dossier.validation.js';
import {
    TECHNICAL_SHEET_OPTIMIZATION_CURVE_POINTS,
    TECHNICAL_SHEET_OPTIMIZATION_MAX_COST_ADJUSTMENT_PERCENT,
    TECHNICAL_SHEET_OPTIMIZATION_MIN_COST_ADJUSTMENT_PERCENT,
    TECHNICAL_SHEET_OPTIMIZATION_MODE,
} from './technicalSheetOptimizer.registry.js';

const decimalStringSchema = z
    .string()
    .trim()
    .max(60)
    .regex(
        /^(?:0|[1-9]\d*)(?:\.\d+)?$/,
        'Nombre décimal invalide.',
    );

const positiveDecimalStringSchema =
    decimalStringSchema.refine(
        (value) =>
            value.replace(/[.0]/g, '')
                .length > 0,
        'La valeur doit être strictement positive.',
    );

const curvePressureSchema = z
    .number()
    .int()
    .min(
        TECHNICAL_SHEET_OPTIMIZATION_MIN_COST_ADJUSTMENT_PERCENT,
    )
    .max(
        TECHNICAL_SHEET_OPTIMIZATION_MAX_COST_ADJUSTMENT_PERCENT,
    );

const curvePressuresShape =
    Object.fromEntries(
        TECHNICAL_SHEET_OPTIMIZATION_CURVE_POINTS
            .map(({ key }) => [
                key,
                curvePressureSchema,
            ]),
    );

const optimizationCurveSchema =
    z.strictObject({
        enabled: z.boolean(),
        pressures:
            z.strictObject(
                curvePressuresShape,
            ),
    });

const optionalOptimizationBoundSchema =
    positiveDecimalStringSchema
        .nullable()
        .optional();

const optimizationLineIntentSchema =
    z.strictObject({
        lineId: objectIdSchema,
        minNetQuantity:
            optionalOptimizationBoundSchema,
        maxNetQuantity:
            optionalOptimizationBoundSchema,
        locked: z.boolean(),
        localNetQuantity:
            positiveDecimalStringSchema
                .nullable()
                .optional(),
        productVariantId:
            objectIdSchema
                .nullable()
                .optional(),
        supplierArticleId:
            objectIdSchema
                .nullable()
                .optional(),
    });

const autoOptionsSchema =
    z.strictObject({
        adjustQuantities:
            z.boolean().default(true),
        productAlternatives:
            z.boolean().default(true),
        sourcingAlternatives:
            z.boolean().default(true),
    });

const optimizationSimulationBaseSchema =
    z.strictObject({
        expectedRevision:
            z.number()
                .int()
                .min(0),
        mode: z.enum(
            Object.values(
                TECHNICAL_SHEET_OPTIMIZATION_MODE,
            ),
        ),
        curve:
            optimizationCurveSchema,
        lines: z.array(
            optimizationLineIntentSchema,
        ).max(500),
        autoOptions:
            autoOptionsSchema,
    });

const assertUniqueLines = (
    value,
    context,
) => {
    const seen = new Set();

    value.lines.forEach((line, index) => {
        if (seen.has(line.lineId)) {
            context.addIssue({
                code: 'custom',
                path: [
                    'lines',
                    index,
                    'lineId',
                ],
                message:
                    'Une ligne ne peut être déclarée qu’une fois.',
            });
        }

        seen.add(line.lineId);
    });
};

const optimizationSimulationSchema =
    optimizationSimulationBaseSchema
        .superRefine(assertUniqueLines);

const applyOptimizationSchema =
    optimizationSimulationBaseSchema
        .extend({
            simulationFingerprint:
                z.string()
                    .regex(
                        /^[a-f0-9]{64}$/,
                        'Fingerprint de simulation invalide.',
                    ),
        })
        .superRefine(assertUniqueLines);

export {
    applyOptimizationSchema,
    optimizationSimulationSchema,
};
