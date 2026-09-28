import { z } from 'zod';

import {
    PRODUCT_REFERENCE_UNIT,
} from '../productCatalog/productCatalog.registry.js';
import {
    SUPPLIER_PRICE_BASIS,
    SUPPLIER_RESOURCE_STATUS,
    SUPPLIER_SCOPE,
} from './supplierCatalog.registry.js';

const objectIdSchema = z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'ObjectId invalide');

const workspaceIdParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
});

const workspaceCatalogIdParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
    catalogId: objectIdSchema,
});

const workspaceImportIdParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
    importId: objectIdSchema,
});

const globalCatalogIdParamsSchema = z.strictObject({
    catalogId: objectIdSchema,
});

const globalImportIdParamsSchema = z.strictObject({
    importId: objectIdSchema,
});

const nullableDateSchema =
    z.coerce.date().nullable().optional();

const editionBaseSchema = z.strictObject({
    supplierId: objectIdSchema,
    name: z.string().trim().min(1).max(180),
    editionDate: nullableDateSchema,
    validFrom: nullableDateSchema,
    validTo: nullableDateSchema,
    source: z.string().trim().max(500)
        .nullable()
        .optional(),
});

const validateEditionValidityPeriod =
    (value, context) => {
        if (
            value.validFrom
            && value.validTo
            && value.validFrom > value.validTo
        ) {
            context.addIssue({
                code: 'custom',
                path: ['validTo'],
                message:
                    'La fin de validité doit être postérieure ou égale au début.',
            });
        }
    };

const editionBodySchema =
    editionBaseSchema.superRefine(
        validateEditionValidityPeriod,
    );

const importEditionBodySchema =
    editionBaseSchema
        .omit({ supplierId: true })
        .superRefine(
            validateEditionValidityPeriod,
        );

const updateCatalogStatusBodySchema =
    z.strictObject({
        status: z.enum(
            Object.values(
                SUPPLIER_RESOURCE_STATUS,
            ),
        ),
    });

const positiveDecimalSchema = z.union([
    z.string()
        .trim()
        .regex(
            /^(?:0*[1-9]\d*)(?:[.,]\d+)?$|^0*[.,]\d*[1-9]\d*$/,
        ),
    z.number().finite().positive(),
]).transform(
    (value) =>
        String(value)
            .replace(',', '.'),
);

const packagingSchema = z.strictObject({
    containerType:
        z.string().trim().max(80)
            .nullable()
            .optional(),
    unitCount:
        z.number().int().positive()
            .nullable()
            .optional(),
    quantityPerUnit:
        positiveDecimalSchema
            .nullable()
            .optional(),
    unit: z.enum(
        Object.values(
            PRODUCT_REFERENCE_UNIT,
        ),
    ).nullable().optional(),
    netWeight:
        positiveDecimalSchema
            .nullable()
            .optional(),
    netWeightUnit: z.enum([
        PRODUCT_REFERENCE_UNIT.G,
        PRODUCT_REFERENCE_UNIT.KG,
    ]).nullable().optional(),
    drainedNetWeight:
        positiveDecimalSchema
            .nullable()
            .optional(),
    drainedNetWeightUnit: z.enum([
        PRODUCT_REFERENCE_UNIT.G,
        PRODUCT_REFERENCE_UNIT.KG,
    ]).nullable().optional(),
    supplierLabel:
        z.string().trim().max(240)
            .nullable()
            .optional(),
}).superRefine((value, context) => {
    if (
        value.quantityPerUnit
        && !value.unit
    ) {
        context.addIssue({
            code: 'custom',
            path: ['unit'],
            message:
                'Une unité est requise avec la quantité.',
        });
    }
});

const sourcePriceSchema = z.strictObject({
    amount: positiveDecimalSchema,
    basis: z.enum(
        Object.values(
            SUPPLIER_PRICE_BASIS,
        ),
    ),
    currency: z.string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{3}$/)
        .default('EUR'),
});

