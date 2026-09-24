import { z } from 'zod';

import {
    PRODUCT_CATEGORY_STATUS,
    PRODUCT_CHARACTERISTIC_KIND,
    PRODUCT_CONTRIBUTION_STATUS,
    PRODUCT_CONTRIBUTION_TYPE,
    PRODUCT_FOOD_RANGES,
    PRODUCT_REFERENCE_UNIT,
    PRODUCT_STATUS,
    PRODUCT_USAGE_TYPE,
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
    .max(6)
    .refine(
        (ids) => new Set(ids).size === ids.length,
        { message: 'Les Caractéristiques ne doivent pas contenir de doublons.' },
    );

const usageTypeSchema = z.enum(
    Object.values(PRODUCT_USAGE_TYPE),
).nullable();

const structuredVariantBodySchema = z.strictObject({
    varietyId: objectIdSchema.nullable().optional(),
    characteristicIds: characteristicIdsSchema.optional().default([]),
    processingState: nullableText(80).optional(),
    foodRange: foodRangeSchema,
    usageType: usageTypeSchema.optional().default(null),
    referenceUnit: z.enum(Object.values(PRODUCT_REFERENCE_UNIT)),
    yieldPercent: z.number().positive().max(100).nullable().optional(),
});

const newProductVariantBodySchema = z.strictObject({
    presentation: nullableText(120).optional(),
    processingState: nullableText(80).optional(),
    foodRange: foodRangeSchema,
    usageType: usageTypeSchema.optional().default(null),
    referenceUnit: z.enum(Object.values(PRODUCT_REFERENCE_UNIT)),
    yieldPercent: z.number().positive().max(100).nullable().optional(),
});

const duplicateCheckBodySchema = z.strictObject({
    name: z.string().trim().min(1).max(120),
    aliases: aliasesSchema.optional().default([]),
});

const createWorkspaceProductBodySchema = z.strictObject({
    name: z.string().trim().min(1).max(120),
    categoryId: objectIdSchema,
    variant: newProductVariantBodySchema,
});

const createGlobalProductBodySchema = z.strictObject({
    name: z.string().trim().min(1).max(120),
    aliases: aliasesSchema.optional().default([]),
    categoryId: objectIdSchema,
    reviewedCandidateIds: z.array(objectIdSchema).max(20).optional().default([]),
    variant: newProductVariantBodySchema.optional(),
});

const createWorkspaceVariantBodySchema = structuredVariantBodySchema;
const createGlobalVariantBodySchema = structuredVariantBodySchema;

const productSearchQuerySchema = z.strictObject({
    q: z.string().trim().min(2).max(120).optional(),
    scope: z.enum(['WORKSPACE', 'REFERENCE']).default('WORKSPACE'),
    categoryId: objectIdSchema.optional(),
    status: z.enum(Object.values(WORKSPACE_PRODUCT_STATUS)).optional(),
    foodRange: z.coerce.number().int().refine(
        (value) => PRODUCT_FOOD_RANGES.includes(value),
        { message: 'Gamme invalide.' },
    ).optional(),
    sort: z.enum(['NAME', 'FOOD_RANGE']).default('NAME'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

const importMappingSchema = z.strictObject({
    name: z.number().int().min(0).max(49),
    aliases: z.number().int().min(0).max(49).optional(),
    category: z.number().int().min(0).max(49).optional(),
    variety: z.number().int().min(0).max(49).optional(),
    presentation: z.number().int().min(0).max(49).optional(),
    cut: z.number().int().min(0).max(49).optional(),
    commercialType: z.number().int().min(0).max(49).optional(),
    sizeFormat: z.number().int().min(0).max(49).optional(),
    color: z.number().int().min(0).max(49).optional(),
    qualityDesignation: z.number().int().min(0).max(49).optional(),
    processingState: z.number().int().min(0).max(49).optional(),
    foodRange: z.number().int().min(0).max(49).optional(),
    usageType: z.number().int().min(0).max(49).optional(),
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
    usageType: usageTypeSchema.optional(),
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

const createReferenceContributionBodySchema = z.strictObject({
    type: z.enum(Object.values(PRODUCT_CONTRIBUTION_TYPE)),
    productId: objectIdSchema.optional(),
    characteristicKind: z.enum(
        Object.values(PRODUCT_CHARACTERISTIC_KIND),
    ).optional(),
    value: z.string().trim().min(1).max(120),
    categoryId: objectIdSchema.optional(),
    variant: newProductVariantBodySchema.optional(),
}).superRefine((body, context) => {
    if (body.type === PRODUCT_CONTRIBUTION_TYPE.CANONICAL_PRODUCT) {
        if (!body.categoryId) {
            context.addIssue({
                code: 'custom',
                path: ['categoryId'],
                message: 'categoryId est requis pour proposer un nouveau Produit.',
            });
        }
        if (!body.variant) {
            context.addIssue({
                code: 'custom',
                path: ['variant'],
                message: 'Une première déclinaison est requise pour proposer un nouveau Produit.',
            });
        }
        if (
            body.variant?.varietyId
            || (body.variant?.characteristicIds ?? []).length > 0
        ) {
            context.addIssue({
                code: 'custom',
                path: ['variant'],
                message: 'Un nouveau Produit ne peut pas référencer des dimensions d’un autre Produit.',
            });
        }
    } else if (!body.productId) {
        context.addIssue({
            code: 'custom',
            path: ['productId'],
            message: 'productId est requis pour cette contribution.',
        });
    }

    if (
        body.type === PRODUCT_CONTRIBUTION_TYPE.CHARACTERISTIC
        && !body.characteristicKind
    ) {
        context.addIssue({
            code: 'custom',
            path: ['characteristicKind'],
            message: 'characteristicKind est requis pour une Caractéristique.',
        });
    }
});

const referenceContributionListQuerySchema = z.strictObject({
    status: z.enum(Object.values(PRODUCT_CONTRIBUTION_STATUS))
        .optional()
        .default(PRODUCT_CONTRIBUTION_STATUS.PENDING_REVIEW),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

const referenceContributionParamsSchema = z.strictObject({
    contributionId: objectIdSchema,
});

const referenceContributionDecisionBodySchema = z.strictObject({
    decision: z.enum(['APPROVE', 'REJECT']),
});

const globalProductVarietyParamsSchema = z.strictObject({
    productId: objectIdSchema,
    varietyId: objectIdSchema,
});

const globalProductCharacteristicParamsSchema = z.strictObject({
    productId: objectIdSchema,
    characteristicId: objectIdSchema,
});

const createVarietyBodySchema = z.strictObject({
    name: z.string().trim().min(1).max(120),
    aliases: aliasesSchema.optional().default([]),
});

const updateVarietyBodySchema = z.strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    aliases: aliasesSchema.optional(),
}).refine(
    (body) => Object.keys(body).length > 0,
    { message: 'Au moins un champ Variété doit être modifié.' },
);

const createCharacteristicBodySchema = z.strictObject({
    kind: z.enum(Object.values(PRODUCT_CHARACTERISTIC_KIND)),
    name: z.string().trim().min(1).max(120),
    aliases: aliasesSchema.optional().default([]),
});

const updateCharacteristicBodySchema = z.strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    aliases: aliasesSchema.optional(),
}).refine(
    (body) => Object.keys(body).length > 0,
    { message: 'Au moins un champ Caractéristique doit être modifié.' },
);

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
    processingState: nullableText(80).optional(),
    foodRange: foodRangeSchema.optional(),
    usageType: usageTypeSchema.optional(),
    referenceUnit: z.enum(Object.values(PRODUCT_REFERENCE_UNIT)).optional(),
    yieldPercent: z.number().positive().max(100).nullable().optional(),
}).refine(
    (body) => Object.keys(body).length > 0,
    { message: 'Au moins un champ Déclinaison doit être modifié.' },
);

const updateVariantStatusBodySchema = updateProductStatusBodySchema;

export {
    createCategoryBodySchema,
    createCharacteristicBodySchema,
    createVarietyBodySchema,
    createGlobalProductBodySchema,
    createGlobalVariantBodySchema,
    createReferenceContributionBodySchema,
    createWorkspaceProductBodySchema,
    createWorkspaceVariantBodySchema,
    duplicateCheckBodySchema,
    globalCategoryParamsSchema,
    globalProductCharacteristicParamsSchema,
    globalImportIdParamsSchema,
    globalProductIdParamsSchema,
    globalProductVarietyParamsSchema,
    globalProductListQuerySchema,
    globalProductVariantParamsSchema,
    importCommitBodySchema,
    importIdParamsSchema,
    importPreviewBodySchema,
    objectIdSchema,
    productIdParamsSchema,
    productSearchQuerySchema,
    productVariantParamsSchema,
    referenceContributionDecisionBodySchema,
    referenceContributionListQuerySchema,
    referenceContributionParamsSchema,
    updateCategoryBodySchema,
    updateCharacteristicBodySchema,
    updateCategoryStatusBodySchema,
    updateProductBodySchema,
    updateProductStatusBodySchema,
    updateVariantBodySchema,
    updateVarietyBodySchema,
    updateVariantStatusBodySchema,
    variantIdParamsSchema,
    workspaceIdParamsSchema,
};
