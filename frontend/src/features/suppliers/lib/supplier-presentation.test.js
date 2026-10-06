import { describe, expect, it } from 'vitest';

import {
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

  it('distingue le prix source du conditionnement et son prix normalisé', () => {
    expect(formatSourcePrice({
      sourceAmount: '16',
      sourceBasis: 'PACKAGE',
      packaging: { containerType: 'Carton' },
    })).toBe('16,00 € / Carton');
  });
});
