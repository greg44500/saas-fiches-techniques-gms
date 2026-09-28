import { z } from 'zod';

import {
    INVOICED_PRICE_STATUS,
    NEGOTIATED_PRICE_STATUS,
    SUPPLIER_PRICE_BASIS,
    SUPPLIER_PRICING_POLICY_MODE,
} from './supplierCatalog.registry.js';

const objectIdSchema = z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'ObjectId invalide');

const dossierParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
    dossierId: objectIdSchema,
});

const negotiatedPriceParamsSchema =
    z.strictObject({
        workspaceId: objectIdSchema,
        dossierId: objectIdSchema,
        priceId: objectIdSchema,
    });

const invoicedPriceParamsSchema =
    negotiatedPriceParamsSchema;

const dossierReferenceParamsSchema =
    z.strictObject({
        workspaceId: objectIdSchema,
        dossierId: objectIdSchema,
        articleId: objectIdSchema,
    });

const workspaceIdParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
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

const currencySchema = z.string()
    .trim()
    .length(3)
    .transform(
        (value) =>
            value.toUpperCase(),
    )
    .refine(
        (value) =>
            /^[A-Z]{3}$/.test(value),
        {
            message:
                'Devise invalide.',
        },
    );

const sourcePriceFields = {
    sourceAmount:
        positiveDecimalSchema,
    sourceBasis:
        z.enum(
            Object.values(
                SUPPLIER_PRICE_BASIS,
            ),
        ),
    currency:
        currencySchema
            .optional()
            .default('EUR'),
    source:
        z.string().trim()
            .max(500)
            .nullable()
            .optional(),
};

const createNegotiatedPriceBodySchema =
    z.strictObject({
        articleId:
            objectIdSchema,
        ...sourcePriceFields,
        validFrom:
            z.coerce.date(),
        validTo:
            z.coerce.date()
                .nullable()
                .optional(),
    }).superRefine(
        (value, context) => {
            if (
                value.validTo
                && value.validTo
                    < value.validFrom
            ) {
                context.addIssue({
                    code: 'custom',
                    path: ['validTo'],
                    message:
                        'La fin de validité doit être postérieure ou égale au début.',
                });
            }
        },
    );

const listNegotiatedPriceQuerySchema =
    z.strictObject({
        articleId:
            objectIdSchema.optional(),
        status:
            z.enum(
                Object.values(
                    NEGOTIATED_PRICE_STATUS,
                ),
            ).optional(),
    });

const createInvoicedPriceBodySchema =
    z.strictObject({
        supplierId:
            objectIdSchema,
        articleId:
            objectIdSchema,
        invoiceDate:
            z.coerce.date(),
        ...sourcePriceFields,
    });

const listInvoicedPriceQuerySchema =
    z.strictObject({
        articleId:
            objectIdSchema.optional(),
        status:
            z.enum(
                Object.values(
                    INVOICED_PRICE_STATUS,
                ),
            ).optional(),
    });

const invoicedPriceDecisionBodySchema =
    z.strictObject({
        status:
            z.enum([
                INVOICED_PRICE_STATUS
                    .VALIDATED,
                INVOICED_PRICE_STATUS
                    .REJECTED,
            ]),
    });

const applicablePriceQuerySchema =
    z.strictObject({
        articleId:
            objectIdSchema.optional(),
        productVariantId:
            objectIdSchema.optional(),
        atDate:
            z.coerce.date().optional(),
    }).refine(
        (value) =>
            Boolean(
                value.articleId
                || value.productVariantId,
            ),
        {
            message:
                'articleId ou productVariantId est requis.',
        },
    );

const updatePricingPolicyBodySchema =
    z.strictObject({
        mode:
            z.enum(
                Object.values(
                    SUPPLIER_PRICING_POLICY_MODE,
                ),
            ),
    });

export {
    applicablePriceQuerySchema,
    createInvoicedPriceBodySchema,
    createNegotiatedPriceBodySchema,
    dossierParamsSchema,
    dossierReferenceParamsSchema,
    invoicedPriceDecisionBodySchema,
    invoicedPriceParamsSchema,
    listInvoicedPriceQuerySchema,
    listNegotiatedPriceQuerySchema,
    negotiatedPriceParamsSchema,
    updatePricingPolicyBodySchema,
    workspaceIdParamsSchema,
};
