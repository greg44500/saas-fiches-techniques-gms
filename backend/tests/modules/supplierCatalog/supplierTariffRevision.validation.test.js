import { describe, expect, it } from 'vitest';

import {
    correctArticlePriceBodySchema,
    correctArticleTariffPeriodBodySchema,
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

    it('valide une correction de période avec fin facultative et rejette les dates inversées', () => {
        expect(correctArticleTariffPeriodBodySchema.parse({
            validFrom: '2026-10-13', validTo: null,
        }).reason).toBeNull();
        expect(correctArticleTariffPeriodBodySchema.safeParse({
            validFrom: '2026-10-14', validTo: '2026-10-13',
        }).success).toBe(false);
        expect(correctArticleTariffPeriodBodySchema.safeParse({
            validFrom: '2026-02-30', validTo: null,
        }).success).toBe(false);
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
