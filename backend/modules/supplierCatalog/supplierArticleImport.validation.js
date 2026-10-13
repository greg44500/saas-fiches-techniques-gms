import { z } from 'zod';
import { importMappingSchema } from './supplierCatalog.validation.js';

const articleImportPreviewBodySchema = z.strictObject({
    supplierId: z.string().regex(/^[0-9a-f]{24}$/i, 'ObjectId invalide'),
    mapping: importMappingSchema,
    priceList: z.strictObject({
        name: z.string().trim().min(1).max(180),
        validFrom: z.iso.date(),
        validTo: z.iso.date().nullable(),
        source: z.string().trim().max(240).nullable(),
        defaultPriceBasis: z.enum(['PACKAGE', 'G', 'KG', 'ML', 'CL', 'L', 'UNIT']),
    }).optional(),
}).superRefine((body, context) => {
    if (body.priceList?.validTo && body.priceList.validTo < body.priceList.validFrom) {
        context.addIssue({
            code: 'custom', path: ['priceList', 'validTo'],
            message: 'La fin de validité précède la date de début.',
        });
    }
});
export { articleImportPreviewBodySchema };
