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
};
