import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    applyEconomicAdjustmentToQuantity,
    assertOptimizationEnvelope,
    buildQuarterStepTowardMinimum,
    calculateSavings,
} from '../../../modules/technicalSheet/technicalSheetOptimizerMath.service.js';

describe('M-005 mathématiques de l’Atelier', () => {
    it('traduit directement une baisse économique locale en quantité sans exiger de bornes', () => {
        expect(
            applyEconomicAdjustmentToQuantity({
                referenceQuantity: '10',
                minNetQuantity: null,
                maxNetQuantity: null,
                economicAdjustmentPercent: -50,
            }),
        ).toBe('5');
    });

    it('traduit une hausse économique locale en quantité puis respecte un garde-fou maximum', () => {
        expect(
            applyEconomicAdjustmentToQuantity({
                referenceQuantity: '10',
                minNetQuantity: null,
                maxNetQuantity: '14',
                economicAdjustmentPercent: 50,
            }),
        ).toBe('14');
    });

    it('conserve la quantité de référence pour un ajustement neutre', () => {
        expect(
            applyEconomicAdjustmentToQuantity({
                referenceQuantity: '10',
                economicAdjustmentPercent: 0,
            }),
        ).toBe('10');
    });

    it('refuse un ajustement économique hors plage', () => {
        expect(() =>
            applyEconomicAdjustmentToQuantity({
                referenceQuantity: '10',
                economicAdjustmentPercent: -100,
            }),
        ).toThrow(
            /ajustement économique/i,
        );
    });

    it('refuse un garde-fou qui n’encadre pas la quantité de référence', () => {
        expect(() =>
            assertOptimizationEnvelope({
                referenceQuantity: '10',
                minNetQuantity: '11',
                maxNetQuantity: null,
            }),
        ).toThrow(
            /garde-fous d’optimisation/i,
        );
    });

    it('accepte une enveloppe sans garde-fous explicites', () => {
        expect(
            assertOptimizationEnvelope({
                referenceQuantity: '10',
                minNetQuantity: null,
                maxNetQuantity: null,
            }),
        ).toEqual(
            expect.objectContaining({
                minimum: null,
                maximum: null,
            }),
        );
    });

    it('construit le pas Auto V1 à 25 % du chemin vers le minimum explicite', () => {
        expect(
            buildQuarterStepTowardMinimum({
                referenceQuantity: '10',
                minNetQuantity: '6',
            }),
        ).toBe('9');

        expect(
            buildQuarterStepTowardMinimum({
                referenceQuantity: '10',
                minNetQuantity: null,
            }),
        ).toBeNull();
    });

    it('calcule l’économie HT et son pourcentage sans float autoritatif', () => {
        expect(
            calculateSavings({
                beforeManufacturingCostHt:
                    '20',
                afterManufacturingCostHt:
                    '15',
            }),
        ).toEqual({
            amountHt: '5',
            percent: '25',
        });
    });
});
