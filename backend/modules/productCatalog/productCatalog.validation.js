import { z } from 'zod';

import {
    PRODUCT_CATEGORY_STATUS,
    PRODUCT_FOOD_RANGES,
    PRODUCT_REFERENCE_UNIT,
    PRODUCT_STATUS,
    WORKSPACE_PRODUCT_STATUS,
} from './productCatalog.registry.js';

const objectIdSchema = z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'ObjectId invalide');

const nullableText = (max) => z.string().trim().min(1).max(max).nullable();

const workspaceIdParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
});

const productIdParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
    productId: objectIdSchema,
});

const variantIdParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
    variantId: objectIdSchema,
});

const productVariantParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
    productId: objectIdSchema,
    variantId: objectIdSchema,
});

const importIdParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
    importId: objectIdSchema,
});

const globalImportIdParamsSchema = z.strictObject({
    importId: objectIdSchema,
});

const aliasesSchema = z
    .array(z.string().trim().min(1).max(120))
    .max(20)
    .refine((aliases) => new Set(aliases).size === aliases.length, {
        message: 'Les alias ne doivent pas contenir de doublons.',
    });

const foodRangeSchema = z.number().int().refine(
    (value) => PRODUCT_FOOD_RANGES.includes(value),
    { message: 'Gamme invalide.' },
);

const characteristicIdsSchema = z
    .array(objectIdSchema)
    .max(5)
    .refine(
        (ids) => new Set(ids).size === ids.length,
        { message: 'Les Caractéristiques ne doivent pas contenir de doublons.' },
    );

const variantBodySchema = z.strictObject({
    varietyId: objectIdSchema.nullable().optional(),
    characteristicIds: characteristicIdsSchema.optional().default([]),
    presentation: nullableText(120).optional(),
    processingState: nullableText(80).optional(),
    foodRange: foodRangeSchema,
    referenceUnit: z.enum(Object.values(PRODUCT_REFERENCE_UNIT)),
    yieldPercent: z.number().positive().max(100).nullable().optional(),
});

const duplicateCheckBodySchema = z.strictObject({
    name: z.string().trim().min(1).max(120),
    aliases: aliasesSchema.optional().default([]),
});

const createProductBodySchema = z.strictObject({
    name: z.string().trim().min(1).max(120),
    aliases: aliasesSchema.optional().default([]),
    categoryId: objectIdSchema,
    reviewedCandidateIds: z.array(objectIdSchema).max(20).optional().default([]),
    variant: variantBodySchema,
});

const createWorkspaceProductBodySchema = createProductBodySchema;
const createGlobalProductBodySchema = createProductBodySchema;
const createWorkspaceVariantBodySchema = variantBodySchema;
const createGlobalVariantBodySchema = variantBodySchema;

