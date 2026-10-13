import { describe, expect, it } from 'vitest';

import {
    correctArticlePriceBodySchema,
} from '../../../modules/supplierCatalog/supplierTariffRevision.validation.js';

describe('M-003 — motif facultatif de correction tarifaire', () => {
    const valid = { sourceAmount: '12.50', sourceBasis: 'PACKAGE' };

    it('accepte motif absent, vide ou court et normalise les absences à null', () => {
        expect(correctArticlePriceBodySchema.parse(valid).reason).toBeNull();
        expect(correctArticlePriceBodySchema.parse({
            ...valid, reason: '   ',
        }).reason).toBeNull();
        expect(correctArticlePriceBodySchema.parse({
            ...valid, reason: 'A',
        }).reason).toBe('A');
    });

    it('continue à refuser les montants invalides et motifs trop longs', () => {
        expect(correctArticlePriceBodySchema.safeParse({
            ...valid, sourceAmount: '0',
        }).success).toBe(false);
        expect(correctArticlePriceBodySchema.safeParse({
            ...valid, reason: 'x'.repeat(501),
        }).success).toBe(false);
    });
});
