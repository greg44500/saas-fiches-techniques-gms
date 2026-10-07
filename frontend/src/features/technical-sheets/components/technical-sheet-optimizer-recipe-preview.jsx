import { Button } from '@/components/ui/button';
import {
  findProjectionLine,
  formatCurrency,
  formatPercent,
  formatQuantity,
  formatSignedCurrency,
} from '@/features/technical-sheets/lib/technical-sheet-optimizer';

function safePercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, number),
  );
}

function costDeltaClass(delta) {
  if (delta < 0) {
    return 'text-primary';
  }

  if (delta > 0) {
    return 'text-destructive';
  }

  return 'text-muted-foreground';
}

function TechnicalSheetOptimizerRecipePreview({
  after,
  baseline,
  onOpenControls,
  onSelect,
  selectedLineId,
}) {
  const ingredients =
    (baseline?.lines ?? [])
      .filter(
        (line) =>
          line.kind === 'INGREDIENT',
      );

  return (
    <section
      aria-label="Fiche technique simulée"
      className="overflow-hidden rounded-xl border border-border bg-card xl:flex xl:min-h-0 xl:flex-1 xl:flex-col"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">
            Fiche technique simulée
          </h2>
          <p className="text-xs text-muted-foreground">
            Sélectionnez une ligne pour la régler sans quitter l’Atelier.
          </p>
        </div>
        <Button
          className="xl:hidden"
          onClick={onOpenControls}
          size="sm"
          type="button"
          variant="outline"
        >
          Réglages
        </Button>
      </div>

      <div className="divide-y divide-border xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
        {ingredients.map((line) => {
          const next =
            findProjectionLine(
              after,
              line.id,
            )
            ?? line;
          const productChanged =
            (
              next.productVariantId
              !== line.productVariantId
            )
            || (
              next.productVariantName
              !== line.productVariantName
            );
          const selected =
            selectedLineId
            === line.id;
          const beforeShare =
            safePercent(
              line
                .materialCostSharePercent,
            );
          const afterShare =
            safePercent(
              next
                .materialCostSharePercent,
            );
          const costDelta =
            Number(next.lineCostHt)
            - Number(line.lineCostHt);

          return (
            <button
              aria-pressed={selected}
              className={
                'w-full px-4 py-3 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring '
                + (
                  selected
                    ? 'bg-muted/45'
                    : ''
                )
              }
              key={line.id}
              onClick={() =>
                onSelect(line.id)}
              type="button"
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {next
                      .productVariantName
                      ?? line
                        .productVariantName}
                  </p>
                  {productChanged && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      Avant : {line.productVariantName}
                    </p>
                  )}
                </div>

                <p className="whitespace-nowrap text-sm tabular-nums">
                  <span className="text-muted-foreground">
                    Quantité&nbsp;
                  </span>
                  {formatQuantity(
                    line.netQuantity,
                    line.referenceUnit,
                  )}
                  {' → '}
                  <strong>
                    {formatQuantity(
                      next.netQuantity,
                      next.referenceUnit,
                    )}
                  </strong>
                  {' '}
                  {next.referenceUnit}
                </p>

                <div className="min-w-24 text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatCurrency(
                      next.lineCostHt,
                    )}
                  </p>
                  <p
                    className={
                      'text-xs font-medium tabular-nums '
                      + costDeltaClass(
                        costDelta,
                      )
                    }
                  >
                    {formatSignedCurrency(
                      costDelta,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-2">
                <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-muted-foreground">
                    Contribution CM
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatPercent(
                      beforeShare,
                    )}
                    {' → '}
                    {formatPercent(
                      afterShare,
                    )}
                  </span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/25"
                    style={{
                      width:
                        beforeShare + '%',
                    }}
                  />
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-primary/75"
                    style={{
                      width:
                        afterShare + '%',
                    }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export {
  TechnicalSheetOptimizerRecipePreview,
};
