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

function getVariantLabel(variant) {
  const parts = [
    variant?.form,
    variant?.processingState,
    variant?.preservation,
  ].filter(Boolean);

  return parts.join(' · ') || 'Déclinaison standard';
}

function formatYield(value) {
  return value === null || value === undefined ? 'Non renseigné' : String(value) + ' %';
}

const IMPORT_CLASSIFICATION_PRESENTATION = Object.freeze({
  ATTACH_EXISTING: Object.freeze({
    label: 'Référence existante',
    description: 'La déclinaison existe déjà dans le référentiel.',
    tone: 'success',
  }),
  CREATE_PRODUCT: Object.freeze({
    label: 'Nouveau Produit',
    description: 'Une nouvelle identité Produit sera créée après confirmation.',
    tone: 'warning',
  }),
  CREATE_VARIANT: Object.freeze({
    label: 'Nouvelle déclinaison',
    description: 'Une nouvelle déclinaison sera créée après confirmation.',
    tone: 'warning',
  }),
  REVIEW_REQUIRED: Object.freeze({
    label: 'Décision requise',
    description: 'Des Produits proches doivent être examinés avant confirmation.',
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
  VARIANT_CREATED: 'Déclinaison créée',
  VARIANT_APPROVED: 'Déclinaison activée (historique)',
  VARIANT_REJECTED: 'Déclinaison rejetée (historique)',
  VARIANT_UPDATED: 'Déclinaison corrigée',
  VARIANT_ARCHIVED: 'Déclinaison archivée',
  VARIANT_REACTIVATED: 'Déclinaison réactivée',
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
  getImportClassificationPresentation,
  getMetadataLabel,
  getProductEventLabel,
  getProductStatusLabel,
  getProductStatusTone,
  getReferenceUnitLabel,
  getVariantLabel,
  getWorkspaceProductStatusLabel,
};
