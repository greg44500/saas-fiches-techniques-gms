import { z } from 'zod';

import {
    PRODUCT_CATEGORY_STATUS,
    PRODUCT_REFERENCE_UNIT,
    PRODUCT_REJECTION_REASON,
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

const aliasesSchema = z
    .array(z.string().trim().min(1).max(120))
    .max(20)
    .refine((aliases) => new Set(aliases).size === aliases.length, {
        message: 'Les alias ne doivent pas contenir de doublons.',
    });

const variantBodySchema = z.strictObject({
    form: nullableText(80).optional(),
    processingState: nullableText(80).optional(),
    preservation: nullableText(80).optional(),
    foodRange: z.number().int().min(1).max(5).nullable().optional(),
    referenceUnit: z.enum(Object.values(PRODUCT_REFERENCE_UNIT)),
    yieldPercent: z.number().positive().max(100).nullable().optional(),
});

const duplicateCheckBodySchema = z.strictObject({
    name: z.string().trim().min(1).max(120),
    aliases: aliasesSchema.optional().default([]),
});

const createProductContributionBodySchema = z.strictObject({
    name: z.string().trim().min(1).max(120),
    aliases: aliasesSchema.optional().default([]),
    categoryId: objectIdSchema.nullable().optional().default(null),
    reviewedCandidateIds: z.array(objectIdSchema).max(20).optional().default([]),
    variant: variantBodySchema,
});

const createVariantContributionBodySchema = variantBodySchema;

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
    form: z.number().int().min(0).max(49).optional(),
    processingState: z.number().int().min(0).max(49).optional(),
    preservation: z.number().int().min(0).max(49).optional(),
    foodRange: z.number().int().min(0).max(49).optional(),
    referenceUnit: z.number().int().min(0).max(49).optional(),
    yieldPercent: z.number().int().min(0).max(49).optional(),
}).refine(
    (mapping) => new Set(Object.values(mapping)).size
        === Object.values(mapping).length,
    { message: 'Une colonne ne peut pas être associée à plusieurs champs.' },
);

const importPreviewBodySchema = z.strictObject({
    mapping: importMappingSchema,
    defaults: z.strictObject({
        referenceUnit: z.enum(Object.values(PRODUCT_REFERENCE_UNIT)).optional(),
        foodRange: z.number().int().min(1).max(5).nullable().optional(),
        yieldPercent: z.number().positive().max(100).nullable().optional(),
    }).optional().default({}),
});

const importDecisionSchema = z.strictObject({
    rowNumber: z.number().int().min(2),
    action: z.enum(['ATTACH_EXISTING', 'CREATE_NEW', 'SKIP']),
    variantId: objectIdSchema.optional(),
}).superRefine((decision, context) => {
    if (
        decision.action === 'ATTACH_EXISTING'
        && !decision.variantId
    ) {
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

const platformProductListQuerySchema = z.strictObject({
    status: z.enum(Object.values(PRODUCT_STATUS)).optional(),
    categoryId: objectIdSchema.optional(),
    q: z.string().trim().min(2).max(120).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

const platformProductIdParamsSchema = z.strictObject({
    productId: objectIdSchema,
});

const platformProductVariantParamsSchema = z.strictObject({
    productId: objectIdSchema,
    variantId: objectIdSchema,
});

const platformCategoryParamsSchema = z.strictObject({
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
    categoryId: objectIdSchema.nullable().optional(),
    reviewedCandidateIds: z.array(objectIdSchema).max(20).optional().default([]),
}).refine(
    (body) => Object.keys(body).some((key) => key !== 'reviewedCandidateIds'),
    { message: 'Au moins un champ Produit doit être modifié.' },
);

const rejectProductBodySchema = z.strictObject({
    reason: z.enum(Object.values(PRODUCT_REJECTION_REASON)),
    replacementProductId: objectIdSchema.nullable().optional(),
    replacementVariantId: objectIdSchema.nullable().optional(),
    comment: z.string().trim().min(1).max(500).nullable().optional(),
});

const updateProductStatusBodySchema = z.strictObject({
    status: z.enum([
        PRODUCT_STATUS.ACTIVE,
        PRODUCT_STATUS.ARCHIVED,
    ]),
});

const updateVariantBodySchema = z.strictObject({
    form: nullableText(80).optional(),
    processingState: nullableText(80).optional(),
    preservation: nullableText(80).optional(),
    foodRange: z.number().int().min(1).max(5).nullable().optional(),
    referenceUnit: z.enum(Object.values(PRODUCT_REFERENCE_UNIT)).optional(),
    yieldPercent: z.number().positive().max(100).nullable().optional(),
}).refine(
    (body) => Object.keys(body).length > 0,
    { message: 'Au moins un champ Déclinaison doit être modifié.' },
);

const updateVariantStatusBodySchema = updateProductStatusBodySchema;

export {
    createCategoryBodySchema,
    createProductContributionBodySchema,
    createVariantContributionBodySchema,
    duplicateCheckBodySchema,
    importCommitBodySchema,
    importIdParamsSchema,
    importPreviewBodySchema,
    objectIdSchema,
    platformCategoryParamsSchema,
    platformProductIdParamsSchema,
    platformProductListQuerySchema,
    platformProductVariantParamsSchema,
    productIdParamsSchema,
    productSearchQuerySchema,
    productVariantParamsSchema,
    rejectProductBodySchema,
    updateCategoryBodySchema,
    updateCategoryStatusBodySchema,
    updateProductBodySchema,
    updateProductStatusBodySchema,
    updateVariantBodySchema,
    updateVariantStatusBodySchema,
    variantIdParamsSchema,
    workspaceIdParamsSchema,
};
