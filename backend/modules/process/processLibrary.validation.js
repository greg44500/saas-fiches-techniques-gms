import { z } from 'zod';

import { objectIdSchema } from '../dossier/dossier.validation.js';

const titleSchema = z.string().trim().min(1).max(160);
const instructionsSchema = z.string().trim().max(5000).default('');
const durationSchema = z.strictObject({
    activeMinutes: z.number().int().min(0).max(10080).optional(),
    restMinutes: z.number().int().min(0).max(10080).optional(),
    treatmentMinutes: z.number().int().min(0).max(10080).optional(),
}).optional();

const stepDefinitionSchema = z.strictObject({
    title: titleSchema,
    instructions: instructionsSchema,
    duration: durationSchema,
    equipment: z.array(z.string().trim().min(1).max(160)).max(30).default([]),
    manufacturingVigilance: z.array(z.string().trim().min(1).max(1000))
        .max(30).default([]),
    qualityControls: z.array(z.strictObject({
        instruction: z.string().trim().min(1).max(1000),
        expectedCriterion: z.string().trim().max(1000).optional(),
        correctiveAction: z.string().trim().max(1000).optional(),
    })).max(30).default([]),
    sanitaryControls: z.array(z.strictObject({
        instruction: z.string().trim().min(1).max(1000),
        expectedCriterion: z.string().trim().max(1000).optional(),
        correctiveAction: z.string().trim().max(1000).optional(),
    })).max(30).default([]),
});

const phaseDefinitionSchema = z.strictObject({
    title: titleSchema,
    instructions: instructionsSchema,
    steps: z.array(stepDefinitionSchema).max(100),
});

const definitionSchema = z.union([
    stepDefinitionSchema,
    phaseDefinitionSchema,
]);

const workspaceParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
});
const dossierParamsSchema = workspaceParamsSchema.extend({
    dossierId: objectIdSchema,
});
const workspaceKindParamsSchema = workspaceParamsSchema.extend({
    kind: z.enum(['steps', 'phases']),
});
const dossierKindParamsSchema = dossierParamsSchema.extend({
    kind: z.enum(['steps', 'phases']),
});
const workspaceTemplateParamsSchema = workspaceKindParamsSchema.extend({
    templateId: objectIdSchema,
});
const dossierTemplateParamsSchema = dossierKindParamsSchema.extend({
    templateId: objectIdSchema,
});

const listTemplatesQuerySchema = z.strictObject({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
    status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
    search: z.string().trim().min(1).max(120).optional(),
});
const historyQuerySchema = z.strictObject({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
});
const createTemplateSchema = z.strictObject({
    definition: definitionSchema,
});
const updateTemplateSchema = createTemplateSchema.extend({
    expectedRevision: z.number().int().min(0),
});
const revisionMutationSchema = z.strictObject({
    expectedRevision: z.number().int().min(0),
});

export {
    createTemplateSchema,
    definitionSchema,
    dossierKindParamsSchema,
    dossierTemplateParamsSchema,
    historyQuerySchema,
    listTemplatesQuerySchema,
    phaseDefinitionSchema,
    revisionMutationSchema,
    stepDefinitionSchema,
    updateTemplateSchema,
    workspaceKindParamsSchema,
    workspaceTemplateParamsSchema,
};
