function normalizeDecimalInput(value) {
  return String(value ?? '')
    .trim()
    .replace(',', '.');
}

function optionalDecimalInput(value) {
  const normalized =
    normalizeDecimalInput(value);

  return normalized || null;
}

function buildOptimizerLines(context) {
  return (context?.draft?.lines ?? [])
    .filter((line) => line.kind === 'INGREDIENT')
    .map((line) => ({
      lineId: line.id,
      minNetQuantity:
        line.optimization?.minNetQuantity
        ?? '',
      maxNetQuantity:
        line.optimization?.maxNetQuantity
        ?? '',
      locked: Boolean(
        line.optimization?.locked,
      ),
      localNetQuantity: '',
      productVariantId: null,
      supplierArticleId: null,
      supplierArticleTouched: false,
    }));
}

function buildOptimizationRequest({
  autoOptions,
  curve,
  draftRevision,
  lines,
  mode,
}) {
  return {
    expectedRevision: draftRevision,
    mode,
    curve,
    lines: lines.map((line) => ({
      lineId: line.lineId,
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
  normalizeDecimalInput,
  optionalDecimalInput,
};
