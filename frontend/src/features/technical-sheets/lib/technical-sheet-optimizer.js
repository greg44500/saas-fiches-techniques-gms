function normalizeDecimalInput(value) {
  return String(value ?? '')
    .trim()
    .replace(',', '.');
}

const POSITIVE_DECIMAL_PATTERN =
  /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

function optionalDecimalInput(value) {
  const normalized =
    normalizeDecimalInput(value);

  return normalized || null;
}

function isValidPositiveDecimalInput(
  value,
  {
    optional = true,
  } = {},
) {
  const normalized =
    normalizeDecimalInput(value);

  if (!normalized) {
    return optional;
  }

  return (
    POSITIVE_DECIMAL_PATTERN
      .test(normalized)
    && Number(normalized) > 0
  );
}

function buildOptimizerLines(context) {
  return (context?.draft?.lines ?? [])
    .filter((line) => line.kind === 'INGREDIENT')
    .map((line) => {
      const persistedMinimum =
        line.optimization?.minNetQuantity
        ?? '';
      const persistedMaximum =
        line.optimization?.maxNetQuantity
        ?? '';
      const referenceQuantity =
        Number(
          normalizeDecimalInput(
            line.netQuantity,
          ),
        );
      const minimumQuantity =
        Number(
          normalizeDecimalInput(
            persistedMinimum,
          ),
        );
      const maximumQuantity =
        Number(
          normalizeDecimalInput(
            persistedMaximum,
          ),
        );
      const legacyPinnedEnvelope =
        !line.optimization?.locked
        && persistedMinimum !== ''
        && persistedMaximum !== ''
        && Number.isFinite(
          referenceQuantity,
        )
        && Number.isFinite(
          minimumQuantity,
        )
        && Number.isFinite(
          maximumQuantity,
        )
        && minimumQuantity
          === referenceQuantity
        && maximumQuantity
          === referenceQuantity;

      return {
        lineId: line.id,
        economicAdjustmentPercent: 0,
        minNetQuantity:
          legacyPinnedEnvelope
            ? ''
            : persistedMinimum,
        maxNetQuantity:
          legacyPinnedEnvelope
            ? ''
            : persistedMaximum,
        locked: Boolean(
          line.optimization?.locked,
        ),
        localNetQuantity: '',
        productVariantId: null,
        supplierArticleId: null,
        supplierArticleTouched: false,
      };
    });
}

function buildOptimizationRequest({
  autoOptions,
  draftRevision,
  lines,
  mode,
}) {
  const invalidLine =
    lines.find((line) => (
      !Number.isInteger(
        Number(
          line.economicAdjustmentPercent
          ?? 0,
        ),
      )
      || !isValidPositiveDecimalInput(
        line.minNetQuantity,
      )
      || !isValidPositiveDecimalInput(
        line.maxNetQuantity,
      )
      || !isValidPositiveDecimalInput(
        line.localNetQuantity,
      )
    ));

  if (invalidLine) {
    return null;
  }

  return {
    expectedRevision: draftRevision,
    mode,
    lines: lines.map((line) => ({
      lineId: line.lineId,
      economicAdjustmentPercent:
        Number(
          line.economicAdjustmentPercent
          ?? 0,
        ),
      minNetQuantity:
        optionalDecimalInput(
          line.minNetQuantity,
        ),
      maxNetQuantity:
        optionalDecimalInput(
          line.maxNetQuantity,
        ),
      locked: Boolean(line.locked),
      ...(line.localNetQuantity
        ? {
          localNetQuantity:
            normalizeDecimalInput(
              line.localNetQuantity,
            ),
        }
        : {}),
      ...(line.productVariantId
        ? {
          productVariantId:
            line.productVariantId,
        }
        : {}),
      ...(line.supplierArticleTouched
        ? {
          supplierArticleId:
            line.supplierArticleId,
        }
        : {}),
    })),
    autoOptions: {
      adjustQuantities:
        Boolean(
          autoOptions.adjustQuantities,
        ),
      productAlternatives:
        Boolean(
          autoOptions.productAlternatives,
        ),
      sourcingAlternatives:
        Boolean(
          autoOptions.sourcingAlternatives,
        ),
    },
  };
}

function formatCurrency(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return '—';

  return new Intl.NumberFormat(
    'fr-FR',
    {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    },
  ).format(number);
}

function formatPercent(value, digits = 1) {
  const number = Number(value);

  if (!Number.isFinite(number)) return '—';

  return new Intl.NumberFormat(
    'fr-FR',
    {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    },
  ).format(number) + ' %';
}

function formatQuantity(
  value,
  referenceUnit,
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  const unit =
    String(referenceUnit ?? '')
      .toUpperCase();
  const maximumFractionDigits =
    ['G', 'ML'].includes(unit)
      ? 0
      : ['KG', 'L'].includes(unit)
        ? 3
        : 2;

  return new Intl.NumberFormat(
    'fr-FR',
    {
      maximumFractionDigits,
      minimumFractionDigits: 0,
    },
  ).format(number);
}

function formatSignedCurrency(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  return (
    (number > 0 ? '+' : '')
    + formatCurrency(number)
  );
}

function formatSignedPercent(
  value,
  digits = 1,
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  return (
    (number > 0 ? '+' : '')
    + formatPercent(number, digits)
  );
}

function formatSignedPercentPoints(
  value,
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  return (
    (number > 0 ? '+' : '')
    + new Intl.NumberFormat(
      'fr-FR',
      {
        maximumFractionDigits: 1,
      },
    ).format(number)
    + ' pt'
  );
}

function findProjectionLine(
  projection,
  lineId,
) {
  return (projection?.lines ?? [])
    .find((line) => line.id === lineId)
    ?? null;
}

function findOptimizerLine(
  lines,
  lineId,
) {
  return lines.find(
    (line) => line.lineId === lineId,
  ) ?? null;
}

export {
  buildOptimizationRequest,
  buildOptimizerLines,
  findOptimizerLine,
  findProjectionLine,
  formatCurrency,
  formatPercent,
  formatQuantity,
  formatSignedCurrency,
  formatSignedPercent,
  formatSignedPercentPoints,
  isValidPositiveDecimalInput,
  normalizeDecimalInput,
  optionalDecimalInput,
};
