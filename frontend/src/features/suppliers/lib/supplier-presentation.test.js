import { describe, expect, it } from 'vitest';

import {
  formatIndicativePriceSource,
  formatPackaging,
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
