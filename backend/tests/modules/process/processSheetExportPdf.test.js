import { describe, expect, it } from 'vitest';

import { encodeWinAnsiHex } from '../../../modules/technicalSheet/technicalSheetExportPdf.service.js';
import {
    buildProcessSheetPdf, wrapText,
} from '../../../modules/process/processSheetExportPdf.service.js';

const process = {
    title: 'Préparation de bœuf à l’échalote',
    technicalSheetName: 'Bœuf en sauce',
    editorialState: 'DRAFT',
    status: 'ACTIVE',
    validatedAt: null,
};
const ingredient = {
    lineKey: 'line:one',
    productVariantName: 'Échalote',
};
const step = (number = 1) => ({
    id: 'step-' + number,
    title: 'Cuisson et contrôle',
    instructions: 'Cuire à feu doux. Vérifier la température à cœur.',
    ingredientLineKeys: ['line:one'],
    duration: { activeMinutes: 15, treatmentMinutes: 40 },
    temperatureCelsius: 72,
    equipment: ['Marmite'],
    manufacturingVigilance: ['Remuer régulièrement'],
    qualityControls: [{ instruction: 'Texture', expectedCriterion: 'Souple', correctiveAction: 'Prolonger' }],
    sanitaryControls: [{ instruction: 'Température à cœur', expectedCriterion: '72 °C' }],
});
const make = (phases, overrides = {}) => buildProcessSheetPdf({
    process: { ...process, ...overrides },
    draft: { phases, unassignedReasons: [] },
    sourceIngredients: { lines: [ingredient, { lineKey: 'line:two', productVariantName: 'Farine' }] },
    dossierName: 'Magasin pilote',
    generatedAt: new Date('2026-10-29T12:00:00.000Z'),
});
const phase = (steps) => ({
    id: 'phase-1', title: 'Préparation', instructions: 'Mettre en place.',
    ingredientLineKeys: [], steps,
});

describe('M-006 — génération PDF multi-pages', () => {
    it('produit un PDF A4 portrait et identifie le brouillon et ses phases/étapes', () => {
        const pdf = make([phase([step()])]);
        const raw = pdf.toString('latin1');
        expect(raw.startsWith('%PDF-1.4')).toBe(true);
        expect(raw).toContain('/MediaBox [0 0 595.28 841.89]');
        expect(raw).toContain(encodeWinAnsiHex('PHASE 01'));
        expect(raw).toContain(encodeWinAnsiHex('ETAPE 01.01'));
        expect(raw).toContain(encodeWinAnsiHex('BROUILLON — DOCUMENT NON VALIDÉ'));
        expect(raw).toContain(encodeWinAnsiHex('Cuire à feu doux.'));
        expect(raw).toContain(encodeWinAnsiHex('Échalote'));
        expect(raw).toContain(encodeWinAnsiHex('Farine'));
        expect(raw).toContain('startxref');
        expect(raw.endsWith('%%EOF')).toBe(true);
    });

    it('pagine réellement les instructions longues, avec un pied sur chaque page', () => {
        const longStep = { ...step(), instructions: 'Consigne de fabrication très détaillée. '.repeat(300) };
        const pdf = make([phase([longStep, longStep, longStep])], {
            editorialState: 'VALIDATED', validatedAt: new Date('2026-10-27T10:00:00Z'),
        });
        const raw = pdf.toString('latin1');
        const count = Number(raw.match(/\/Type \/Pages \/Count (\d+)/)?.[1]);
        expect(count).toBeGreaterThan(1);
        expect((raw.match(/\/Type \/Page \/Parent/g) ?? [])).toHaveLength(count);
        expect((raw.match(/Page /g) ?? []).length).toBeGreaterThanOrEqual(count);
        expect(raw).toContain(encodeWinAnsiHex('FICHE VALIDÉE'));
    });

    it('conserve les retours à la ligne et ne crée pas de document sans données', () => {
        expect(wrapText('A\nB', 400)).toEqual(['A', 'B']);
        expect(() => buildProcessSheetPdf({
            process, draft: null, sourceIngredients: { lines: [] },
        })).toThrow(TypeError);
    });
});
