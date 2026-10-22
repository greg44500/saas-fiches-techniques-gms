import {
  getReferenceUnitLabel,
  getVariantReferenceUnitLabel,
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

function getPackagingUnitLabel(packaging, productVariant, quantity) {
  if (packaging?.unit !== 'UNIT') {
    return getReferenceUnitLabel(null, packaging?.unit);
  }

  return getVariantReferenceUnitLabel(
    null,
    productVariant,
    { plural: Number(quantity) !== 1 },
  );
}

function formatPackaging(
  packaging,
  { productVariant = null, includeAggregateAmounts = true } = {},
) {
  if (!packaging) return 'Non renseigné';

  const parts = [];

  if (packaging.supplierLabel) {
    parts.push(packaging.supplierLabel);
  } else if (packaging.containerType) {
    parts.push(packaging.containerType);
  }
  if (
    packaging.unitCount
    && packaging.quantityPerUnit
    && packaging.unit
  ) {
    parts.push(
      String(packaging.unitCount)
      + ' × '
      + String(packaging.quantityPerUnit)
      + ' '
      + getPackagingUnitLabel(
        packaging,
        productVariant,
        packaging.quantityPerUnit,
      ),
    );
  } else if (packaging.unitCount) {
    parts.push(String(packaging.unitCount) + ' sous-unités');
  }
  if (includeAggregateAmounts && packaging.totalQuantity && packaging.unit) {
    parts.push(
      'total '
      + String(packaging.totalQuantity)
      + ' '
      + getPackagingUnitLabel(
        packaging,
        productVariant,
        packaging.totalQuantity,
      ),
    );
  }
  if (includeAggregateAmounts && packaging.netWeight && packaging.netWeightUnit) {
    parts.push(
      'net '
      + String(packaging.netWeight)
      + ' '
      + getReferenceUnitLabel(null, packaging.netWeightUnit),
    );
  }
  if (includeAggregateAmounts && packaging.drainedNetWeight && packaging.drainedNetWeightUnit) {
    parts.push(
      'égoutté '
      + String(packaging.drainedNetWeight)
      + ' '
      + getReferenceUnitLabel(null, packaging.drainedNetWeightUnit),
    );
  }

  return parts.length > 0 ? parts.join(' · ') : 'Non renseigné';
}

// Comparaison d'affichage exacte, sans Number ni déduction de conditionnement.
const massAsFraction = (value, unit) => {
  if (!['G', 'KG'].includes(unit)) return null;
  const match = String(value).match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) return null;
  const decimalPlaces = match[2]?.length ?? 0;
  return {
    numerator: BigInt(match[1] + (match[2] ?? '')) * (unit === 'KG' ? 1000n : 1n),
    denominator: 10n ** BigInt(decimalPlaces),
  };
};

const sameMass = (left, leftUnit, right, rightUnit) => {
  const a = massAsFraction(left, leftUnit);
  const b = massAsFraction(right, rightUnit);
  return Boolean(a && b && a.numerator * b.denominator === b.numerator * a.denominator);
};

/**
 * Infobulle M-004 : une information par ligne. La quantité totale calculée
 * reste visible uniquement si elle apporte autre chose que le poids net déclaré.
 * Aucune quantité métier ni donnée historique n'est modifiée.
 */
function getPackagingTooltipDetails(packaging, { productVariant = null } = {}) {
  const rows = [{
    label: 'Conditionnement',
    value: formatPackaging(packaging, {
      productVariant,
      includeAggregateAmounts: false,
    }),
  }];
  if (!packaging) return rows;

  const hasNetWeight = packaging.netWeight != null && packaging.netWeightUnit;
  const hasTotal = packaging.totalQuantity != null && packaging.unit;

  if (hasNetWeight) {
    rows.push({
      label: 'Poids net',
      value: String(packaging.netWeight) + ' '
        + getReferenceUnitLabel(null, packaging.netWeightUnit),
    });
  }
  if (hasTotal && (!hasNetWeight || !sameMass(
    packaging.totalQuantity, packaging.unit,
    packaging.netWeight, packaging.netWeightUnit,
  ))) {
    rows.push({
      label: 'Quantité totale calculée',
      value: String(packaging.totalQuantity) + ' '
        + getPackagingUnitLabel(packaging, productVariant, packaging.totalQuantity),
    });
  }
  if (packaging.drainedNetWeight != null && packaging.drainedNetWeightUnit) {
    rows.push({
      label: 'Poids net égoutté',
      value: String(packaging.drainedNetWeight) + ' '
        + getReferenceUnitLabel(null, packaging.drainedNetWeightUnit),
    });
  }
  return rows;
}

function formatPrice(
  price,
  {
    hideDefaultCurrency = false,
    productVariant = price?.productVariant
      ?? price?.supplierArticle?.productVariant
      ?? null,
  } = {},
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
    + (
      unit === 'UNIT'
        ? getVariantReferenceUnitLabel(null, productVariant)
        : unit
          ? getReferenceUnitLabel(null, unit)
          : '—'
    );
}

function formatSourcePrice(price) {
  if (!price?.sourceAmount) return 'Non renseigné';

  const amount = Number(price.sourceAmount).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });

  if (price.sourceBasis === 'PACKAGE') {
    return amount + ' € / '
      + (price.packaging?.containerType || 'conditionnement');
  }

  return amount + ' € / '
    + (
      price.sourceBasis === 'UNIT'
        ? getVariantReferenceUnitLabel(null, price.productVariant)
        : getReferenceUnitLabel(null, price.sourceBasis)
    );
}

function formatIndicativePriceSource(price) {
  const explicitOrganization = price?.sourceOrganization?.trim();
  if (explicitOrganization) return explicitOrganization;

  const rawSource = price?.source?.trim();
  if (!rawSource) return null;

  const technicalPartPatterns = [
    /^m\d{3}[-_]/i,
    /^(?:dataset|bootstrap|migration)\b/i,
    /^prix repère global$/i,
    /^corpus professionnel(?:\s+v\d+)?$/i,
    /^(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}$/i,
  ];

  const readableParts = rawSource
    .split(/\s+[·—]\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !technicalPartPatterns.some((pattern) => (
      pattern.test(part)
    )));

  return readableParts[0] ?? null;
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
  formatIndicativePriceSource,
  formatPackaging,
  getPackagingTooltipDetails,
  formatPrice,
  formatSourcePrice,
  getApiErrorMessage,
  getImportClassificationLabel,
  getMatchStatusLabel,
  getSupplierOriginLabel,
  getSupplierScopeLabel,
  getSupplierStatusLabel,
  getSupplierStatusTone,
};
