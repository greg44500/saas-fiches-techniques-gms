import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    getProductFoodRangeDefinition,
    resolveProductProcessingState,
} from '../../../modules/productCatalog/productVariantSemantics.js';

describe('M-002 product variant semantics', () => {
    it('résout uniquement les cinq gammes physiques depuis le registre backend', () => {
        expect(getProductFoodRangeDefinition(1)).toEqual(
            expect.objectContaining({
                label: 'Gamme 1',
                name: 'Frais',
            }),
        );
        expect(getProductFoodRangeDefinition(6)).toBeNull();
    });

    it('déduit l état par défaut et canonise une valeur compatible', () => {
        expect(resolveProductProcessingState({
            foodRange: 1,
        })).toEqual(
            expect.objectContaining({
                valid: true,
                value: 'Produit frais',
            }),
        );

        expect(resolveProductProcessingState({
            foodRange: 5,
            processingState: 'sous-vide cuit',
        })).toEqual(
            expect.objectContaining({
                valid: true,
                value: 'Sous-vide cuit',
            }),
        );
    });

    it('refuse un état incompatible avec la gamme', () => {
        expect(resolveProductProcessingState({
            foodRange: 1,
            processingState: 'Surgelé',
        })).toEqual(
            expect.objectContaining({
                valid: false,
                reason: 'INVALID_PROCESSING_STATE',
            }),
        );
    });
});
