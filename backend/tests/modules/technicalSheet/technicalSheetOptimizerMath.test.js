import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    applyCurveToQuantity,
    assertOptimizationEnvelope,
    buildQuarterStepTowardMinimum,
    calculateSavings,
    interpolateCurvePressure,
} from '../../../modules/technicalSheet/technicalSheetOptimizerMath.service.js';

describe('M-005 mathématiques de l’Atelier', () => {
    const curve = {
        enabled: true,
        pressures: {
            VERY_LOW: -100,
            LOW: 0,
            MEDIUM: 50,
            HIGH: 0,
            VERY_HIGH: 100,
        },
    };

    it('interpole la pression entre les cinq points fixes de %CM', () => {
        const pressure =
            interpolateCurvePressure({
                materialCostSharePercent:
                    '12.5',
                curve,
            });

        expect(
            Number(
                pressure.numerator,
            )
            / Number(
                pressure.denominator,
            ),
        ).toBe(-50);
    });

    it('déplace une quantité vers son minimum sans compensation physique', () => {
        expect(
            applyCurveToQuantity({
                referenceQuantity: '10',
                minNetQuantity: '8',
                maxNetQuantity: '14',
                materialCostSharePercent:
                    '0',
                curve,
            }),
        ).toBe('8');

        expect(
            applyCurveToQuantity({
                referenceQuantity: '10',
                minNetQuantity: '8',
                maxNetQuantity: '14',
                materialCostSharePercent:
                    '50',
                curve,
            }),
        ).toBe('12');
    });

    it('refuse une enveloppe qui n’encadre pas la quantité de référence', () => {
        expect(() =>
            assertOptimizationEnvelope({
                referenceQuantity: '10',
                minNetQuantity: '11',
                maxNetQuantity: '12',
            }),
        ).toThrow(
            /bornes d’optimisation/i,
        );
    });

    it('construit le pas Auto V1 à 25 % du chemin vers le minimum', () => {
        expect(
            buildQuarterStepTowardMinimum({
                referenceQuantity: '10',
                minNetQuantity: '6',
            }),
        ).toBe('9');
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
