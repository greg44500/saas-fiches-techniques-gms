import { z } from 'zod';

import {
    PRODUCT_REFERENCE_UNIT,
} from '../productCatalog/productCatalog.registry.js';
import {
    SUPPLIER_RESOURCE_STATUS,
    SUPPLIER_SCOPE,
} from './supplierCatalog.registry.js';

const objectIdSchema = z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'ObjectId invalide');

const workspaceIdParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
});

const supplierIdParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
    supplierId: objectIdSchema,
});

const articleIdParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
    articleId: objectIdSchema,
});

const globalSupplierIdParamsSchema = z.strictObject({
    supplierId: objectIdSchema,
});

const globalArticleIdParamsSchema = z.strictObject({
    articleId: objectIdSchema,
});

const nullableText = (max) =>
    z.string().trim().max(max).nullable();

const categoryIdsSchema = z
    .array(objectIdSchema)
    .refine(
        (values) => new Set(values).size === values.length,
        'Une catégorie ne peut être sélectionnée qu’une seule fois.',
    );

const supplierFields = {
    name: z.string().trim().min(1).max(160),
    supplierCode: nullableText(80).optional(),
    legalName: nullableText(200).optional(),
    website: z.string().trim().url().max(500).nullable().optional(),
    categoryIds: categoryIdsSchema.optional(),
};

const createSupplierBodySchema = z.strictObject(supplierFields);

const updateSupplierBodySchema = z.strictObject({
    name: supplierFields.name.optional(),
    supplierCode: supplierFields.supplierCode,
    legalName: supplierFields.legalName,
    website: supplierFields.website,
    categoryIds: supplierFields.categoryIds,
}).refine(
    (value) => Object.keys(value).length > 0,
    'Au moins un champ doit être modifié.',
);

const updateSupplierStatusBodySchema = z.strictObject({
    status: z.enum(Object.values(SUPPLIER_RESOURCE_STATUS)),
});

const positiveDecimalStringSchema = z.union([
    z.string().trim().regex(/^(?:0*[1-9]\d*)(?:\.\d+)?$|^0*\.\d*[1-9]\d*$/),
    z.number().finite().positive(),
]).transform((value) => String(value));

const packagingBodySchema = z.strictObject({
    containerType: nullableText(80).optional(),
    unitCount: z.number().int().positive().nullable().optional(),
    quantityPerUnit:
        positiveDecimalStringSchema.nullable().optional(),
    unit: z.enum(Object.values(PRODUCT_REFERENCE_UNIT))
        .nullable()
        .optional(),
    netWeight: positiveDecimalStringSchema.nullable().optional(),
    netWeightUnit: z.enum([
        PRODUCT_REFERENCE_UNIT.G,
        PRODUCT_REFERENCE_UNIT.KG,
    ]).nullable().optional(),
    drainedNetWeight:
        positiveDecimalStringSchema.nullable().optional(),
    drainedNetWeightUnit: z.enum([
        PRODUCT_REFERENCE_UNIT.G,
        PRODUCT_REFERENCE_UNIT.KG,
    ]).nullable().optional(),
    supplierLabel: nullableText(240).optional(),
}).superRefine((value, context) => {
    if (
        value.quantityPerUnit !== null
        && value.quantityPerUnit !== undefined
        && !value.unit
    ) {
        context.addIssue({
            code: 'custom',
            path: ['unit'],
            message: 'Une unité est requise avec la quantité par unité.',
        });
    }

    if (
        value.drainedNetWeight !== null
        && value.drainedNetWeight !== undefined
        && !value.drainedNetWeightUnit
    ) {
        context.addIssue({
            code: 'custom',
            path: ['drainedNetWeightUnit'],
            message: 'Une unité est requise avec le poids net égoutté.',
        });
    }
});

const createArticleBodySchema = z.strictObject({
    supplierId: objectIdSchema,
    productVariantId: objectIdSchema,
    supplierReference: z.string().trim().min(1).max(120),
    supplierDesignation: nullableText(300).optional(),
    brand: nullableText(160).optional(),
    packaging: packagingBodySchema.nullable().optional(),
    provenance: nullableText(240).optional(),
});

const updateArticleBodySchema = z.strictObject({
    productVariantId: objectIdSchema.optional(),
    supplierDesignation: nullableText(300).optional(),
    brand: nullableText(160).optional(),
    packaging: packagingBodySchema.nullable().optional(),
    provenance: nullableText(240).optional(),
}).refine(
    (value) => Object.keys(value).length > 0,
    'Au moins un champ doit être modifié.',
);

const replaceArticleBodySchema = z.strictObject({
    supplierReference: z.string().trim().min(1).max(120),
    productVariantId: objectIdSchema.optional(),
    supplierDesignation: nullableText(300).optional(),
    brand: nullableText(160).optional(),
    packaging: packagingBodySchema.nullable().optional(),
    provenance: nullableText(240).optional(),
});

const updateArticleStatusBodySchema = z.strictObject({
    status: z.enum(Object.values(SUPPLIER_RESOURCE_STATUS)),
});

const listQueryBase = {
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(120).optional(),
    status: z.enum(Object.values(SUPPLIER_RESOURCE_STATUS))
        .optional()
        .default(SUPPLIER_RESOURCE_STATUS.ACTIVE),
};

const workspaceSupplierListQuerySchema = z.strictObject({
    ...listQueryBase,
    status: z.union([
        z.enum(Object.values(SUPPLIER_RESOURCE_STATUS)),
        z.literal('ALL'),
    ])
        .optional()
        .default(SUPPLIER_RESOURCE_STATUS.ACTIVE)
        .transform((value) => value === 'ALL' ? null : value),
    scope: z.enum(Object.values(SUPPLIER_SCOPE)).optional(),
});

const globalSupplierListQuerySchema = z.strictObject({
    ...listQueryBase,
});

const workspaceArticleListQuerySchema = z.strictObject({
    ...listQueryBase,
    scope: z.enum(Object.values(SUPPLIER_SCOPE)).optional(),
    supplierId: objectIdSchema.optional(),
    productId: objectIdSchema.optional(),
    productVariantId: objectIdSchema.optional(),
}).refine(
    (value) => !(value.productId && value.productVariantId),
    {
        message:
            'productId et productVariantId ne peuvent pas être combinés.',
    },
);

const globalArticleListQuerySchema = z.strictObject({
    ...listQueryBase,
    supplierId: objectIdSchema.optional(),
    productVariantId: objectIdSchema.optional(),
});

export {
    articleIdParamsSchema,
    createArticleBodySchema,
    createSupplierBodySchema,
    globalArticleIdParamsSchema,
    globalArticleListQuerySchema,
    globalSupplierIdParamsSchema,
    globalSupplierListQuerySchema,
    replaceArticleBodySchema,
    supplierIdParamsSchema,
    updateArticleBodySchema,
    updateArticleStatusBodySchema,
    updateSupplierBodySchema,
    updateSupplierStatusBodySchema,
    workspaceArticleListQuerySchema,
    workspaceIdParamsSchema,
    workspaceSupplierListQuerySchema,
};
