import { describe, expect, it } from 'vitest';

import {
  formatYield,
  getCategoryStatusLabel,
  getConservationTypeLabel,
  getFoodRangeLabel,
  getFoodRangeName,
  getImportClassificationPresentation,
  getProductEventLabel,
  getProductStatusLabel,
  getReferenceLabel,
  getProductVariantSearchLabel,
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
    { value: 'ACTIVE', label: 'Favori' },
  ],
  productCategoryStatuses: [
    { value: 'ARCHIVED', label: 'Archivée' },
  ],
  conservationTypes: [
    { value: 'FRAIS', label: 'Frais' },
    { value: 'SURGELE', label: 'Surgelé' },
  ],
  referenceUnits: [
    { value: 'KG', label: 'kg' },
  ],
  foodRanges: [
    {
      value: 1,
      label: 'Gamme 1',
      name: 'Frais',
    },
  ],
};

describe('product presentation', () => {
  it('utilise les libellés fournis par les métadonnées backend', () => {
    expect(getProductStatusLabel(metadata, 'ACTIVE')).toBe('Actif');
    expect(getWorkspaceProductStatusLabel(metadata, 'ACTIVE')).toBe('Favori');
    expect(getCategoryStatusLabel(metadata, 'ARCHIVED')).toBe('Archivée');
    expect(getConservationTypeLabel(metadata, 'SURGELE')).toBe('Surgelé');
    expect(getReferenceUnitLabel(metadata, 'KG')).toBe('kg');
  });

  it('présente directement le nom métier persistant de la référence', () => {
    const variant = {
      name: 'Carotte râpée',
      variety: { id: 'nantaise', name: 'Nantaise' },
      characteristics: [
        { id: 'rapee', kind: 'PRESENTATION', name: 'Râpée' },
      ],
      processingState: 'Prête à l’emploi',
      conservationType: 'FRAIS',
      foodRange: 6,
    };

    expect(getVariantLabel(variant)).toBe('Carotte râpée');
    expect(getReferenceLabel(
      metadata,
      { name: 'Carotte' },
      variant,
    )).toBe('Carotte râpée');
    expect(getProductVariantSearchLabel(
      { name: 'Carotte' },
      variant,
      metadata,
    )).toBe('Carotte râpée');
    expect(getVariantLabel(null)).toBe('Aucune référence exploitable');
    expect(formatYield(92.5)).toBe('92.5 %');
  });

  it('présente la gamme sans fabriquer le nom de référence', () => {
    expect(getFoodRangeLabel(metadata, 1)).toBe('Gamme 1');
    expect(getFoodRangeName(metadata, 1)).toBe('Frais');

    expect(getReferenceLabel(
      metadata,
      { name: 'Canard' },
      {
        name: 'Cuisse de canard confite',
        characteristics: [{ kind: 'CUT', name: 'Cuisse' }],
      },
    )).toBe('Cuisse de canard confite');
  });

  it('présente les classifications d’import M-002', () => {
    expect(getImportClassificationPresentation('REVIEW_REQUIRED')).toEqual(
      expect.objectContaining({
        label: 'Revue requise',
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
        label: 'Nouvelle référence',
        tone: 'warning',
      }),
    );
  });

  it('traduit les événements techniques VARIANT en Référence', () => {
    expect(getProductEventLabel('PRODUCT_CREATED')).toBe('Produit créé');
    expect(getProductEventLabel('VARIANT_CREATED')).toBe('Référence créée');
    expect(getProductEventLabel('VARIETY_CREATED')).toBe('Variété créée');
    expect(getProductEventLabel('CONTRIBUTION_SUBMITTED')).toBe('Contribution soumise');
    expect(getProductEventLabel('PRODUCT_APPROVED')).toBe('Produit activé (historique)');
  });
});
