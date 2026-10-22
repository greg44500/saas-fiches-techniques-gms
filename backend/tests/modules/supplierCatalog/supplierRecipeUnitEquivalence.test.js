import { describe, expect, it } from 'vitest';

import {
    packagingSignature,
    packagingSignaturesMatch,
    verifiedRecipeUnitCount,
} from '../../../modules/supplierCatalog/supplierRecipeUnitEquivalence.service.js';
import {
    normalizeSupplierPrice,
} from '../../../modules/supplierCatalog/supplierPriceMath.service.js';

const carton = {
    containerType: 'Carton',
    unitCount: 36,
    quantityPerUnit: '120',
    unit: 'G',
    totalQuantity: '4320',
    netWeight: '4320',
    netWeightUnit: 'G',
};
const variantId = '507f1f77bcf86cd799439011';
const verified = {
    unitsPerPackage: 36,
    productVariant: variantId,
    packagingSignature: packagingSignature(carton),
};

describe('M-002/M-003 — correspondance dénombrable vérifiée', () => {
    it('valorise le croissant uniquement en présence de la preuve du colis exact', () => {
        const converted = normalizeSupplierPrice({
            sourceAmount: '6.50',
            sourceBasis: 'PACKAGE',
            targetUnit: 'UNIT',
            packaging: carton,
            recipeUnitEquivalence: verified,
            productVariantId: variantId,
        });
        expect(converted.normalizedUnit).toBe('UNIT');
        expect(Number(converted.normalizedAmount) * 36).toBeCloseTo(6.5, 10);
        expect(converted.normalizedAmount).not.toBe('0.181');
        // 2 pièces, calculées depuis un prix non prématurément arrondi.
        expect(Number(converted.normalizedAmount) * 2).toBeCloseTo(6.5 / 18, 10);
    });

    it('reconnaît un carton historique 36 × 120 g équivalent au carton actuel 36 × 0,120 kg', () => {
        const kgPackaging = {
            containerType: 'Carton',
            unitCount: 36,
            quantityPerUnit: '0.120',
            unit: 'KG',
            totalQuantity: '4.320',
            netWeight: '4.320',
            netWeightUnit: 'KG',
        };
        const oldProof = {
            ...verified,
            packagingSignature: packagingSignature(kgPackaging),
        };
        expect(packagingSignaturesMatch(
            oldProof.packagingSignature, packagingSignature(carton),
        )).toBe(true);
        expect(verifiedRecipeUnitCount({
            packaging: carton,
            equivalence: oldProof,
            productVariantId: variantId,
        })).toBe(36);
        expect(verifiedRecipeUnitCount({
            packaging: kgPackaging,
            equivalence: verified,
            productVariantId: variantId,
        })).toBe(36);
        const price = normalizeSupplierPrice({
            sourceAmount: '6.50',
            sourceBasis: 'PACKAGE',
            packaging: carton,
            targetUnit: 'UNIT',
            recipeUnitEquivalence: oldProof,
            productVariantId: variantId,
        });
        expect(price.normalizedUnit).toBe('UNIT');
        expect(Number(price.normalizedAmount)).toBeCloseTo(6.5 / 36, 12);
    });

    it('n accepte que des conditionnements physiquement identiques, pas des approximations', () => {
        const equivalence = {
            ...verified,
            packagingSignature: packagingSignature({
                containerType: 'Carton', unitCount: 36, quantityPerUnit: '0.12',
                unit: 'KG', totalQuantity: '4.32',
                netWeight: '4.32', netWeightUnit: 'KG',
            }),
        };
        const incompatible = [
            { ...carton, unitCount: 24 },
            { ...carton, quantityPerUnit: '110', totalQuantity: '3960', netWeight: '3960' },
            { ...carton, netWeight: '4200' },
            { ...carton, unit: 'ML' },
            { ...carton, netWeight: null },
            { ...carton, containerType: 'Sachet' },
        ];
        for (const packaging of incompatible) {
            expect(packagingSignaturesMatch(
                equivalence.packagingSignature, packagingSignature(packaging),
            )).toBe(false);
            expect(verifiedRecipeUnitCount({
                packaging,
                equivalence,
                productVariantId: variantId,
            })).toBeNull();
        }
        expect(packagingSignaturesMatch('invalid', packagingSignature(carton)))
            .toBe(false);
    });

    it('ne fabrique jamais une équivalence à partir de unitCount seul', () => {
        const result = normalizeSupplierPrice({
            sourceAmount: '6.50', sourceBasis: 'PACKAGE',
            targetUnit: 'UNIT', packaging: carton,
        });
        expect(result).toEqual({ normalizedAmount: null, normalizedUnit: null });
    });

    it('refuse un autre article, un conditionnement modifié ou un colis historique manquant', () => {
        const args = {
            sourceAmount: '6.50', sourceBasis: 'PACKAGE',
            targetUnit: 'UNIT', recipeUnitEquivalence: verified,
            productVariantId: variantId,
        };
        expect(verifiedRecipeUnitCount({
            packaging: carton,
            equivalence: verified,
            productVariantId: '507f1f77bcf86cd799439012',
        })).toBeNull();
        for (const packaging of [
            { ...carton, unitCount: 24 },
            { ...carton, quantityPerUnit: '90' },
            null,
        ]) {
            expect(normalizeSupplierPrice({ ...args, packaging }))
                .toEqual({ normalizedAmount: null, normalizedUnit: null });
        }
    });

    it('accepte un tarif par kg uniquement avec l’équivalence du colis vérifiée', () => {
        const price = normalizeSupplierPrice({
            sourceAmount: '1.5', sourceBasis: 'KG',
            targetUnit: 'UNIT', packaging: carton,
            recipeUnitEquivalence: verified, productVariantId: variantId,
        });
        expect(price.normalizedUnit).toBe('UNIT');
        expect(Number(price.normalizedAmount)).toBeCloseTo(0.18, 10);
    });

    it('refuse le poids estimé de six citrons par kilogramme', () => {
        const lemon = {
            containerType: 'Filet',
            unitCount: 1,
            quantityPerUnit: '1',
            unit: 'KG',
            totalQuantity: '1',
        };
        expect(packagingSignature(lemon)).toBeNull();
        expect(normalizeSupplierPrice({
            sourceAmount: '2', sourceBasis: 'PACKAGE',
            targetUnit: 'UNIT', packaging: lemon,
            productVariantId: variantId,
            recipeUnitEquivalence: { ...verified, unitsPerPackage: 6 },
        })).toEqual({ normalizedAmount: null, normalizedUnit: null });
    });

    it('conserve les conversions de masse existantes sans équivalence', () => {
        expect(normalizeSupplierPrice({
            sourceAmount: '6.50', sourceBasis: 'PACKAGE',
            targetUnit: 'KG', packaging: carton,
        }).normalizedUnit).toBe('KG');
    });
});
