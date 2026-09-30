import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    calculateEconomics,
    calculateGrossQuantity,
    convertQuantity,
    fractionToDecimal,
} from '../../../modules/technicalSheet/technicalSheetMath.service.js';

describe('M-004 calculs Fiche technique', () => {
    it('calcule exactement la quantité brute à partir du rendement', () => {
        const result = calculateGrossQuantity({
            netQuantity: '2',
            yieldPercent: '80',
        });

        expect(
            fractionToDecimal(
                result.grossQuantity,
            ),
        ).toBe('2.5');
        expect(
            fractionToDecimal(
                result.yieldPercentUsed,
            ),
        ).toBe('80');
    });

    it('convertit les unités uniquement dans la même dimension', () => {
        expect(
            fractionToDecimal(
                convertQuantity({
                    quantity: '2500',
                    fromUnit: 'G',
                    toUnit: 'KG',
                }),
            ),
        ).toBe('2.5');

        expect(
            convertQuantity({
                quantity: '1',
                fromUnit: 'L',
                toUnit: 'KG',
            }),
        ).toBeNull();
    });

    it('calcule le Prix conseillé par pas de 0,50 euro sans flottants métier', () => {
        const economics = calculateEconomics({
            ingredientCosts: [
                {
                    numerator: 25n,
                    denominator: 1n,
                },
            ],
            economatCosts: [],
            vatRateBasisPoints: 1000,
            targetMarginBasisPoints: 5000,
            finalPriceMode: 'ADVISED',
        });

        expect(
            economics.manufacturingCostHt,
        ).toBe('25');
        expect(
            economics.theoreticalPriceHt,
        ).toBe('50');
        expect(
            economics.theoreticalPriceTtc,
        ).toBe('55');
        expect(
            economics.advisedPriceTtcMinor,
        ).toBe(5500);
        expect(
            economics.finalPriceTtcMinor,
        ).toBe(5500);
        expect(
            economics.actualMarginBasisPoints,
        ).toBe(5000);
    });

    it('refuse un Prix final manuel sous le plancher économique', () => {
        expect(() => calculateEconomics({
            ingredientCosts: [
                {
                    numerator: 10n,
                    denominator: 1n,
                },
            ],
            economatCosts: [],
            vatRateBasisPoints: 1000,
            targetMarginBasisPoints: 5000,
            finalPriceMode: 'MANUAL',
            finalPriceTtcMinor: 1000,
        })).toThrow(
            'Le Prix final TTC est inférieur au plancher économique.',
        );
    });
});
