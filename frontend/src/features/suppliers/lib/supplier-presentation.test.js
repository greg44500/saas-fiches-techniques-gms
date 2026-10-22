import { describe, expect, it } from 'vitest';

import {
  formatIndicativePriceSource,
  formatPackaging,
  getPackagingTooltipDetails,
  formatPrice,
  formatSourcePrice,
} from '@/features/suppliers/lib/supplier-presentation';

const variant = {
  referenceUnit: 'UNIT',
  countUnitLabelSingular: 'tranche',
  countUnitLabelPlural: 'tranches',
};

describe('supplier presentation', () => {
  it('présente UNIT avec le libellé recette tout en conservant le conditionnement commercial', () => {
    expect(formatPackaging({
      containerType: 'Carton',
      unitCount: 8,
      quantityPerUnit: '4',
      totalQuantity: '32',
      unit: 'UNIT',
      supplierLabel: '1 carton = 8 paquets × 4 tranches',
    }, { productVariant: variant })).toBe(
      '1 carton = 8 paquets × 4 tranches'
      + ' · 8 × 4 tranches · total 32 tranches',
    );

    expect(formatPrice({
      normalizedAmount: '0.5',
      normalizedUnit: 'UNIT',
      productVariant: variant,
    }, { hideDefaultCurrency: true })).toBe('0,500 / tranche');
  });

  it('masque le total calculé si le poids net représente la même quantité physique', () => {
    const packaging = {
      containerType: 'Carton',
      unitCount: 36,
      quantityPerUnit: '0.120',
      unit: 'KG',
      totalQuantity: '4.32',
      netWeight: '4320',
      netWeightUnit: 'G',
    };
    expect(getPackagingTooltipDetails(packaging)).toEqual([
      { label: 'Conditionnement', value: 'Carton · 36 × 0.120 kg' },
      { label: 'Poids net', value: '4320 g' },
    ]);
    // Les autres écrans conservent leur format de conditionnement historique.
    expect(formatPackaging(packaging)).toContain('total 4.32 kg');
  });

  it('présente le total calculé séparément lorsque le poids net diffère', () => {
    expect(getPackagingTooltipDetails({
      containerType: 'Carton',
      unitCount: 36,
      quantityPerUnit: '120',
      unit: 'G',
      totalQuantity: '4320',
      netWeight: '4100',
      netWeightUnit: 'G',
      drainedNetWeight: '3900',
      drainedNetWeightUnit: 'G',
    })).toEqual([
      { label: 'Conditionnement', value: 'Carton · 36 × 120 g' },
      { label: 'Poids net', value: '4100 g' },
      { label: 'Quantité totale calculée', value: '4320 g' },
      { label: 'Poids net égoutté', value: '3900 g' },
    ]);
  });

  it('affiche le total lorsqu’aucun poids net n’est déclaré', () => {
    expect(getPackagingTooltipDetails({
      containerType: 'Carton',
      unitCount: 8,
      quantityPerUnit: '4',
      unit: 'UNIT',
      totalQuantity: '32',
    }, { productVariant: variant })).toEqual([
      { label: 'Conditionnement', value: 'Carton · 8 × 4 tranches' },
      { label: 'Quantité totale calculée', value: '32 tranches' },
    ]);
  });

  it('masque la provenance technique tout en conservant une source métier lisible', () => {
    expect(formatIndicativePriceSource({
      source:
        'Référentiel de démonstration — prix repère global — '
        + 'corpus professionnel v7 — octobre 2026 · '
        + 'm003-global-indicative-v3',
    })).toBe('Référentiel de démonstration');

    expect(formatIndicativePriceSource({
      source: 'Fallback interne',
      sourceOrganization: 'Mercuriale fournisseur',
    })).toBe('Mercuriale fournisseur');

    expect(formatIndicativePriceSource({ source: null })).toBeNull();
    expect(formatIndicativePriceSource({
      source: 'm003-global-indicative-v3',
    })).toBeNull();
  });

  it('distingue le prix source du conditionnement et son prix normalisé', () => {
    expect(formatSourcePrice({
      sourceAmount: '16',
      sourceBasis: 'PACKAGE',
      packaging: { containerType: 'Carton' },
    })).toBe('16,00 € / Carton');
  });
});
