import { z } from 'zod';

import {
    objectIdSchema,
} from '../dossier/dossier.validation.js';
import {
    PRODUCT_REFERENCE_UNIT,
} from '../productCatalog/productCatalog.registry.js';
import {
    TECHNICAL_SHEET_FINAL_PRICE_MODE,
    TECHNICAL_SHEET_LINE_KIND,
    TECHNICAL_SHEET_SALE_BASIS,
    TECHNICAL_SHEET_STATUS,
    TECHNICAL_SHEET_TRASH_RETENTION,
    TECHNICAL_SHEET_VAT_RATE_BASIS_POINTS,
} from './technicalSheet.registry.js';

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

const nullablePositiveDecimal =
    positiveDecimalStringSchema
        .nullable();

const vatRateBasisPointsSchema = z
    .number()
    .int()
    .refine(
        (value) =>
            TECHNICAL_SHEET_VAT_RATE_BASIS_POINTS
                .includes(value),
        'TVA non autorisée.',
    );

const legacyCompatibleVatRateBasisPointsSchema = z
    .number()
    .int()
    .min(0)
    .max(10000);

const paginationQuerySchema = z.strictObject({
    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(1),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20),
});

const technicalSheetWorkspaceParamsSchema =
    z.strictObject({
        workspaceId: objectIdSchema,
    });

const technicalSheetDossierParamsSchema =
    z.strictObject({
        workspaceId: objectIdSchema,
        dossierId: objectIdSchema,
    });

const technicalSheetParamsSchema =
    z.strictObject({
        workspaceId: objectIdSchema,
        dossierId: objectIdSchema,
        technicalSheetId: objectIdSchema,
    });

const technicalSheetValidationParamsSchema =
    z.strictObject({
        workspaceId: objectIdSchema,
        dossierId: objectIdSchema,
        technicalSheetId: objectIdSchema,
        validationId: objectIdSchema,
    });

const technicalSheetListQuerySchema =
    paginationQuerySchema.extend({
        search: z
            .string()
            .trim()
            .min(1)
            .max(160)
            .optional(),
        status: z
            .enum(
                Object.values(
                    TECHNICAL_SHEET_STATUS,
                ),
            )
            .optional(),
    });

const createTechnicalSheetSchema =
    z.strictObject({
        name: z
            .string()
            .trim()
            .min(1)
            .max(160),
        description: z
            .string()
            .trim()
            .min(1)
            .max(2000)
            .nullable()
            .optional(),
        productionQuantity:
            positiveDecimalStringSchema,
        productionUnit: z.literal(
            PRODUCT_REFERENCE_UNIT.UNIT,
        ),
        portionsPerProductionUnit:
            positiveDecimalStringSchema
                .default('1'),
        saleBasis: z
            .enum(
                Object.values(
                    TECHNICAL_SHEET_SALE_BASIS,
                ),
            )
            .default(
                TECHNICAL_SHEET_SALE_BASIS.PIECE,
            ),
        vatRateBasisPoints:
            vatRateBasisPointsSchema
                .default(550),
        targetMarginBasisPoints: z
            .number()
            .int()
            .min(0)
            .max(9999)
            .optional(),
    });

const updateTechnicalSheetSchema =
    z.strictObject({
        expectedRevision: z
            .number()
            .int()
            .min(0),
        name: z
            .string()
            .trim()
            .min(1)
            .max(160)
            .optional(),
        description: z
            .string()
            .trim()
            .min(1)
            .max(2000)
            .nullable()
            .optional(),
    }).superRefine((value, context) => {
        if (
            !Object.hasOwn(value, 'name')
            && !Object.hasOwn(
                value,
                'description',
            )
        ) {
            context.addIssue({
                code: 'custom',
                message:
                    'Au moins un champ doit être modifié.',
            });
        }
    });

const technicalSheetLineSchema =
    z.strictObject({
        id: objectIdSchema.optional(),
        kind: z.enum(
            Object.values(
                TECHNICAL_SHEET_LINE_KIND,
            ),
        ),
        productVariantId:
            objectIdSchema,
        netQuantity:
            positiveDecimalStringSchema,
        inputUnit: z.enum(
            Object.values(
                PRODUCT_REFERENCE_UNIT,
            ),
        ).optional(),
        order: z
            .number()
            .int()
            .min(0),
        note: z
            .string()
            .trim()
            .min(1)
            .max(500)
            .nullable()
            .optional(),
        selectedSupplierArticleId:
            objectIdSchema
                .nullable()
                .optional(),
    });

