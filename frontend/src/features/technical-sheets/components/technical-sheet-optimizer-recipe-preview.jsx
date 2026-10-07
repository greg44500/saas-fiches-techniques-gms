import { Button } from '@/components/ui/button';
import {
  findProjectionLine,
  formatCurrency,
  formatPercent,
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
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">
            Fiche technique simulée
          </h2>
          <p className="text-xs text-muted-foreground">
            Sélectionnez un ingrédient pour affiner ses garde-fous, son Produit ou son approvisionnement.
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

      <div className="divide-y divide-border">
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
          const changed =
            productChanged
            || next.netQuantity
              !== line.netQuantity
            || next.lineCostHt
              !== line.lineCostHt
            || next.supplierArticleId
              !== line.supplierArticleId;
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
                'w-full p-4 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring '
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
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {next.productVariantName
                      ?? line.productVariantName}
                  </p>
                  {productChanged && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Avant : {line.productVariantName}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatCurrency(
                      next.lineCostHt,
                    )}
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {changed
                      ? (
                        (costDelta > 0 ? '+' : '')
                        + formatCurrency(
                          costDelta,
                        )
                      )
                      : 'Stable'}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">
                      Contribution au coût matière
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
                  <div className="relative h-2 overflow-hidden rounded-full bg-muted">
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

                <p className="whitespace-nowrap text-sm tabular-nums">
                  <span className="text-muted-foreground">
                    Quantité&nbsp;
                  </span>
                  {line.netQuantity}
                  {' → '}
                  <strong>
                    {next.netQuantity}
                  </strong>
                  {' '}
                  {next.referenceUnit}
                </p>
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
