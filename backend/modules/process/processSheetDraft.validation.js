import { z } from 'zod';

const label = z.string().trim().min(1).max(160);
const instructions = z.string().trim().max(5000).default('');
const key = z.string().min(1).max(110);
const keys = z.array(key).max(200).default([]);
const control = z.strictObject({
    instruction: z.string().trim().min(1).max(1000),
    expectedCriterion: z.string().trim().max(1000).optional(),
    correctiveAction: z.string().trim().max(1000).optional(),
});
const duration = z.strictObject({
    activeMinutes: z.number().int().min(0).max(10080).optional(),
    restMinutes: z.number().int().min(0).max(10080).optional(),
    treatmentMinutes: z.number().int().min(0).max(10080).optional(),
}).optional();
const step = z.strictObject({
    id: z.string().trim().min(8).max(80),
    title: label,
    instructions,
    ingredientLineKeys: keys,
    duration,
    temperatureCelsius: z.number().min(-100).max(350).nullable().optional(),
    equipment: z.array(label).max(30).default([]),
    manufacturingVigilance: z.array(z.string().trim().min(1).max(1000)).max(30).default([]),
    qualityControls: z.array(control).max(30).default([]),
    sanitaryControls: z.array(control).max(30).default([]),
});
const phase = z.strictObject({
    id: z.string().trim().min(8).max(80),
    title: label,
    instructions,
    ingredientLineKeys: keys,
    steps: z.array(step).max(40).default([]),
});
const reason = z.strictObject({
    lineKey: key,
    reason: z.string().trim().min(1).max(1000),
});
const saveProcessSheetDraftSchema = z.strictObject({
    expectedRevision: z.number().int().min(0),
    phases: z.array(phase).max(40),
    unassignedReasons: z.array(reason).max(200).default([]),
}).superRefine((draft, ctx) => {
    const ids = new Set();
    const check = (id, path) => {
        if (ids.has(id)) ctx.addIssue({
            code: 'custom', path, message: 'Identifiant de phase ou étape répété.',
        });
        ids.add(id);
    };
    const allKeys = (items, path) => {
        if (new Set(items).size !== items.length) ctx.addIssue({
            code: 'custom', path, message: 'Affectation répétée dans un même élément.',
        });
    };
    draft.phases.forEach((p, i) => {
        check(p.id, ['phases', i, 'id']);
        allKeys(p.ingredientLineKeys, ['phases', i, 'ingredientLineKeys']);
        p.steps.forEach((s, j) => {
            check(s.id, ['phases', i, 'steps', j, 'id']);
            allKeys(s.ingredientLineKeys, ['phases', i, 'steps', j, 'ingredientLineKeys']);
        });
    });
    const reasonKeys = draft.unassignedReasons.map(({ lineKey }) => lineKey);
    allKeys(reasonKeys, ['unassignedReasons']);
});

export { saveProcessSheetDraftSchema };