const saveTechnicalSheetDraftSchema =
    z.strictObject({
        expectedRevision: z
            .number()
            .int()
            .min(0),
        productionQuantity:
            nullablePositiveDecimal
                .optional(),
        productionUnit: z
            .literal(
                PRODUCT_REFERENCE_UNIT.UNIT,
            )
            .nullable()
            .optional(),
        portionsPerProductionUnit:
            nullablePositiveDecimal
                .optional(),
        saleBasis: z
            .enum(
                Object.values(
                    TECHNICAL_SHEET_SALE_BASIS,
                ),
            )
            .nullable()
            .optional(),
        vatRateBasisPoints:
            legacyCompatibleVatRateBasisPointsSchema
                .nullable()
                .optional(),
        targetMarginBasisPoints: z
            .number()
            .int()
            .min(0)
            .max(9999)
            .nullable()
            .optional(),
        finalPriceTtcMinor: z
            .number()
            .int()
            .min(0)
            .nullable()
            .optional(),
        finalPriceMode: z
            .enum(
                Object.values(
                    TECHNICAL_SHEET_FINAL_PRICE_MODE,
                ),
            )
            .optional(),
        lines: z
            .array(
                technicalSheetLineSchema,
            )
            .max(500)
            .optional(),
    });

const createDraftFromValidationSchema =
    z.strictObject({
        expectedSheetRevision: z
            .number()
            .int()
            .min(0),
    });

const valuateTechnicalSheetSchema =
    z.strictObject({
        expectedRevision: z
            .number()
            .int()
            .min(0),
    });

const selectSupplierArticleSchema =
    z.strictObject({
        expectedRevision: z
            .number()
            .int()
            .min(0),
        lineId: objectIdSchema,
        supplierArticleId:
            objectIdSchema,
    });

const validateTechnicalSheetSchema =
    z.strictObject({
        expectedSheetRevision: z
            .number()
            .int()
            .min(0),
        expectedDraftRevision: z
            .number()
            .int()
            .min(0),
        comment: z
            .string()
            .trim()
            .min(1)
            .max(1000)
            .nullable()
            .optional(),
    });

const revisionMutationSchema =
    z.strictObject({
        expectedRevision: z
            .number()
            .int()
            .min(0),
    });

const purgeTechnicalSheetSchema =
    revisionMutationSchema.extend({
        confirmation:
            z.literal('PURGE'),
    });

const copyTechnicalSheetSchema =
    z.strictObject({
        targetDossierId:
            objectIdSchema,
    });

const dossierTechnicalSheetSettingsSchema =
    z.strictObject({
        defaultTargetMarginBasisPoints:
            z.number()
                .int()
                .min(0)
                .max(9999),
    });

const trashRetentionSchema =
    z.strictObject({
        trashRetentionDays: z
            .number()
            .int()
            .min(
                TECHNICAL_SHEET_TRASH_RETENTION
                    .MIN_DAYS,
            )
            .max(
                TECHNICAL_SHEET_TRASH_RETENTION
                    .MAX_DAYS,
            ),
    });

const purgeWorkspaceTrashSchema =
    z.strictObject({
        confirmation:
            z.literal('PURGE_EXPIRED'),
    });

export {
    copyTechnicalSheetSchema,
    createDraftFromValidationSchema,
    createTechnicalSheetSchema,
    dossierTechnicalSheetSettingsSchema,
    paginationQuerySchema,
    purgeTechnicalSheetSchema,
    purgeWorkspaceTrashSchema,
    revisionMutationSchema,
    saveTechnicalSheetDraftSchema,
    selectSupplierArticleSchema,
    technicalSheetDossierParamsSchema,
    technicalSheetListQuerySchema,
    technicalSheetParamsSchema,
    technicalSheetValidationParamsSchema,
    technicalSheetWorkspaceParamsSchema,
    trashRetentionSchema,
    updateTechnicalSheetSchema,
    validateTechnicalSheetSchema,
    valuateTechnicalSheetSchema,
};
