import { describe, expect, it } from 'vitest';
import {
    supplierPackagingLabel,
    supplierTariffPresentation,
} from '../../../modules/supplierCatalog/supplierArticlePresentation.service.js';

describe('M-003 projections commerciales préparées côté backend', () => {
    it('évite la répétition du poids total et net équivalents', () => {
        expect(supplierPackagingLabel({
            containerType: 'Carton',
            unitCount: 36,
            quantityPerUnit: '300',
            unit: 'G',
            totalQuantity: '10800',
            netWeight: '10800',
            netWeightUnit: 'G',
        })).toBe('Carton · 36 × 300 g');
    });

    it('conserve le poids net distinct et le poids égoutté', () => {
        const label = supplierPackagingLabel({
            containerType: 'Carton',
            unitCount: 2,
            quantityPerUnit: '5',
            unit: 'KG',
            totalQuantity: '10',
            netWeight: '9',
            netWeightUnit: 'KG',
            drainedNetWeight: '8',
            drainedNetWeightUnit: 'KG',
        });
        expect(label).toContain('net 9 kg');
        expect(label).toContain('égoutté 8 kg');
    });

    it('projette le prix du carton et par kg avant toute association Produit', () => {
        const article = {
            productVariant: null,
            packaging: { containerType: 'Carton', totalQuantity: '10', unit: 'KG' },
        };
        const tariff = {
            _id: { toString: () => 'tariff-1' },
            sourceKind: 'PRICE_LIST',
            sourceLabel: 'Tarifs 2027',
            sourceAmount: '40.625',
            sourceBasis: 'PACKAGE',
            currency: 'EUR',
            validFrom: new Date('2027-01-01'),
            validTo: new Date('2027-12-31'),
        };
        const result = supplierTariffPresentation(tariff, article);
        expect(result.packagePriceLabel).toContain('40,625');
        expect(result.unitPriceLabel).toContain('4,063');
        expect(result.normalizedUnit).toBe('KG');
        expect(result.sourceLabel).toBe('Tarifs 2027');
        const changedArticle = {
            ...article,
            packaging: { containerType: 'Carton', totalQuantity: '5', unit: 'KG' },
        };
        const frozen = supplierTariffPresentation({
            ...tariff,
            packagingSnapshot: article.packaging,
        }, changedArticle);
        expect(frozen.unitPriceLabel).toBe(result.unitPriceLabel);
    });
});