const productSearchQuerySchema = z.strictObject({
    q: z.string().trim().min(2).max(120).optional(),
    scope: z.enum(['WORKSPACE', 'REFERENCE']).default('WORKSPACE'),
    categoryId: objectIdSchema.optional(),
    status: z.enum(Object.values(WORKSPACE_PRODUCT_STATUS)).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

const importMappingSchema = z.strictObject({
    name: z.number().int().min(0).max(49),
    aliases: z.number().int().min(0).max(49).optional(),
    category: z.number().int().min(0).max(49).optional(),
    presentation: z.number().int().min(0).max(49).optional(),
    processingState: z.number().int().min(0).max(49).optional(),
    foodRange: z.number().int().min(0).max(49).optional(),
    referenceUnit: z.number().int().min(0).max(49).optional(),
    yieldPercent: z.number().int().min(0).max(49).optional(),
}).refine(
    (mapping) => new Set(Object.values(mapping)).size
        === Object.values(mapping).length,
    { message: 'Une colonne ne peut pas être associée à plusieurs champs.' },
);

const importDefaultsSchema = z.strictObject({
    categoryId: objectIdSchema.optional(),
    referenceUnit: z.enum(Object.values(PRODUCT_REFERENCE_UNIT)).optional(),
    foodRange: foodRangeSchema.optional(),
    yieldPercent: z.number().positive().max(100).nullable().optional(),
}).optional().default({});

const importPreviewBodySchema = z.strictObject({
    mapping: importMappingSchema,
    defaults: importDefaultsSchema,
});

const importDecisionSchema = z.strictObject({
    rowNumber: z.number().int().min(2),
    action: z.enum(['ATTACH_EXISTING', 'CREATE_NEW', 'SKIP']),
    variantId: objectIdSchema.optional(),
}).superRefine((decision, context) => {
    if (decision.action === 'ATTACH_EXISTING' && !decision.variantId) {
        context.addIssue({
            code: 'custom',
            path: ['variantId'],
            message: 'variantId est requis pour rattacher une référence existante.',
        });
    }
});

const importCommitBodySchema = z.strictObject({
    decisions: z.array(importDecisionSchema).max(5000).optional().default([]),
});

const globalProductListQuerySchema = z.strictObject({
    status: z.enum([PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED]).optional(),
    categoryId: objectIdSchema.optional(),
    q: z.string().trim().min(2).max(120).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

const globalProductIdParamsSchema = z.strictObject({
    productId: objectIdSchema,
});

const globalProductVariantParamsSchema = z.strictObject({
    productId: objectIdSchema,
    variantId: objectIdSchema,
});

const globalCategoryParamsSchema = z.strictObject({
    categoryId: objectIdSchema,
});

const createCategoryBodySchema = z.strictObject({
    name: z.string().trim().min(1).max(120),
});

const updateCategoryBodySchema = createCategoryBodySchema;

const updateCategoryStatusBodySchema = z.strictObject({
    status: z.enum(Object.values(PRODUCT_CATEGORY_STATUS)),
});

const updateProductBodySchema = z.strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    aliases: aliasesSchema.optional(),
    categoryId: objectIdSchema.optional(),
    reviewedCandidateIds: z.array(objectIdSchema).max(20).optional().default([]),
}).refine(
    (body) => Object.keys(body).some((key) => key !== 'reviewedCandidateIds'),
    { message: 'Au moins un champ Produit doit être modifié.' },
);

const updateProductStatusBodySchema = z.strictObject({
    status: z.enum([PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED]),
});

const updateVariantBodySchema = z.strictObject({
    varietyId: objectIdSchema.nullable().optional(),
    characteristicIds: characteristicIdsSchema.optional(),
    presentation: nullableText(120).optional(),
    processingState: nullableText(80).optional(),
    foodRange: foodRangeSchema.optional(),
    referenceUnit: z.enum(Object.values(PRODUCT_REFERENCE_UNIT)).optional(),
    yieldPercent: z.number().positive().max(100).nullable().optional(),
}).refine(
    (body) => Object.keys(body).length > 0,
    { message: 'Au moins un champ Déclinaison doit être modifié.' },
);

const updateVariantStatusBodySchema = updateProductStatusBodySchema;

export {
    createCategoryBodySchema,
    createGlobalProductBodySchema,
    createGlobalVariantBodySchema,
    createWorkspaceProductBodySchema,
    createWorkspaceVariantBodySchema,
    duplicateCheckBodySchema,
    globalCategoryParamsSchema,
    globalImportIdParamsSchema,
    globalProductIdParamsSchema,
    globalProductListQuerySchema,
    globalProductVariantParamsSchema,
    importCommitBodySchema,
    importIdParamsSchema,
    importPreviewBodySchema,
    objectIdSchema,
    productIdParamsSchema,
    productSearchQuerySchema,
    productVariantParamsSchema,
    updateCategoryBodySchema,
    updateCategoryStatusBodySchema,
    updateProductBodySchema,
    updateProductStatusBodySchema,
    updateVariantBodySchema,
    updateVariantStatusBodySchema,
    variantIdParamsSchema,
    workspaceIdParamsSchema,
};
