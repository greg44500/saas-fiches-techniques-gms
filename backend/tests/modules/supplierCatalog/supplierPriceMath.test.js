import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    normalizeSupplierPrice,
    rationalToDecimal128String,
} from '../../../modules/supplierCatalog/supplierPriceMath.service.js';

describe('M-003 supplier price math', () => {
    it('normalise exactement 40.625 euros le sac de 25 kg en 1.625 euro par kg', () => {
        expect(normalizeSupplierPrice({
            sourceAmount: '40.625',
            sourceBasis: 'PACKAGE',
            packaging: {
                totalQuantity: '25',
                unit: 'KG',
            },
            targetUnit: 'KG',
        })).toEqual({
            normalizedAmount: '1.625',
            normalizedUnit: 'KG',
        });
    });

    it('convertit un prix par gramme vers le kilogramme', () => {
        expect(normalizeSupplierPrice({
            sourceAmount: '0.002',
            sourceBasis: 'G',
            targetUnit: 'KG',
        })).toEqual({
            normalizedAmount: '2',
            normalizedUnit: 'KG',
        });
    });

    it('laisse indisponible une normalisation dimensionnellement impossible', () => {
        expect(normalizeSupplierPrice({
            sourceAmount: '2',
            sourceBasis: 'L',
            targetUnit: 'KG',
        })).toEqual({
            normalizedAmount: null,
            normalizedUnit: null,
        });
    });

    it('conserve jusqu à 34 chiffres significatifs sans passer par Number', () => {
        expect(rationalToDecimal128String({
            numerator: 1n,
            denominator: 3n,
        })).toBe(
            '0.3333333333333333333333333333333333',
        );
    });
});
