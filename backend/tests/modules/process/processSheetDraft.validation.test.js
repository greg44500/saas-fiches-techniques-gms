import { describe, expect, it } from 'vitest';
import { saveProcessSheetDraftSchema } from '../../../modules/process/processSheetDraft.validation.js';

const id = (suffix) => 'editor-item-' + suffix;
const step = (overrides = {}) => ({
    id: id('step1'), title: 'Cuisson', instructions: '',
    ingredientLineKeys: ['line:a'],
    duration: { activeMinutes: 12, restMinutes: 5, treatmentMinutes: 30 },
    equipment: ['Four'], manufacturingVigilance: [],
    qualityControls: [], sanitaryControls: [], ...overrides,
});
const phase = (overrides = {}) => ({
    id: id('phase1'), title: 'Préparation', instructions: '',
    ingredientLineKeys: [], steps: [step()], ...overrides,
});
const draft = (overrides = {}) => ({
    expectedRevision: 0,
    phases: [phase()],
    unassignedReasons: [], ...overrides,
});

describe('M-006 — contrat fermé de sauvegarde des phases et étapes', () => {
    it('accepte des phases, étapes et durées structurées avec affectations stables', () => {
        expect(saveProcessSheetDraftSchema.safeParse(draft()).success).toBe(true);
        expect(saveProcessSheetDraftSchema.safeParse(draft({ phases: [] })).success).toBe(true);
    });
    it('refuse les médias, les champs inconnus et les durées ou températures invalides', () => {
        for (const altered of [
            step({ photoUrl: 'http://a.example/file.jpg' }),
            step({ duration: { activeMinutes: -1 } }),
            step({ duration: { restMinutes: 1.25 } }),
            step({ temperatureCelsius: 700 }),
            step({ qualityControls: [{ instruction: '', photoId: 'a' }] }),
        ]) {
            expect(saveProcessSheetDraftSchema.safeParse(
                draft({ phases: [phase({ steps: [altered] })] }),
            ).success).toBe(false);
        }
        expect(saveProcessSheetDraftSchema.safeParse({
            ...draft(), priceHT: 34,
        }).success).toBe(false);
    });
    it('refuse les identifiants et affectations en doublon dans une même unité', () => {
        expect(saveProcessSheetDraftSchema.safeParse(
            draft({ phases: [phase({ steps: [step(), step()] })] }),
        ).success).toBe(false);
        expect(saveProcessSheetDraftSchema.safeParse(
            draft({ phases: [phase({ ingredientLineKeys: ['line:a', 'line:a'] })] }),
        ).success).toBe(false);
        expect(saveProcessSheetDraftSchema.safeParse(
            draft({ unassignedReasons: [{ lineKey: 'line:z', reason: 'x' }, { lineKey: 'line:z', reason: 'y' }] }),
        ).success).toBe(false);
    });
    it('accepte la même ligne M-004 dans une phase et plusieurs étapes, sans fusionner les occurrences', () => {
        expect(saveProcessSheetDraftSchema.safeParse(draft({
            phases: [phase({
                ingredientLineKeys: ['line:a'],
                steps: [step(), step({ id: id('step2') })],
            })],
        })).toMatchObject({ success: true });
    });
    it('exige une révision optimiste entière et un motif non vide', () => {
        expect(saveProcessSheetDraftSchema.safeParse(draft({
            expectedRevision: -1,
        })).success).toBe(false);
        expect(saveProcessSheetDraftSchema.safeParse(draft({
            unassignedReasons: [{ lineKey: 'line:z', reason: '   ' }],
        })).success).toBe(false);
    });
});
