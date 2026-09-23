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
    { value: 'ARCHIVED', label: 'Archivé' },
  ],
  workspaceProductStatuses: [
    { value: 'ACTIVE', label: 'Dans mon référentiel' },
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
    expect(getProductStatusLabel(metadata, 'ACTIVE')).toBe('Actif');
    expect(getWorkspaceProductStatusLabel(metadata, 'ACTIVE')).toBe('Dans mon référentiel');
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
    expect(getImportClassificationPresentation('CREATE_PRODUCT')).toEqual(
      expect.objectContaining({
        label: 'Nouveau Produit',
        tone: 'warning',
      }),
    );
    expect(getImportClassificationPresentation('CREATE_VARIANT')).toEqual(
      expect.objectContaining({
        label: 'Nouvelle déclinaison',
        tone: 'warning',
      }),
    );
  });

  it('traduit les créations et maintient la lecture des événements legacy', () => {
    expect(getProductEventLabel('PRODUCT_CREATED')).toBe('Produit créé');
    expect(getProductEventLabel('VARIANT_CREATED')).toBe('Déclinaison créée');
    expect(getProductEventLabel('PRODUCT_APPROVED')).toBe('Produit activé (historique)');
  });
});
