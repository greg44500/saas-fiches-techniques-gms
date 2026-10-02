function getBackendPresentation(
  definitions,
  value,
  fallbackLabel,
) {
  const definition = (definitions ?? [])
    .find((entry) => entry.value === value);

  return definition ?? {
    value,
    label: value ?? fallbackLabel,
    tone: 'neutral',
  };
}

function getTechnicalSheetActionAvailability({
  status,
  hasDraft = false,
}) {
  return {
    update: status === 'ACTIVE',
    copy:
      status !== 'DELETED'
      && !hasDraft,
    archive: status === 'ACTIVE',
    reactivate: status === 'ARCHIVED',
    delete: status !== 'DELETED',
  };
}

function getTechnicalSheetStatusPresentation(
  status,
  definitions,
) {
  return getBackendPresentation(
    definitions,
    status,
    'Statut inconnu',
  );
}

function getTechnicalSheetValuationPresentation(
  status,
  definitions,
) {
  return getBackendPresentation(
    definitions,
    status,
    'État inconnu',
  );
}

function getTechnicalSheetValuationAttentionPresentation(
  status,
  definitions,
) {
  if (!status) return null;

  const definition = (definitions ?? [])
    .find((entry) => entry.value === status);

  if (definition?.validationEligible === true) {
    return null;
  }

  return getTechnicalSheetValuationPresentation(
    status,
    definitions,
  );
}

function getLineValuationPresentation(
  status,
  definitions,
) {
  return getBackendPresentation(
    definitions,
    status,
    'État inconnu',
  );
}

function formatMinorCurrency(value, currency = 'EUR') {
  if (!Number.isInteger(value)) return 'NC';

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(value / 100);
}

function formatDecimalCurrency(value, currency = 'EUR') {
  if (value === null || value === undefined || value === '') {
    return 'NC';
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return 'NC';

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(parsed);
}

function formatBasisPoints(value) {
  if (!Number.isInteger(value)) return 'Non renseignée';
  return (value / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }) + ' %';
}

function formatSignedBasisPointDelta(value) {
  if (!Number.isInteger(value)) return 'NC';

  const arrow = value > 0 ? '↑' : value < 0 ? '↓' : '—';
  const points = Math.abs(value) / 100;

  return arrow + ' ' + points.toLocaleString('fr-FR', {
    maximumFractionDigits: 2,
  }) + ' point' + (points > 1 ? 's' : '');
}

function basisPointsToInput(value) {
  if (!Number.isInteger(value)) return '';
  return String(value / 100);
}

function percentInputToBasisPoints(value) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;

  return Math.round(parsed * 100);
}

function minorToInput(value) {
  if (!Number.isInteger(value)) return '';
  return String(value / 100);
}

function priceInputToMinor(value) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;

  return Math.round(parsed * 100);
}

function getTechnicalSheetApiErrorMessage(
  error,
  fallback = 'Une erreur est survenue.',
) {
  return error?.data?.message ?? fallback;
}

export {
  basisPointsToInput,
  formatBasisPoints,
  formatDecimalCurrency,
  formatSignedBasisPointDelta,
  formatMinorCurrency,
  minorToInput,
  percentInputToBasisPoints,
  priceInputToMinor,
  getLineValuationPresentation,
  getTechnicalSheetActionAvailability,
  getTechnicalSheetApiErrorMessage,
  getTechnicalSheetStatusPresentation,
  getTechnicalSheetValuationAttentionPresentation,
  getTechnicalSheetValuationPresentation,
};
