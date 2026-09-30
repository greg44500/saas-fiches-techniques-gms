import {
  getReferenceUnitLabel,
} from '@/features/products/lib/product-presentation';

function getApiErrorMessage(error, fallback = 'Une erreur est survenue.') {
  return error?.data?.message ?? fallback;
}

function getSupplierScopeLabel(scope) {
  if (scope === 'GLOBAL_SHARED') return 'Partagé';
  if (scope === 'WORKSPACE_PRIVATE') return 'Privé';
  return scope ?? 'Non renseigné';
}

function getSupplierOriginLabel(scope) {
  if (scope === 'GLOBAL_SHARED') return 'Référentiel partagé';
  if (scope === 'WORKSPACE_PRIVATE') return 'Cet espace de travail';
  return 'Origine non renseignée';
}

function getSupplierStatusLabel(status) {
  if (status === 'ACTIVE') return 'Actif';
  if (status === 'ARCHIVED') return 'Archivé';
  return status ?? 'Non renseigné';
}

function getSupplierStatusTone(status) {
  return status === 'ACTIVE' ? 'success' : 'neutral';
}

function formatPackaging(packaging) {
  if (!packaging) return 'Non renseigné';

  const parts = [];

  if (packaging.containerType) parts.push(packaging.containerType);
  if (packaging.unitCount) parts.push(String(packaging.unitCount) + ' unité(s)');
  if (packaging.quantityPerUnit && packaging.unit) {
    parts.push(
      String(packaging.quantityPerUnit)
      + ' '
      + getReferenceUnitLabel(null, packaging.unit),
    );
  }
  if (packaging.totalQuantity && packaging.unit) {
    parts.push(
      'total '
      + String(packaging.totalQuantity)
      + ' '
      + getReferenceUnitLabel(null, packaging.unit),
    );
  }
  if (packaging.netWeight && packaging.netWeightUnit) {
    parts.push(
      'net '
      + String(packaging.netWeight)
      + ' '
      + getReferenceUnitLabel(null, packaging.netWeightUnit),
    );
  }
  if (packaging.drainedNetWeight && packaging.drainedNetWeightUnit) {
    parts.push(
      'égoutté '
      + String(packaging.drainedNetWeight)
      + ' '
      + getReferenceUnitLabel(null, packaging.drainedNetWeightUnit),
    );
  }

  return parts.length > 0 ? parts.join(' · ') : 'Non renseigné';
}

function formatPrice(
  price,
  { hideDefaultCurrency = false } = {},
) {
  if (!price) return 'Indisponible';

  const amount = price.normalizedAmount ?? price.sourceAmount;
  const unit = price.normalizedAmount
    ? price.normalizedUnit
    : price.sourceBasis;

  if (!amount) return 'Indisponible';

  const currency = price.currency ?? 'EUR';
  const currencyLabel = (
    hideDefaultCurrency && currency === 'EUR'
      ? ''
      : ' ' + currency
  );

  return Number(amount).toLocaleString('fr-FR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }) + currencyLabel + ' / '
    + (unit ? getReferenceUnitLabel(null, unit) : '—');
}

function getMatchStatusLabel(status) {
  const labels = {
    MATCHED: 'Rapproché',
    UNMATCHED: 'Non rapproché',
    AMBIGUOUS: 'Ambigu',
    IGNORED: 'Ignoré',
  };

  return labels[status] ?? status ?? 'Non renseigné';
}

function getImportClassificationLabel(classification) {
  const labels = {
    MATCHED: 'Article existant',
    CREATE_ARTICLE: 'Nouvel Article',
    UNMATCHED: 'Non rapproché',
    AMBIGUOUS: 'Ambigu',
    IGNORED: 'Ignoré',
    INVALID: 'Invalide',
  };

  return labels[classification] ?? classification ?? 'Inconnu';
}

export {
  formatPackaging,
  formatPrice,
  getApiErrorMessage,
  getImportClassificationLabel,
  getMatchStatusLabel,
  getSupplierOriginLabel,
  getSupplierScopeLabel,
  getSupplierStatusLabel,
  getSupplierStatusTone,
};
