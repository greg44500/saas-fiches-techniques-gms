import { describe, expect, it } from 'vitest';

import {
    createTemplateSchema,
    dossierTemplateParamsSchema,
    phaseDefinitionSchema,
    stepDefinitionSchema,
    updateTemplateSchema,
} from '../../../modules/process/processLibrary.validation.js';

describe('M-006 — validation stricte des bibliothèques', () => {
    it('rejette les définitions incompatibles avec le type métier', () => {
        const step = { title: 'Cuisson' };
        const phase = { title: 'Cuisson', steps: [step] };
        expect(stepDefinitionSchema.safeParse(step).success).toBe(true);
        expect(phaseDefinitionSchema.safeParse(phase).success).toBe(true);
        expect(stepDefinitionSchema.safeParse(phase).success).toBe(false);
        expect(phaseDefinitionSchema.safeParse(step).success).toBe(false);
        expect(phaseDefinitionSchema.safeParse({
            title: 'Cuisson', steps: [],
        }).success).toBe(true);
        expect(phaseDefinitionSchema.safeParse({ title: 'Cuisson' }).success)
            .toBe(false);
    });

    it('rejette les champs inconnus, médias et valeurs négatives', () => {
        const invalid = [
            { title: 'Cuisson', imageUrl: '/a.jpg' },
            { title: 'Cuisson', duration: { activeMinutes: -1 } },
            { title: 'Cuisson', duration: { restMinutes: 0.5 } },
            { title: 'Cuisson', equipment: ['Four'], photo: 'image' },
            { title: 'Cuisson', qualityControls: [{ instruction: '' }] },
        ];
        for (const definition of invalid) {
            expect(createTemplateSchema.safeParse({ definition }).success)
                .toBe(false);
        }
        expect(createTemplateSchema.safeParse({
            definition: { title: 'Cuisson' }, additional: 'interdit',
        }).success).toBe(false);
    });

    it('exige une révision optimiste entière positive ou nulle', () => {
        const payload = { definition: { title: 'Cuisson' } };
        expect(updateTemplateSchema.safeParse({
            ...payload, expectedRevision: 0,
        }).success).toBe(true);
        for (const expectedRevision of [-1, 0.5, '0', null]) {
            expect(updateTemplateSchema.safeParse({
                ...payload, expectedRevision,
            }).success).toBe(false);
        }
    });

    it('isole strictement les paramètres Dossier et types acceptés', () => {
        const valid = {
            workspaceId: 'a'.repeat(24),
            dossierId: 'b'.repeat(24),
            templateId: 'c'.repeat(24),
            kind: 'steps',
        };
        expect(dossierTemplateParamsSchema.safeParse(valid).success)
            .toBe(true);
        expect(dossierTemplateParamsSchema.safeParse({
            ...valid, kind: 'images',
        }).success).toBe(false);
        expect(dossierTemplateParamsSchema.safeParse({
            ...valid, workspaceId: 'invalide',
        }).success).toBe(false);
    });
});
