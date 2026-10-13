import { describe, expect, it } from 'vitest';
import {
    supplierPackagingLabel,
    supplierPackagingPresentation,
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
    it('affiche le poids net total calculé en kg sous le colis', () => {
        const presentation = supplierPackagingPresentation({
            containerType: 'Carton',
            unitCount: 36,
            quantityPerUnit: '0.300',
            unit: 'KG',
            totalQuantity: '10.800',
            netWeight: '10.8',
            netWeightUnit: 'KG',
        });
        expect(presentation).toEqual({
            mainLabel: 'Carton · 36 × 0.300 kg',
            totalLabel: 'Poids net total : 10,8 kg',
            warningLabel: null,
        });
    });

    it('n’efface pas une incohérence entre poids calculé et poids net saisi', () => {
        const presentation = supplierPackagingPresentation({
            containerType: 'Carton', unitCount: 36,
            quantityPerUnit: '0.300', unit: 'KG',
            totalQuantity: '10.8', netWeight: '10800', netWeightUnit: 'KG',
        });
        expect(presentation.mainLabel).not.toContain('10800');
        expect(presentation.totalLabel).toBe('Poids total calculé : 10,8 kg');
        expect(presentation.warningLabel)
            .toBe('Poids net déclaré à vérifier : 10 800 kg');
    });

    it('affiche les volumes en litres et les masses en kg, sans assimiler un volume à un poids', () => {
        expect(supplierPackagingPresentation({
            containerType: 'Bidon', unitCount: 1,
            quantityPerUnit: '30', unit: 'L', totalQuantity: '30',
        }).totalLabel).toBe('Volume total : 30 L');
        expect(supplierPackagingPresentation({
            containerType: 'Carton', unitCount: 24,
            quantityPerUnit: '100', unit: 'CL', totalQuantity: '2400',
        }).totalLabel).toBe('Volume total : 24 L');
        expect(supplierPackagingPresentation({
            containerType: 'Sac', unitCount: 1,
            quantityPerUnit: '2.5', unit: 'KG', totalQuantity: '2.5',
        }).totalLabel).toBe('Poids net total : 2,5 kg');
    });

    it('calcule le prix par pièce et par kg pour un carton de plaques de 300 g', () => {
        const article = {
            productVariant: { referenceUnit: 'KG' },
            packaging: {
                containerType: 'Carton', unitCount: 36,
                quantityPerUnit: '0.300', unit: 'KG', totalQuantity: '10.8',
            },
        };
        const tariff = {
            _id: { toString: () => 'tariff-plaque' },
            sourceKind: 'PRICE_LIST',
            sourceAmount: '11.2', sourceBasis: 'PACKAGE', currency: 'EUR',
        };
        const result = supplierTariffPresentation(tariff, article);
        expect(result.packagePriceLabel).toContain('11,200');
        expect(result.piecePriceLabel).toBe('0,311 € HT / pièce');
        expect(result.unitPriceLabel).toBe('1,037 € HT / kg');
        expect(result.pieceAmount).not.toBeNull();
    });

    it('projette le litre pour un bidon et le carton, et ne fabrique pas de prix pièce sans données', () => {
        const price = {
            _id: { toString: () => 'tariff-volume' },
            sourceKind: 'PRICE_LIST', sourceAmount: '60',
            sourceBasis: 'PACKAGE', currency: 'EUR',
        };
        const bidon = supplierTariffPresentation(price, {
            productVariant: null,
            packaging: {
                containerType: 'Bidon', unitCount: 1,
                quantityPerUnit: '30', unit: 'L', totalQuantity: '30',
            },
        });
        expect(bidon.unitPriceLabel).toBe('2,000 € HT / l');
        expect(bidon.piecePriceLabel).toBeNull();

        const carton = supplierTariffPresentation(price, {
            productVariant: null,
            packaging: {
                containerType: 'Carton', unitCount: 24,
                quantityPerUnit: '1', unit: 'L', totalQuantity: '24',
            },
        });
        expect(carton.unitPriceLabel).toBe('2,500 € HT / l');
        expect(carton.piecePriceLabel).toBe('2,500 € HT / pièce');

        const insufficient = supplierTariffPresentation(price, {
            productVariant: null, packaging: { containerType: 'Carton', unitCount: 24 },
        });
        expect(insufficient.piecePriceLabel).toBeNull();
        expect(insufficient.unitPriceLabel).toBeNull();
    });

    it('normalise aussi le prix d’un sac de 2,5 kg et d’un bidon de 10 L', () => {
        const tariff = {
            _id: { toString: () => 'tariff-unit' },
            sourceKind: 'PRICE_LIST', sourceAmount: '25',
            sourceBasis: 'PACKAGE', currency: 'EUR',
        };
        const sac = supplierTariffPresentation(tariff, {
            productVariant: { referenceUnit: 'KG' },
            packaging: {
                containerType: 'Sac', unitCount: 1,
                quantityPerUnit: '2.5', unit: 'KG', totalQuantity: '2.5',
            },
        });
        expect(sac.unitPriceLabel).toBe('10,000 € HT / kg');
        expect(sac.piecePriceLabel).toBeNull();

        const bidon = supplierTariffPresentation(tariff, {
            productVariant: { referenceUnit: 'L' },
            packaging: {
                containerType: 'Bidon', unitCount: 1,
                quantityPerUnit: '10', unit: 'L', totalQuantity: '10',
            },
        });
        expect(bidon.unitPriceLabel).toBe('2,500 € HT / l');
        expect(bidon.piecePriceLabel).toBeNull();
        const carton = supplierTariffPresentation(tariff, {
            productVariant: null,
            packaging: {
                containerType: 'Carton', unitCount: 1,
                quantityPerUnit: '24', unit: 'L', totalQuantity: '24',
            },
        });
        expect(carton.unitPriceLabel).toBe('1,042 € HT / l');
        expect(carton.piecePriceLabel).toBeNull();
    });

    it('calcule à partir de l’instantané du tarif, même si le colis courant change', () => {
        const oldPackaging = {
            containerType: 'Carton', unitCount: 36,
            quantityPerUnit: '0.3', unit: 'KG', totalQuantity: '10.8',
        };
        const result = supplierTariffPresentation({
            _id: { toString: () => 'tariff-frozen' },
            sourceKind: 'PRICE_LIST', sourceAmount: '11.2',
            sourceBasis: 'PACKAGE', currency: 'EUR',
            packagingSnapshot: oldPackaging,
        }, {
            productVariant: { referenceUnit: 'KG' },
            packaging: {
                containerType: 'Carton', unitCount: 24,
                quantityPerUnit: '0.3', unit: 'KG', totalQuantity: '7.2',
            },
        });
        expect(result.piecePriceLabel).toBe('0,311 € HT / pièce');
        expect(result.unitPriceLabel).toBe('1,037 € HT / kg');
    });
});
