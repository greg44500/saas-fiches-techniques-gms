import {
  DataTable,
} from '@/components/data-display/data-table';
import {
  formatBasisPoints,
  formatDecimalCurrency,
  formatMinorCurrency,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

function decimalValue(value) {
  return value?.$numberDecimal
    ?? value
    ?? null;
}

function quantityLabel({
  countUnitLabelPlural,
  countUnitLabelSingular,
  quantity,
  unit,
}) {
  if (unit !== 'UNIT') {
    return unit ?? '';
  }

  const numeric =
    Number(decimalValue(quantity));

  if (
    Number.isFinite(numeric)
    && numeric === 1
    && countUnitLabelSingular
  ) {
    return countUnitLabelSingular;
  }

  return countUnitLabelPlural
    ?? countUnitLabelSingular
    ?? 'pièces';
}

function formatQuantity({
  countUnitLabelPlural,
  countUnitLabelSingular,
  quantity,
  unit,
}) {
  const value = decimalValue(quantity);

  if (
    value === null
    || value === undefined
  ) {
    return 'NC';
  }

  return (
    String(value).replace('.', ',')
    + ' '
    + quantityLabel({
      countUnitLabelPlural,
      countUnitLabelSingular,
      quantity: value,
      unit,
    })
  ).trim();
}

function TechnicalSheetValidatedContent({
  fallbackName = 'Fiche technique',
  showIdentity = true,
  validation,
}) {
  const sheetSnapshot =
    validation?.sheetSnapshot;
  const economicSnapshot =
    validation?.economicSnapshot;
  const lines =
    validation?.linesSnapshot
    ?? [];
  const hasNotes =
    lines.some(
      (line) =>
        Boolean(
          line.note?.trim?.(),
        ),
    );
  const columns = [
    {
      id: 'product',
      header: 'Produit',
      cell: (line) =>
        line.productVariantName,
    },
    {
      id: 'quantity',
      header: 'Quantité',
      cell: (line) => formatQuantity({
        countUnitLabelPlural:
          line.countUnitLabelPlural,
        countUnitLabelSingular:
          line.countUnitLabelSingular,
        quantity: line.netQuantity,
        unit: line.inputUnit,
      }),
    },
    {
      id: 'price',
      header: 'Prix HT',
      cell: (line) => (
        formatDecimalCurrency(
          decimalValue(
            line.normalizedPriceHt,
          ),
        )
        + ' / '
        + quantityLabel({
          countUnitLabelPlural:
            line.countUnitLabelPlural,
          countUnitLabelSingular:
            line.countUnitLabelSingular,
          quantity: 1,
          unit:
            line.normalizedUnit,
        })
      ),
    },
    {
      id: 'cost',
      header: 'Coût HT',
      cell: (line) =>
        formatDecimalCurrency(
          decimalValue(
            line.lineCostHt,
          ),
        ),
    },
    ...(hasNotes
      ? [{
          id: 'note',
          header: 'Note',
          cell: (line) =>
            line.note ?? '',
        }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {showIdentity && (
        <section>
          <h3 className="text-xl font-semibold">
            {sheetSnapshot?.name
              ?? fallbackName}
          </h3>
          {sheetSnapshot?.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {sheetSnapshot.description}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Version du{' '}
            {new Date(
              validation.validatedAt,
            ).toLocaleString('fr-FR')}
          </p>
        </section>
      )}

      {!showIdentity && (
        <section>
          {sheetSnapshot?.description && (
            <p className="text-sm text-muted-foreground">
              {sheetSnapshot.description}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Version du{' '}
            {new Date(
              validation.validatedAt,
            ).toLocaleString('fr-FR')}
          </p>
        </section>
      )}

      <section
        aria-label="Production"
        className="grid gap-3 sm:grid-cols-3"
      >
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">
            Quantité produite
          </p>
          <p className="mt-1 font-semibold">
            {formatQuantity({
              quantity:
                sheetSnapshot
                  ?.productionQuantity,
              unit:
                sheetSnapshot
                  ?.productionUnit,
            })}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">
            Portions / pièce
          </p>
          <p className="mt-1 font-semibold">
            {String(
              decimalValue(
                sheetSnapshot
                  ?.portionsPerProductionUnit,
              )
              ?? 'NC',
            ).replace('.', ',')}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">
            Total portions
          </p>
          <p className="mt-1 font-semibold">
            {String(
              decimalValue(
                economicSnapshot
                  ?.totalPortions,
              )
              ?? 'NC',
            ).replace('.', ',')}
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">
          Composition
        </h3>
        <div className="overflow-hidden rounded-lg border border-border">
          <DataTable
            aria-label="Composition"
            columns={columns}
            data={lines}
            density="compact"
            emptyContent="Aucune ligne dans cette version."
            getRowKey={(line, index) => (
              line._id?.toString?.()
              ?? line.id
              ?? line.productVariantId?.toString?.()
              ?? index
            )}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">
          Analyse
        </h3>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-border p-3">
            <dt className="text-xs text-muted-foreground">
              Coût matière HT
            </dt>
            <dd className="mt-1 font-semibold">
              {formatDecimalCurrency(
                decimalValue(
                  economicSnapshot
                    ?.materialCostHt,
                ),
              )}
            </dd>
          </div>
          <div className="rounded-lg border border-border p-3">
            <dt className="text-xs text-muted-foreground">
              Coût Économat HT
            </dt>
            <dd className="mt-1 font-semibold">
              {formatDecimalCurrency(
                decimalValue(
                  economicSnapshot
                    ?.economatCostHt,
                ),
              )}
            </dd>
          </div>
          <div className="rounded-lg border border-border p-3">
            <dt className="text-xs text-muted-foreground">
              Coût de fabrication HT
            </dt>
            <dd className="mt-1 font-semibold">
              {formatDecimalCurrency(
                decimalValue(
                  economicSnapshot
                    ?.manufacturingCostHt,
                ),
              )}
            </dd>
          </div>
          <div className="rounded-lg border border-border p-3">
            <dt className="text-xs text-muted-foreground">
              Prix conseillé TTC
            </dt>
            <dd className="mt-1 font-semibold">
              {formatMinorCurrency(
                economicSnapshot
                  ?.advisedPriceTtcMinor,
              )}
            </dd>
          </div>
          <div className="rounded-lg border border-border p-3">
            <dt className="text-xs text-muted-foreground">
              Prix retenu TTC
            </dt>
            <dd className="mt-1 font-semibold">
              {formatMinorCurrency(
                economicSnapshot
                  ?.finalPriceTtcMinor,
              )}
            </dd>
          </div>
          <div className="rounded-lg border border-border p-3">
            <dt className="text-xs text-muted-foreground">
              Marge réelle
            </dt>
            <dd className="mt-1 font-semibold">
              {formatBasisPoints(
                economicSnapshot
                  ?.actualMarginBasisPoints,
              )}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

export {
  TechnicalSheetValidatedContent,
  decimalValue,
  formatQuantity,
  quantityLabel,
};
