import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    calculateEconomics,
    calculateGrossQuantity,
    calculateTotalPortions,
    convertQuantity,
    fractionToDecimal,
} from '../../../modules/technicalSheet/technicalSheetMath.service.js';

describe('M-004 calculs Fiche technique', () => {
    it('dérive exactement le total de portions sans dépendre de la valorisation', () => {
        expect(calculateTotalPortions({
            productionQuantity: '10',
            portionsPerProductionUnit: '8',
        })).toBe('80');

        expect(calculateTotalPortions({
            productionQuantity: '1.5',
            portionsPerProductionUnit: '2',
        })).toBe('3');
    });

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
            productionQuantity: '10',
            vatRateBasisPoints: 1000,
            targetMarginBasisPoints: 5000,
            finalPriceMode: 'ADVISED',
        });

        expect(
            economics.manufacturingCostHt,
        ).toBe('25');
        expect(
            economics.manufacturingCostPerProductionUnitHt,
        ).toBe('2.5');
        expect(
            economics.theoreticalPriceHt,
        ).toBe('5');
        expect(
            economics.theoreticalPriceTtc,
        ).toBe('5.5');
        expect(
            economics.advisedPriceTtcMinor,
        ).toBe(550);
        expect(
            economics.finalPriceTtcMinor,
        ).toBe(550);
        expect(
            economics.actualMarginBasisPoints,
        ).toBe(5000);
        expect(
            economics.actualMarginAmountHt,
        ).toBe('2.5');
        expect(
            economics.manufacturingMarginProductionHt,
        ).toBe('25');
        expect(
            economics.targetMarginDeltaBasisPoints,
        ).toBe(0);
        expect(
            economics.targetMarginDeltaAmountHt,
        ).toBe('0');
        expect(
            economics.targetMarginDeltaProductionHt,
        ).toBe('0');
    });

    it('distingue coût par pièce et coût par portion pour 1 pièce de 8 portions', () => {
        const economics = calculateEconomics({
            ingredientCosts: [{
                numerator: 12n,
                denominator: 1n,
            }],
            economatCosts: [{
                numerator: 4n,
                denominator: 1n,
            }],
            productionQuantity: '1',
            portionsPerProductionUnit: '8',
            saleBasis: 'PORTION',
            vatRateBasisPoints: 0,
            targetMarginBasisPoints: 0,
            finalPriceMode: 'ADVISED',
        });

        expect(economics.totalPortions).toBe('8');
        expect(
            economics.materialCostPerProductionUnitHt,
        ).toBe('12');
        expect(
            economics.materialCostPerPortionHt,
        ).toBe('1.5');
        expect(
            economics.manufacturingCostPerProductionUnitHt,
        ).toBe('16');
        expect(
            economics.manufacturingCostPerPortionHt,
        ).toBe('2');
        expect(economics.theoreticalPriceHt).toBe('2');
        expect(economics.saleBasis).toBe('PORTION');
    });

    it('calcule 80 portions pour 10 pièces de 8 portions', () => {
        const economics = calculateEconomics({
            ingredientCosts: [{
                numerator: 80n,
                denominator: 1n,
            }],
            economatCosts: [{
                numerator: 20n,
                denominator: 1n,
            }],
            productionQuantity: '10',
            portionsPerProductionUnit: '8',
            saleBasis: 'PIECE',
            vatRateBasisPoints: 0,
            targetMarginBasisPoints: 0,
            finalPriceMode: 'ADVISED',
        });

        expect(economics.totalPortions).toBe('80');
        expect(
            economics.materialCostPerProductionUnitHt,
        ).toBe('8');
        expect(
            economics.manufacturingCostPerProductionUnitHt,
        ).toBe('10');
        expect(
            economics.materialCostPerPortionHt,
        ).toBe('1');
        expect(
            economics.manufacturingCostPerPortionHt,
        ).toBe('1.25');
        expect(economics.theoreticalPriceHt).toBe('10');
    });

    it('fait coïncider pièce et portion lorsque portions par pièce vaut 1', () => {
        const economics = calculateEconomics({
            ingredientCosts: [{
                numerator: 120n,
                denominator: 1n,
            }],
            economatCosts: [],
            productionQuantity: '80',
            portionsPerProductionUnit: '1',
            saleBasis: 'PORTION',
            vatRateBasisPoints: 0,
            targetMarginBasisPoints: 0,
            finalPriceMode: 'ADVISED',
        });

        expect(economics.totalPortions).toBe('80');
        expect(
            economics.materialCostPerProductionUnitHt,
        ).toBe('1.5');
        expect(
            economics.materialCostPerPortionHt,
        ).toBe('1.5');
        expect(economics.economatCostHt).toBe('0');
    });

    it('refuse une base de vente inconnue et un nombre de portions nul', () => {
        const common = {
            ingredientCosts: [{
                numerator: 10n,
                denominator: 1n,
            }],
            economatCosts: [],
            productionQuantity: '1',
            vatRateBasisPoints: 0,
            targetMarginBasisPoints: 0,
            finalPriceMode: 'ADVISED',
        };

        expect(() => calculateEconomics({
            ...common,
            portionsPerProductionUnit: '0',
            saleBasis: 'PIECE',
        })).toThrow(
            'Le nombre de portions par pièce doit être strictement positif.',
        );

        expect(() => calculateEconomics({
            ...common,
            portionsPerProductionUnit: '1',
            saleBasis: 'UNKNOWN',
        })).toThrow('Base de vente invalide.');
    });

    it('expose une marge négative au lieu de masquer une production déficitaire', () => {
        const economics = calculateEconomics({
            ingredientCosts: [
                {
                    numerator: 10n,
                    denominator: 1n,
                },
            ],
            economatCosts: [],
            productionQuantity: '1',
            vatRateBasisPoints: 1000,
            targetMarginBasisPoints: 5000,
            finalPriceMode: 'MANUAL',
            finalPriceTtcMinor: 550,
        });

        expect(economics.economicFloorTtc).toBe('11');
        expect(economics.finalPriceHt).toBe('5');
        expect(economics.actualMarginAmountHt).toBe('-5');
        expect(economics.manufacturingMarginProductionHt).toBe('-5');
        expect(economics.actualMarginBasisPoints).toBe(-10000);
        expect(economics.targetMarginDeltaBasisPoints).toBe(-15000);
        expect(economics.targetMarginDeltaAmountHt).toBe('-15');
        expect(economics.targetMarginDeltaProductionHt).toBe('-15');
    });
});
