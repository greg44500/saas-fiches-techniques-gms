import { z } from 'zod';
import { objectIdSchema } from '../dossier/dossier.validation.js';

const dossierParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
    dossierId: objectIdSchema,
});

const processParamsSchema = dossierParamsSchema.extend({
    processSheetId: objectIdSchema,
});

const processListQuerySchema = z.strictObject({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
    search: z.string().trim().min(1).max(120).optional(),
});

const eligibleTechnicalSheetQuerySchema = z.strictObject({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(120).optional(),
});

const processCreateSchema = z.strictObject({
    title: z.string().trim().min(1).max(160),
    technicalSheetId: objectIdSchema,
});

export { saveProcessSheetDraftSchema } from './processSheetDraft.validation.js';

export {
    dossierParamsSchema,
    processParamsSchema,
    processListQuerySchema,
    eligibleTechnicalSheetQuerySchema,
    processCreateSchema,
};
