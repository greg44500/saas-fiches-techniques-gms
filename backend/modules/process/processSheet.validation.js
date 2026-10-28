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

const validateProcessSheetSchema = z.strictObject({
    expectedRevision: z.number().int().min(0),
});

// A null target explicitly removes an obsolete association. Unknown keys and
// repeated mappings are validated against the two official M-004 snapshots.
const reconcileProcessSheetSchema = z.strictObject({
    expectedRevision: z.number().int().min(0),
    expectedDraftRevision: z.number().int().min(0),
    currentValidationId: objectIdSchema,
    decisions: z.array(z.strictObject({
        from: z.string().min(1).max(110),
        to: z.string().min(1).max(110).nullable(),
    })).max(200),
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
    validateProcessSheetSchema,
    reconcileProcessSheetSchema,
};
