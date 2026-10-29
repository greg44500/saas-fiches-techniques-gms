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

// Inspect actual content-stream coordinates rather than only the file header.
const pdfCommands = (pdf) => pdf.toString('latin1');
const inlineTextAt = (raw, text) => {
    const hex = encodeWinAnsiHex(text);
    const re = new RegExp('1 0 0 1 (\\d+(?:\\.\\d+)?) (\\d+(?:\\.\\d+)?) Tm <' + hex + '> Tj ET');
    const match = raw.match(re);
    return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
};

describe('M-006 — génération PDF multi-pages', () => {
    it('imprime la seule fiche de fabrication, sans métadonnées inutiles', () => {
        const pdf = make([phase([step()])], { editorialState: 'VALIDATED', validatedAt: new Date() });
        const raw = pdfCommands(pdf);
        expect(raw.startsWith('%PDF-1.4')).toBe(true);
        expect(raw).toContain('/MediaBox [0 0 595.28 841.89]');
        expect(raw).toContain(encodeWinAnsiHex('PHASE 01'));
        expect(raw).toContain(encodeWinAnsiHex('ÉTAPE 01.01'));
        expect(raw).toContain(encodeWinAnsiHex('Préparation de bœuf à l’échalote'));
        for (const excluded of [
            'Bœuf en sauce', 'Magasin pilote', 'FICHE VALIDÉE', 'Validation :',
            '1 phase(s)', 'INGRÉDIENTS NON AFFECTÉS', 'Farine',
        ]) expect(raw).not.toContain(encodeWinAnsiHex(excluded));
        expect(raw).toContain('startxref');
        expect(raw.endsWith('%%EOF')).toBe(true);
    });

    it('intègre les ingrédients aux consignes et décale toutes les étapes de 12 mm', () => {
        const prepared = phase([step()]);
        prepared.instructions = 'Décongeler les produits.';
        prepared.ingredientLineKeys = ['line:one'];
        const raw = pdfCommands(make([prepared]));
        const phaseText = 'Décongeler les produits : Échalote';
        const stepText = 'Cuire à feu doux. Vérifier la température à cœur : Échalote';
        expect(raw).toContain(encodeWinAnsiHex(phaseText));
        expect(raw).toContain(encodeWinAnsiHex(stepText));
        expect(raw).not.toContain(encodeWinAnsiHex('Ingrédients de la phase'));
        // wrapText normalise les espaces des titres avant leur encodage PDF.
        const phaseHeading = inlineTextAt(raw, 'PHASE 01 | Préparation');
        const stepHeading = inlineTextAt(raw, 'ÉTAPE 01.01 | Cuisson et contrôle');
        const phaseInstruction = inlineTextAt(raw, phaseText);
        const stepInstruction = inlineTextAt(raw, stepText);
        expect(phaseHeading).toBeTruthy();
        expect(stepHeading).toBeTruthy();
        expect(phaseInstruction).toBeTruthy();
        expect(stepInstruction).toBeTruthy();
        expect(stepHeading.x - phaseHeading.x).toBe(34);
        expect(stepInstruction.x - phaseInstruction.x).toBe(37);
        expect(inlineTextAt(raw, 'CONTRÔLES QUALITÉ').x).toBeGreaterThan(phaseHeading.x);
    });

    it('imprime les ingrédients si une consigne est vide et garde les occurrences dupliquées', () => {
        const prepared = phase([step()]);
        prepared.instructions = '';
        prepared.ingredientLineKeys = ['line:one', 'line:one'];
        const raw = pdfCommands(make([prepared]));
        expect(raw).toContain(encodeWinAnsiHex('Ingrédients : Échalote, Échalote'));
    });

    it('signale le brouillon non validé et les archives sans bandeau de validation', () => {
        const draft = pdfCommands(make([phase([step()])]));
        expect(draft).toContain(encodeWinAnsiHex('BROUILLON — DOCUMENT NON VALIDÉ'));
        const archived = pdfCommands(make([phase([step()])], {
            editorialState: 'VALIDATED', status: 'ARCHIVED',
        }));
        expect(archived).toContain(encodeWinAnsiHex('ARCHIVÉE'));
        expect(archived).not.toContain(encodeWinAnsiHex('FICHE VALIDÉE'));
    });

    it('pagine les instructions longues et conserve la hiérarchie sur plusieurs pages', () => {
        const longStep = { ...step(), instructions: 'Consigne de fabrication très détaillée. '.repeat(300) };
        const pdf = make([phase([longStep, longStep, longStep])], {
            editorialState: 'VALIDATED', validatedAt: new Date('2026-10-27T10:00:00Z'),
        });
        const raw = pdfCommands(pdf);
        const count = Number(raw.match(/\/Type \/Pages \/Count (\d+)/)?.[1]);
        expect(count).toBeGreaterThan(1);
        expect((raw.match(/\/Type \/Page \/Parent/g) ?? [])).toHaveLength(count);
        expect((raw.match(/Page /g) ?? []).length).toBeGreaterThanOrEqual(count);
        expect(raw).not.toContain(encodeWinAnsiHex('FICHE VALIDÉE'));
    });

    it('conserve les retours à la ligne et refuse un document incomplet', () => {
        expect(wrapText('A\nB', 400)).toEqual(['A', 'B']);
        expect(() => buildProcessSheetPdf({
            process, draft: null, sourceIngredients: { lines: [] },
        })).toThrow(TypeError);
    });
});
