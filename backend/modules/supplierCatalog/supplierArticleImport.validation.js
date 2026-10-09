import { z } from 'zod';
import { importMappingSchema } from './supplierCatalog.validation.js';

const articleImportPreviewBodySchema = z.strictObject({
    supplierId: z.string().regex(/^[0-9a-f]{24}$/i, 'ObjectId invalide'),
    mapping: importMappingSchema,
});
export { articleImportPreviewBodySchema };