const catalogLineBodySchema = z.strictObject({
    supplierReference:
        z.string().trim().max(120)
            .nullable()
            .optional(),
    designation:
        z.string().trim().max(300)
            .nullable()
            .optional(),
    brand:
        z.string().trim().max(160)
            .nullable()
            .optional(),
    packaging:
        packagingSchema
            .nullable()
            .optional(),
    sourcePrice:
        sourcePriceSchema
            .nullable()
            .optional(),
    supplierArticleId:
        objectIdSchema
            .nullable()
            .optional(),
    productVariantId:
        objectIdSchema
            .nullable()
            .optional(),
    matchStatus:
        z.enum([
            'UNMATCHED',
            'MATCHED',
            'AMBIGUOUS',
            'IGNORED',
        ]).optional(),
    provenance:
        z.string().trim().max(500)
            .nullable()
            .optional(),
}).refine(
    (value) =>
        Boolean(
            value.supplierReference
            || value.designation,
        ),
    'Référence fournisseur ou désignation requise.',
);

const listCatalogQuerySchema = z.strictObject({
    page: z.coerce.number()
        .int().min(1).default(1),
    limit: z.coerce.number()
        .int().min(1).max(100)
        .default(20),
    supplierId:
        objectIdSchema.optional(),
    status:
        z.enum(
            Object.values(
                SUPPLIER_RESOURCE_STATUS,
            ),
        ).optional()
            .default(
                SUPPLIER_RESOURCE_STATUS
                    .ACTIVE,
            ),
    scope:
        z.enum(
            Object.values(
                SUPPLIER_SCOPE,
            ),
        ).optional(),
});

const listCatalogLinesQuerySchema =
    z.strictObject({
        page: z.coerce.number()
            .int().min(1).default(1),
        limit: z.coerce.number()
            .int().min(1).max(100)
            .default(50),
    });

const mappingIndexSchema =
    z.number().int().min(0).max(49);

const importMappingSchema = z.strictObject({
    supplierReference:
        mappingIndexSchema.optional(),
    designation:
        mappingIndexSchema.optional(),
    brand:
        mappingIndexSchema.optional(),
    containerType:
        mappingIndexSchema.optional(),
    unitCount:
        mappingIndexSchema.optional(),
    quantityPerUnit:
        mappingIndexSchema.optional(),
    unit:
        mappingIndexSchema.optional(),
    netWeight:
        mappingIndexSchema.optional(),
    netWeightUnit:
        mappingIndexSchema.optional(),
    drainedNetWeight:
        mappingIndexSchema.optional(),
    drainedNetWeightUnit:
        mappingIndexSchema.optional(),
    supplierLabel:
        mappingIndexSchema.optional(),
    priceAmount:
        mappingIndexSchema.optional(),
    priceBasis:
        mappingIndexSchema.optional(),
    currency:
        mappingIndexSchema.optional(),
}).refine(
    (value) =>
        Number.isInteger(
            value.supplierReference,
        )
        || Number.isInteger(
            value.designation,
        ),
    'La référence fournisseur ou la désignation doit être mappée.',
);

const importDefaultsSchema =
    z.strictObject({
        priceBasis:
            z.enum(
                Object.values(
                    SUPPLIER_PRICE_BASIS,
                ),
            ).optional(),
        currency:
            z.string()
                .trim()
                .toUpperCase()
                .regex(/^[A-Z]{3}$/)
                .default('EUR'),
    });

const importDecisionSchema =
    z.strictObject({
        rowNumber:
            z.number().int().min(2),
        supplierArticleId:
            objectIdSchema.optional(),
        productVariantId:
            objectIdSchema.optional(),
        ignore:
            z.boolean().optional()
                .default(false),
    }).superRefine(
        (value, context) => {
            const choices = [
                Boolean(
                    value.supplierArticleId,
                ),
                Boolean(
                    value.productVariantId,
                ),
                value.ignore,
            ].filter(Boolean).length;

            if (choices > 1) {
                context.addIssue({
                    code: 'custom',
                    message:
                        'Une seule décision est autorisée par ligne.',
                });
            }
        },
    );

const importPreviewBodySchema =
    z.strictObject({
        supplierId: objectIdSchema,
        edition: importEditionBodySchema,
        mapping: importMappingSchema,
        defaults:
            importDefaultsSchema
                .default({
                    currency: 'EUR',
                }),
        decisions:
            z.array(
                importDecisionSchema,
            ).max(5000)
                .optional()
                .default([]),
    });

export {
    catalogLineBodySchema,
    editionBodySchema,
    globalCatalogIdParamsSchema,
    globalImportIdParamsSchema,
    importPreviewBodySchema,
    listCatalogLinesQuerySchema,
    listCatalogQuerySchema,
    updateCatalogStatusBodySchema,
    workspaceCatalogIdParamsSchema,
    workspaceIdParamsSchema,
    workspaceImportIdParamsSchema,
};
