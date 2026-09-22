import { describe, expect, it } from 'vitest';

import {
  formatYield,
  getCategoryStatusLabel,
  getImportClassificationPresentation,
  getProductEventLabel,
  getProductStatusLabel,
  getReferenceUnitLabel,
  getVariantLabel,
  getWorkspaceProductStatusLabel,
} from '@/features/products/lib/product-presentation';

const metadata = {
  productStatuses: [
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'PENDING_REVIEW', label: 'En validation' },
  ],
  workspaceProductStatuses: [
    { value: 'ACTIVE', label: 'Dans le catalogue' },
  ],
  productCategoryStatuses: [
    { value: 'ARCHIVED', label: 'Archivée' },
  ],
  referenceUnits: [
    { value: 'KG', label: 'kg' },
  ],
};

describe('product presentation', () => {
  it('utilise les libellés fournis par les métadonnées backend', () => {
    expect(getProductStatusLabel(metadata, 'PENDING_REVIEW')).toBe('En validation');
    expect(getWorkspaceProductStatusLabel(metadata, 'ACTIVE')).toBe('Dans le catalogue');
    expect(getCategoryStatusLabel(metadata, 'ARCHIVED')).toBe('Archivée');
    expect(getReferenceUnitLabel(metadata, 'KG')).toBe('kg');
  });

  it('présente les déclinaisons et rendements sans donnée M-003', () => {
    expect(getVariantLabel({
      form: 'Râpée',
      processingState: 'Prête à l’emploi',
      preservation: 'Fraîche',
    })).toBe('Râpée · Prête à l’emploi · Fraîche');
    expect(formatYield(92.5)).toBe('92.5 %');
  });

  it('présente les classifications d’import M-002', () => {
    expect(getImportClassificationPresentation('REVIEW_REQUIRED')).toEqual(
      expect.objectContaining({
        label: 'Décision requise',
        tone: 'warning',
      }),
    );
    expect(getImportClassificationPresentation('PRIVATE_CONFLICT')).toEqual(
      expect.objectContaining({
        label: 'Conflit non accessible',
        tone: 'destructive',
      }),
    );
  });

  it('traduit les événements de gouvernance sans exposer les constantes', () => {
    expect(getProductEventLabel('PRODUCT_APPROVED')).toBe('Produit validé');
    expect(getProductEventLabel('VARIANT_REJECTED')).toBe('Déclinaison rejetée');
  });
});
