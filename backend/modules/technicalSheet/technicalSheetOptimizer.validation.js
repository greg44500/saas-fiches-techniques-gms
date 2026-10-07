import { z } from 'zod';

import {
    objectIdSchema,
} from '../dossier/dossier.validation.js';
import {
    TECHNICAL_SHEET_OPTIMIZATION_CURVE_POINTS,
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
    .min(-100)
    .max(100);

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

const optimizationLineIntentSchema =
    z.strictObject({
        lineId: objectIdSchema,
        minNetQuantity:
            positiveDecimalStringSchema,
        maxNetQuantity:
            positiveDecimalStringSchema,
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

const createOptimizationSchema = ({
    includeFingerprint = false,
} = {}) => {
    const shape = {
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
    };

    if (includeFingerprint) {
        shape.simulationFingerprint =
            z.string()
                .regex(
                    /^[a-f0-9]{64}$/,
                    'Fingerprint de simulation invalide.',
                );
    }

    return z.strictObject(shape)
        .superRefine(
            (value, context) => {
                const seen = new Set();

                value.lines.forEach(
                    (line, index) => {
                        if (
                            seen.has(
                                line.lineId,
                            )
                        ) {
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

                        seen.add(
                            line.lineId,
                        );
                    },
                );
            },
        );
};

const optimizationSimulationSchema =
    createOptimizationSchema();

const applyOptimizationSchema =
    createOptimizationSchema({
        includeFingerprint: true,
    });

export {
    applyOptimizationSchema,
    optimizationSimulationSchema,
};
