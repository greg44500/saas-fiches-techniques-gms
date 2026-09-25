function createValueLabelMap(definitions = []) {
  return new Map(
    definitions.map(({ value, label }) => [value, label]),
  );
}

function getMetadataLabel(definitions, value, fallback = 'Non renseigné') {
  if (value === null || value === undefined || value === '') return fallback;

  return createValueLabelMap(definitions).get(value) ?? String(value);
}

function getProductStatusLabel(metadata, status) {
  return getMetadataLabel(metadata?.productStatuses, status, status ?? 'Non renseigné');
}

function getWorkspaceProductStatusLabel(metadata, status) {
  return getMetadataLabel(
    metadata?.workspaceProductStatuses,
    status,
    status ?? 'Non renseigné',
  );
}

function getCategoryStatusLabel(metadata, status) {
  return getMetadataLabel(
    metadata?.productCategoryStatuses,
    status,
    status ?? 'Non renseigné',
  );
}

function getReferenceUnitLabel(metadata, unit) {
  return getMetadataLabel(metadata?.referenceUnits, unit, unit ?? 'Non renseignée');
}

function getProductStatusTone(status) {
  if (status === 'ACTIVE') return 'success';
  return 'neutral';
}

function getConservationTypeLabel(metadata, conservationType) {
  return getMetadataLabel(
    metadata?.conservationTypes,
    conservationType,
    conservationType ?? '—',
  );
}

function getVariantLabel(variant) {
  return variant?.name ?? 'Aucune référence exploitable';
}

function getReferenceLabel(_metadata, product, variant) {
  return variant?.name ?? product?.name ?? 'Produit';
}

function getProductVariantSearchLabel(product, variant, metadata) {
  return getReferenceLabel(metadata, product, variant);
}

function formatYield(value) {
  return value === null || value === undefined ? 'Non renseigné' : String(value) + ' %';
}

const IMPORT_CLASSIFICATION_PRESENTATION = Object.freeze({
  ATTACH_EXISTING: Object.freeze({
    label: 'Référence existante',
    description: 'La référence existe déjà dans le référentiel.',
    tone: 'success',
  }),
  CREATE_PRODUCT: Object.freeze({
    label: 'Nouveau Produit',
    description: 'Une nouvelle identité Produit sera créée après confirmation.',
    tone: 'warning',
  }),
  CREATE_VARIANT: Object.freeze({
    label: 'Nouvelle référence',
    description: 'Une nouvelle référence sera créée après confirmation.',
    tone: 'warning',
  }),
  REVIEW_REQUIRED: Object.freeze({
    label: 'Revue requise',
    description: 'La ligne nécessite une décision ou une revue du référentiel avant publication.',
    tone: 'warning',
  }),
  INVALID: Object.freeze({
    label: 'Ligne invalide',
    description: 'La ligne doit être corrigée avant import.',
    tone: 'destructive',
  }),
});

function getImportClassificationPresentation(classification) {
  return IMPORT_CLASSIFICATION_PRESENTATION[classification]
    ?? {
      label: classification ?? 'État inconnu',
      description: 'État non reconnu par cette version de l’interface.',
      tone: 'neutral',
    };
}

const PRODUCT_EVENT_LABELS = Object.freeze({
  PRODUCT_CREATED: 'Produit créé',
  PRODUCT_APPROVED: 'Produit activé (historique)',
  PRODUCT_REJECTED: 'Produit rejeté (historique)',
  PRODUCT_UPDATED: 'Produit corrigé',
  PRODUCT_ARCHIVED: 'Produit archivé',
  PRODUCT_REACTIVATED: 'Produit réactivé',
  VARIANT_CREATED: 'Référence créée',
  VARIANT_APPROVED: 'Référence activée (historique)',
  VARIANT_REJECTED: 'Référence rejetée (historique)',
  VARIANT_UPDATED: 'Référence corrigée',
  VARIANT_ARCHIVED: 'Référence archivée',
  VARIANT_REACTIVATED: 'Référence réactivée',
  VARIETY_CREATED: 'Variété créée',
  VARIETY_UPDATED: 'Variété corrigée',
  VARIETY_ARCHIVED: 'Variété archivée',
  VARIETY_REACTIVATED: 'Variété réactivée',
  CHARACTERISTIC_CREATED: 'Caractéristique créée',
  CHARACTERISTIC_UPDATED: 'Caractéristique corrigée',
  CHARACTERISTIC_ARCHIVED: 'Caractéristique archivée',
  CHARACTERISTIC_REACTIVATED: 'Caractéristique réactivée',
  CONTRIBUTION_SUBMITTED: 'Contribution soumise',
  CONTRIBUTION_APPROVED: 'Contribution approuvée',
  CONTRIBUTION_REJECTED: 'Contribution refusée',
  CATEGORY_CREATED: 'Catégorie créée',
  CATEGORY_UPDATED: 'Catégorie renommée',
  CATEGORY_ARCHIVED: 'Catégorie archivée',
  CATEGORY_REACTIVATED: 'Catégorie réactivée',
});

function getProductEventLabel(action) {
  return PRODUCT_EVENT_LABELS[action] ?? 'Événement Produit';
}

function getApiErrorMessage(error, fallback = 'Une erreur est survenue.') {
  return error?.data?.message ?? fallback;
}

export {
  IMPORT_CLASSIFICATION_PRESENTATION,
  PRODUCT_EVENT_LABELS,
  createValueLabelMap,
  formatYield,
  getApiErrorMessage,
  getCategoryStatusLabel,
  getConservationTypeLabel,
  getImportClassificationPresentation,
  getMetadataLabel,
  getProductEventLabel,
  getProductStatusLabel,
  getReferenceLabel,
  getProductStatusTone,
  getProductVariantSearchLabel,
  getReferenceUnitLabel,
  getVariantLabel,
  getWorkspaceProductStatusLabel,
};
