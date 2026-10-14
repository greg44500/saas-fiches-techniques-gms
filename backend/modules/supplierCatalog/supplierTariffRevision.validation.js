import { z } from 'zod';

import { SUPPLIER_PRICE_BASIS } from './supplierCatalog.registry.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Identifiant invalide');

const articleTariffParamsSchema = z.strictObject({
    workspaceId: objectId,
    articleId: objectId,
});
const articleTariffRevisionParamsSchema = z.strictObject({
    workspaceId: objectId,
    articleId: objectId,
    tariffId: objectId,
});
const correctArticleTariffPeriodBodySchema = z.strictObject({
    validFrom: z.iso.date(),
    validTo: z.iso.date().nullable(),
    reason: z.string().trim().max(500).nullish().transform((value) => value || null),
}).refine(({ validFrom, validTo }) => !validTo || validFrom <= validTo, {
    path: ['validTo'],
    message: 'La fin de validité ne peut pas précéder le début.',
});

const correctArticlePriceBodySchema = z.strictObject({
    sourceAmount: z.string().trim()
        .regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, 'Montant décimal invalide')
        .refine((value) => Number(value) > 0 && Number.isFinite(Number(value)),
            'Le prix doit être strictement positif.'),
    sourceBasis: z.enum(Object.values(SUPPLIER_PRICE_BASIS)),
    reason: z.string().trim().max(500).nullish()
        .transform((value) => value || null),
});

export {
    articleTariffParamsSchema,
    articleTariffRevisionParamsSchema,
    correctArticlePriceBodySchema,
    correctArticleTariffPeriodBodySchema,
};
