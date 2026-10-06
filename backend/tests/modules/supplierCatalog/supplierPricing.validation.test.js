import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    indicativePriceBodySchema,
} from '../../../modules/supplierCatalog/supplierPricing.validation.js';

describe('M-003 indicative price validation', () => {
    it('accepte un relevé au conditionnement avec provenance structurée', () => {
        const result = indicativePriceBodySchema.safeParse({
            sourceAmount: '16',
            sourceBasis: 'PACKAGE',
            packaging: {
                containerType: 'Carton',
                unitCount: 8,
                quantityPerUnit: '4',
                unit: 'UNIT',
                netWeight: '3200',
                netWeightUnit: 'G',
                supplierLabel:
                    '1 carton = 8 paquets × 4 tranches de 100 g',
            },
            source: 'Relevé documenté',
            sourceOrganization: 'Catalogue professionnel vérifié',
            sourceUrl: 'https://example.test/catalogue',
            observedAt: '2026-10-05',
        });

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
            sourceAmount: '16',
            sourceBasis: 'PACKAGE',
            currency: 'EUR',
            packaging: {
                unitCount: 8,
                quantityPerUnit: '4',
                unit: 'UNIT',
            },
            sourceOrganization: 'Catalogue professionnel vérifié',
        });
        expect(result.data.observedAt).toBeInstanceOf(Date);
    });

    it('refuse un prix PACKAGE sans quantité totale calculable', () => {
        const result = indicativePriceBodySchema.safeParse({
            sourceAmount: '16',
            sourceBasis: 'PACKAGE',
            packaging: {
                containerType: 'Carton',
                unitCount: 8,
            },
        });

        expect(result.success).toBe(false);
        expect(result.error.issues).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    path: ['packaging'],
                }),
            ]),
        );
    });

    it('refuse une provenance URL non vérifiable syntaxiquement', () => {
        expect(indicativePriceBodySchema.safeParse({
            sourceAmount: '3.25',
            sourceBasis: 'KG',
            sourceUrl: 'catalogue interne',
        }).success).toBe(false);
    });
});
