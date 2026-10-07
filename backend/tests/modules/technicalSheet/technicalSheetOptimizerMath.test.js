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
    interpolateCurvePressure,
} from '../../../modules/technicalSheet/technicalSheetOptimizerMath.service.js';

describe('M-005 mathématiques de l’Atelier', () => {
    const curve = {
        enabled: true,
        pressures: {
            VERY_LOW: -50,
            LOW: 0,
            MEDIUM: 50,
            HIGH: 0,
            VERY_HIGH: 100,
        },
    };

    it('interpole l’ajustement économique entre les cinq zones de %CM', () => {
        const adjustment =
            interpolateCurvePressure({
                materialCostSharePercent:
                    '12.5',
                curve,
            });

        expect(
            Number(
                adjustment.numerator,
            )
            / Number(
                adjustment.denominator,
            ),
        ).toBe(-25);
    });

    it('traduit directement une baisse de coût en quantité sans exiger de bornes', () => {
        expect(
            applyEconomicAdjustmentToQuantity({
                referenceQuantity: '10',
                minNetQuantity: null,
                maxNetQuantity: null,
                materialCostSharePercent:
                    '0',
                curve,
            }),
        ).toBe('5');
    });

    it('traduit une hausse de coût en quantité puis respecte un garde-fou maximum', () => {
        expect(
            applyEconomicAdjustmentToQuantity({
                referenceQuantity: '10',
                minNetQuantity: null,
                maxNetQuantity: '14',
                materialCostSharePercent:
                    '50',
                curve,
            }),
        ).toBe('14');
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
