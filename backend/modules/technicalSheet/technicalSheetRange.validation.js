import { z } from 'zod';

import { objectIdSchema } from '../dossier/dossier.validation.js';

const workspaceRangeParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
});
const rangeParamsSchema = workspaceRangeParamsSchema.extend({
    rangeId: objectIdSchema,
});
const rangeListQuerySchema = z.strictObject({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
    search: z.string().trim().min(1).max(100).optional(),
});
const rangeNameSchema = z.string().trim().min(1).max(100);
const createRangeSchema = z.strictObject({ name: rangeNameSchema });
const updateRangeSchema = createRangeSchema.extend({
    expectedRevision: z.number().int().min(0),
});
const rangeRevisionSchema = z.strictObject({
    expectedRevision: z.number().int().min(0),
});
const deleteRangeSchema = rangeRevisionSchema.extend({
    confirmation: z.literal('DELETE'),
});
const assignRangeSchema = z.strictObject({
    expectedRevision: z.number().int().min(0),
    rangeId: objectIdSchema.nullable(),
});

export {
    assignRangeSchema,
    createRangeSchema,
    deleteRangeSchema,
    rangeListQuerySchema,
    rangeParamsSchema,
    rangeRevisionSchema,
    updateRangeSchema,
    workspaceRangeParamsSchema,
};
