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

function getRejectionReasonLabel(metadata, reason) {
  return getMetadataLabel(
    metadata?.rejectionReasons,
    reason,
    reason ?? 'Non renseigné',
  );
}

function getProductStatusTone(status) {
  if (status === 'ACTIVE') return 'success';
  if (status === 'PENDING_REVIEW') return 'warning';
  if (status === 'REJECTED') return 'destructive';
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
    description: 'La déclinaison peut être ajoutée au catalogue.',
    tone: 'success',
  }),
  EXISTING_PENDING: Object.freeze({
    label: 'Déjà en validation',
    description: 'Une contribution identique est déjà en cours de validation.',
    tone: 'warning',
  }),
  PROPOSE_PRODUCT: Object.freeze({
    label: 'Nouveau produit',
    description: 'Une nouvelle identité Produit sera proposée à validation.',
    tone: 'warning',
  }),
  PROPOSE_VARIANT: Object.freeze({
    label: 'Nouvelle déclinaison',
    description: 'Une nouvelle déclinaison sera proposée à validation.',
    tone: 'warning',
  }),
  REVIEW_REQUIRED: Object.freeze({
    label: 'Décision requise',
    description: 'Des produits proches doivent être examinés avant confirmation.',
    tone: 'warning',
  }),
  PRIVATE_CONFLICT: Object.freeze({
    label: 'Conflit non accessible',
    description: 'Une référence équivalente existe mais ne peut pas être exposée.',
    tone: 'destructive',
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
  PRODUCT_APPROVED: 'Produit validé',
  PRODUCT_REJECTED: 'Produit rejeté',
  PRODUCT_UPDATED: 'Produit corrigé',
  PRODUCT_ARCHIVED: 'Produit archivé',
  PRODUCT_REACTIVATED: 'Produit réactivé',
  VARIANT_APPROVED: 'Déclinaison validée',
  VARIANT_REJECTED: 'Déclinaison rejetée',
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
  getRejectionReasonLabel,
  getVariantLabel,
  getWorkspaceProductStatusLabel,
};
