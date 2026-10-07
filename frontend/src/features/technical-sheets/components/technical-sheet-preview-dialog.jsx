import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DataTable,
} from '@/components/data-display/data-table';
import {
  useGetTechnicalSheetValidationQuery,
} from '@/features/technical-sheets/api/technical-sheets-api';
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

function TechnicalSheetPreviewDialog({
  dossierId,
  onClose,
  open,
  sheet,
  workspaceId,
}) {
  const validationId =
    sheet?.currentValidatedStateId
    ?? null;
  const validationQuery =
    useGetTechnicalSheetValidationQuery(
      {
        workspaceId,
        dossierId,
        technicalSheetId:
          sheet?.id,
        validationId,
      },
      {
        skip:
          !open
          || !sheet?.id
          || !validationId,
      },
    );
  const validation =
    validationQuery.data;
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
    <DialogRoot
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Prévisualisation de la Fiche technique
            </DialogTitle>
            <DialogDescription>
              Consultation de la version officielle. Les éventuelles modifications en cours ne sont pas affichées ici.
            </DialogDescription>
          </DialogHeader>

          {validationQuery.isLoading && !validation ? (
            <p
              aria-live="polite"
              className="mt-5 text-sm text-muted-foreground"
              role="status"
            >
              Chargement de la version…
            </p>
          ) : validationQuery.isError || !validation ? (
            <div
              className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
              role="alert"
            >
              <p className="text-sm">
                La version n’a pas pu être chargée.
              </p>
              <Button
                className="mt-3"
                onClick={() => validationQuery.refetch()}
                size="sm"
                type="button"
                variant="outline"
              >
                Réessayer
              </Button>
            </div>
          ) : (
            <div className="mt-5 space-y-6">
              <section>
                <h3 className="text-xl font-semibold">
                  {sheetSnapshot?.name
                    ?? sheet?.name
                    ?? 'Fiche technique'}
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
                  Analyse figée
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
          )}

          <DialogFooter>
            <DialogClose
              render={(
                <Button
                  type="button"
                  variant="outline"
                />
              )}
            >
              Fermer
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export {
  TechnicalSheetPreviewDialog,
  decimalValue,
  formatQuantity,
  quantityLabel,
};
