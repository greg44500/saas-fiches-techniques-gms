const TECHNICAL_SHEET_STATUS_PRESENTATION = Object.freeze({
  ACTIVE: Object.freeze({
    label: 'Active',
    tone: 'success',
  }),
  ARCHIVED: Object.freeze({
    label: 'Archivée',
    tone: 'archived',
  }),
  DELETED: Object.freeze({
    label: 'Corbeille',
    tone: 'destructive',
  }),
});

const TECHNICAL_SHEET_VALUATION_PRESENTATION = Object.freeze({
  NOT_VALUED: Object.freeze({
    label: 'Non valorisée',
    tone: 'alert',
  }),
  PARTIAL: Object.freeze({
    label: 'Valorisation incomplète',
    tone: 'warning',
  }),
  COMPLETE: Object.freeze({
    label: 'Valorisée',
    tone: 'success',
  }),
  STALE: Object.freeze({
    label: 'Calcul à actualiser',
    tone: 'warning',
  }),
});

const LINE_VALUATION_PRESENTATION = Object.freeze({
  UNRESOLVED: Object.freeze({
    label: 'Article à choisir',
    tone: 'warning',
  }),
  NO_PRICE: Object.freeze({
    label: 'Prix indisponible',
    tone: 'destructive',
  }),
  VALUED: Object.freeze({
    label: 'Valorisée',
    tone: 'success',
  }),
  STALE: Object.freeze({
    label: 'Calcul à actualiser',
    tone: 'warning',
  }),
});

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

function getTechnicalSheetStatusPresentation(status) {
  return TECHNICAL_SHEET_STATUS_PRESENTATION[status] ?? {
    label: status ?? 'Statut inconnu',
    tone: 'neutral',
  };
}

function getTechnicalSheetValuationPresentation(status) {
  return TECHNICAL_SHEET_VALUATION_PRESENTATION[status] ?? {
    label: status ?? 'État inconnu',
    tone: 'neutral',
  };
}

function getLineValuationPresentation(status) {
  return LINE_VALUATION_PRESENTATION[status] ?? {
    label: status ?? 'État inconnu',
    tone: 'neutral',
  };
}

function formatMinorCurrency(value, currency = 'EUR') {
  if (!Number.isInteger(value)) return 'Non calculé';

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(value / 100);
}

function formatDecimalCurrency(value, currency = 'EUR') {
  if (value === null || value === undefined || value === '') {
    return 'Non calculé';
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return 'Non calculé';

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
  LINE_VALUATION_PRESENTATION,
  TECHNICAL_SHEET_STATUS_PRESENTATION,
  TECHNICAL_SHEET_VALUATION_PRESENTATION,
  basisPointsToInput,
  formatBasisPoints,
  formatDecimalCurrency,
  formatMinorCurrency,
  minorToInput,
  percentInputToBasisPoints,
  priceInputToMinor,
  getLineValuationPresentation,
  getTechnicalSheetActionAvailability,
  getTechnicalSheetApiErrorMessage,
  getTechnicalSheetStatusPresentation,
  getTechnicalSheetValuationPresentation,
};
