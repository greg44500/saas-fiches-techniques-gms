import { describe, expect, it } from 'vitest';

import {
  formatYield,
  getCategoryStatusLabel,
  getFoodRangeLabel,
  getFoodRangeName,
  getImportClassificationPresentation,
  getProductEventLabel,
  getProductStatusLabel,
  getReferenceLabel,
  getProductVariantSearchLabel,
  getReferenceUnitLabel,
  getUsageTypeLabel,
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
  foodRanges: [
    {
      value: 1,
      label: 'Gamme 1',
      name: 'Frais',
      processingStates: ['Produit frais'],
      defaultProcessingState: 'Produit frais',
    },
  ],
  usageTypes: [
    { value: 'PAI', label: 'PAI' },
    { value: 'PAE', label: 'PAE' },
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
      variety: { id: 'gala', name: 'Gala' },
      characteristics: [
        { id: 'rapee', kind: 'PRESENTATION', name: 'Râpée' },
        { id: 'mini', kind: 'SIZE_FORMAT', name: 'Mini' },
      ],
      processingState: 'Produit frais',
    })).toBe('Gala · Râpée · Mini · Produit frais');
    expect(getFoodRangeLabel(metadata, 1)).toBe('Gamme 1');
    expect(getFoodRangeName(metadata, 1)).toBe('Frais');
    expect(getUsageTypeLabel(metadata, 'PAI')).toBe('PAI');
    expect(getProductVariantSearchLabel(
      { name: 'Bœuf' },
      {
        variety: null,
        characteristics: [{ kind: 'CUT', name: 'Paleron' }],
      },
      metadata,
    )).toBe('Bœuf (paleron)');
    expect(getVariantLabel(null)).toBe('Aucune déclinaison exploitable');
    expect(formatYield(92.5)).toBe('92.5 %');
  });

  it('construit un libellé métier compact sans répéter l état porté par la Gamme', () => {
    expect(getReferenceLabel(
      metadata,
      { name: 'Carotte' },
      {
        variety: null,
        characteristics: [{ kind: 'PRESENTATION', name: 'Entière' }],
        processingState: 'Produit frais',
        foodRange: 1,
      },
    )).toBe('Carotte');

    expect(getReferenceLabel(
      metadata,
      { name: 'Carotte' },
      {
        variety: null,
        characteristics: [{ kind: 'PRESENTATION', name: 'Râpée' }],
        processingState: 'Produit frais',
        foodRange: 1,
      },
    )).toBe('Carotte râpée');

    expect(getReferenceLabel(
      metadata,
      { name: 'Canard' },
      {
        variety: null,
        characteristics: [{ kind: 'CUT', name: 'Cuisse' }],
        processingState: 'Produit frais',
        foodRange: 1,
      },
    )).toBe('Canard (cuisse)');

    expect(getReferenceLabel(
      metadata,
      { name: 'Canard' },
      {
        variety: null,
        characteristics: [{ kind: 'COMMERCIAL_TYPE', name: 'Confit' }],
        processingState: 'Produit frais',
        foodRange: 1,
      },
    )).toBe('Canard confit');
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
        label: 'Nouvelle déclinaison',
        tone: 'warning',
      }),
    );
  });

  it('traduit les créations et maintient la lecture des événements legacy', () => {
    expect(getProductEventLabel('PRODUCT_CREATED')).toBe('Produit créé');
    expect(getProductEventLabel('VARIANT_CREATED')).toBe('Déclinaison créée');
    expect(getProductEventLabel('VARIETY_CREATED')).toBe('Variété créée');
    expect(getProductEventLabel('CONTRIBUTION_SUBMITTED')).toBe('Contribution soumise');
    expect(getProductEventLabel('PRODUCT_APPROVED')).toBe('Produit activé (historique)');
  });
});
