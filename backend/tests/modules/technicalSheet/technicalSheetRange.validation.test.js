import { describe, expect, it } from 'vitest';

import {
    assignRangeSchema,
    createRangeSchema,
    deleteRangeSchema,
    rangeListQuerySchema,
    rangeSuggestionsQuerySchema,
} from '../../../modules/technicalSheet/technicalSheetRange.validation.js';
import { normalizeRangeName } from '../../../modules/technicalSheet/technicalSheetRange.service.js';

describe('M-004 Gammes — entrées strictes et normalisation', () => {
    const rangeId = '507f1f77bcf86cd799439011';

    it('uniformise les espaces et la casse, sans fusionner des mots distincts', () => {
        expect(normalizeRangeName('  SnaCKING    froid  ')).toBe('snacking froid');
        expect(normalizeRangeName('Pâtisserie')).toBe('pâtisserie');
        expect(normalizeRangeName('Patisserie')).not.toBe(normalizeRangeName('Pâtisserie'));
    });

    it('refuse les noms vides, trop longs et les propriétés inattendues', () => {
        expect(createRangeSchema.safeParse({ name: '  ' }).success).toBe(false);
        expect(createRangeSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false);
        expect(createRangeSchema.safeParse({ name: 'Snacking', dossierId: rangeId }).success).toBe(false);
    });

    it('valide la confirmation des suggestions et filtre les propriétés inattendues', () => {
        expect(createRangeSchema.parse({ name: 'Snacking' }))
            .toEqual({ name: 'Snacking', reviewedCandidateIds: [] });
        expect(createRangeSchema.safeParse({
            name: 'Snacking', reviewedCandidateIds: ['incorrect'],
        }).success).toBe(false);
        expect(rangeSuggestionsQuerySchema.safeParse({ name: '' }).success).toBe(false);
        expect(rangeSuggestionsQuerySchema.parse({ name: 'Traiteur' }).name)
            .toBe('Traiteur');
    });

    it('accepte Sans gamme mais refuse les identifiants invalides', () => {
        expect(assignRangeSchema.parse({ expectedRevision: 2, rangeId: null }))
            .toEqual({ expectedRevision: 2, rangeId: null });
        expect(assignRangeSchema.parse({ expectedRevision: 2, rangeId }).rangeId).toBe(rangeId);
        expect(assignRangeSchema.safeParse({ expectedRevision: -1, rangeId }).success).toBe(false);
        expect(assignRangeSchema.safeParse({ expectedRevision: 0, rangeId: 'autre' }).success).toBe(false);
    });

    it('exige une confirmation explicite de suppression', () => {
        expect(deleteRangeSchema.safeParse({ expectedRevision: 0 }).success).toBe(false);
        expect(deleteRangeSchema.parse({ expectedRevision: 0, confirmation: 'DELETE' }).confirmation).toBe('DELETE');
    });

    it('valide pagination et filtre serveur', () => {
        expect(rangeListQuerySchema.parse({})).toMatchObject({ page: 1, limit: 50 });
        expect(rangeListQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    });
});
