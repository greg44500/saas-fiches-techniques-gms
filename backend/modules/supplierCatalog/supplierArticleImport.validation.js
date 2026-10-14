import { z } from 'zod';
import { importMappingSchema } from './supplierCatalog.validation.js';

const priceBasis = z.enum(['PACKAGE', 'G', 'KG', 'ML', 'CL', 'L', 'UNIT']);
const priceListSchema = z.strictObject({
    validityMode: z.enum(['FROM_IMPORT', 'DEFINED']).optional(),
    name: z.string().trim().min(1).max(180).optional(),
    validFrom: z.iso.date().optional(),
    validTo: z.iso.date().nullable().optional(),
    source: z.string().trim().max(240).nullable().optional(),
    defaultPriceBasis: priceBasis,
}).superRefine((value, context) => {
    if (value.validityMode === 'FROM_IMPORT') {
        if (value.validFrom || value.validTo) {
            context.addIssue({
                code: 'custom',
                path: ['validFrom'],
                message: 'La date de début d’un prix sans période est définie par le serveur.',
            });
        }
        return;
    }

    // Les imports historiques sans validityMode restent compatibles.
    if (!value.name) {
        context.addIssue({
            code: 'custom', path: ['name'],
            message: 'Précisez la référence de la liste de prix.',
        });
    }
    if (!value.validFrom) {
        context.addIssue({
            code: 'custom', path: ['validFrom'],
            message: 'Indiquez le début de la période tarifaire.',
        });
    }
    if (value.validFrom && value.validTo && value.validTo < value.validFrom) {
        context.addIssue({
            code: 'custom', path: ['validTo'],
            message: 'La fin de validité précède la date de début.',
        });
    }
});

const articleImportPreviewBodySchema = z.strictObject({
    supplierId: z.string().regex(/^[0-9a-f]{24}$/i, 'ObjectId invalide'),
    mapping: importMappingSchema,
    priceList: priceListSchema.optional(),
});

export { articleImportPreviewBodySchema };
