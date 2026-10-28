import { describe, expect, it } from 'vitest';

import {
    applyReconciliationMappings, buildReconciliationPlan,
} from '../../../modules/process/processSheetReconciliation.js';
import { TECHNICAL_SHEET_LINE_KIND } from '../../../modules/technicalSheet/technicalSheet.registry.js';

const line = (id, variant, name, quantity = '1', order = 0) => ({
    kind: TECHNICAL_SHEET_LINE_KIND.INGREDIENT,
    sourceLineId: id,
    productVariantId: variant,
    productVariantName: name,
    netQuantity: quantity, inputUnit: 'KG',
    order, optimization: { locked: false },
});
const validation = (id, lines) => ({
    _id: id,
    sheetSnapshot: {
        productionQuantity: '10', productionUnit: 'UNIT',
        portionsPerProductionUnit: '1',
    },
    linesSnapshot: lines,
});
const phase = (keys) => ({
    id: 'phase-abc12345', title: 'Préparer', instructions: '',
    ingredientLineKeys: [],
    steps: [{
        id: 'step-abc12345', title: 'Assembler', instructions: 'Assembler les ingrédients',
        ingredientLineKeys: keys,
    }],
});
const draft = (keys) => ({ phases: [phase(keys)], unassignedReasons: [] });

describe('M-006 — rapprochement de validations officielles M-004', () => {
    it('reconnaît une simple revalorisation et une occurrence unique sans partager son ancien identifiant', () => {
        const old = validation('old', [line('old-id', 'variant-a', 'Aubergine')]);
        const current = validation('new', [line('new-id', 'variant-a', 'Aubergine')]);
        const plan = buildReconciliationPlan({
            previous: old, current, draft: draft(['line:old-id']),
        });
        expect(plan.compositionChanged).toBe(false);
        expect(plan.unresolvedCount).toBe(0);
        expect(plan.assignments[0].proposedTo).toBe('line:new-id');
        const mapped = applyReconciliationMappings({ draft: draft(['line:old-id']), plan });
        expect(mapped.phases[0].steps[0].ingredientLineKeys).toEqual(['line:new-id']);
    });

    it('exige une décision quand une quantité change et ne détruit pas les instructions', () => {
        const previous = validation('old', [line('old-id', 'variant-a', 'Aubergine')]);
        const current = validation('new', [line('new-id', 'variant-a', 'Aubergine', '2')]);
        const original = draft(['line:old-id']);
        const plan = buildReconciliationPlan({ previous, current, draft: original });
        expect(plan.compositionChanged).toBe(true);
        expect(plan.unresolvedCount).toBe(1);
        expect(() => applyReconciliationMappings({ draft: original, plan })).toThrow('MAPPING_REQUIRED');
        const applied = applyReconciliationMappings({
            draft: original, plan, decisions: [{ from: 'line:old-id', to: 'line:new-id' }],
        });
        expect(applied.phases[0].steps[0].instructions).toBe('Assembler les ingrédients');
        expect(applied.phases[0].steps[0].ingredientLineKeys).toEqual(['line:new-id']);
        expect(original.phases[0].steps[0].ingredientLineKeys).toEqual(['line:old-id']);
    });

    it('ne déduit pas l’identité de deux occurrences d’une même référence produit', () => {
        const before = validation('old', [
            line('old-1', 'variant-a', 'Aubergine', '1', 0),
            line('old-2', 'variant-a', 'Aubergine', '1', 1),
        ]);
        const after = validation('new', [
            line('new-1', 'variant-a', 'Aubergine', '1', 0),
            line('new-2', 'variant-a', 'Aubergine', '1', 1),
        ]);
        const original = draft(['line:old-1', 'line:old-2']);
        const plan = buildReconciliationPlan({ previous: before, current: after, draft: original });
        expect(plan.compositionChanged).toBe(false);
        expect(plan.unresolvedCount).toBe(2);
        expect(() => applyReconciliationMappings({
            draft: original, plan, decisions: [
                { from: 'line:old-1', to: 'line:new-1' },
                { from: 'line:old-2', to: 'line:new-1' },
            ],
        })).toThrow('DUPLICATE_MAPPING');
    });

    it('ne supprime une affectation obsolète que sur décision explicite', () => {
        const before = validation('old', [line('old-id', 'variant-a', 'Aubergine')]);
        const after = validation('new', []);
        const original = draft(['line:old-id']);
        const plan = buildReconciliationPlan({ previous: before, current: after, draft: original });
        expect(() => applyReconciliationMappings({ draft: original, plan })).toThrow('MAPPING_REQUIRED');
        const applied = applyReconciliationMappings({
            draft: original, plan, decisions: [{ from: 'line:old-id', to: null }],
        });
        expect(applied.phases[0].steps[0].ingredientLineKeys).toEqual([]);
    });

    it('rejette les cibles ou les anciennes clés non autorisées', () => {
        const old = validation('old', [line('old-id', 'variant-a', 'Aubergine')]);
        const current = validation('new', [line('new-id', 'variant-a', 'Aubergine', '2')]);
        const original = draft(['line:old-id']);
        const plan = buildReconciliationPlan({ previous: old, current, draft: original });
        expect(() => applyReconciliationMappings({
            draft: original, plan, decisions: [{ from: 'line:old-id', to: 'other-tenant' }],
        })).toThrow('INVALID_MAPPING');
        expect(() => applyReconciliationMappings({
            draft: original, plan, decisions: [{ from: 'unknown-line', to: 'line:new-id' }],
        })).toThrow('INVALID_MAPPING');
    });
});
