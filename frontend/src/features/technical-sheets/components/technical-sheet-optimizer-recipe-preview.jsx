import { Button } from '@/components/ui/button';
import {
  findProjectionLine,
  formatCurrency,
  formatPercent,
  formatQuantity,
  formatSignedCurrency,
} from '@/features/technical-sheets/lib/technical-sheet-optimizer';

const LINE_KIND_LABELS = Object.freeze({
  INGREDIENT: 'Ingrédients',
  ECONOMAT: 'Économat',
});

function unitLabel(unit) {
  return {
    KG: 'kg',
    G: 'g',
    L: 'L',
    ML: 'ml',
    UNIT: 'unité',
  }[unit] ?? unit ?? '—';
}

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

function quantityChanged(before, after) {
  const left = Number(before);
  const right = Number(after);

  return (
    Number.isFinite(left)
    && Number.isFinite(right)
    && Math.abs(left - right) > 1e-9
  );
}

function TechnicalSheetOptimizerRecipePreview({
  after,
  baseline,
  draft,
  onOpenControls,
  onSelect,
  selectedLineId,
  sheet,
}) {
  const lines =
    baseline?.lines ?? [];
  const kinds = [
    ...new Set(
      lines.map((line) => line.kind),
    ),
  ];

  return (
    <section
      aria-label="Fiche technique simulée"
      className="overflow-hidden rounded-xl border border-border bg-card xl:flex xl:min-h-0 xl:flex-1 xl:flex-col"
    >
      <div className="shrink-0 border-b border-border bg-muted/10 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Fiche technique simulée
            </p>
            <h2 className="mt-0.5 truncate text-lg font-semibold">
              {sheet?.name ?? 'Fiche technique'}
            </h2>
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

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span>
            Production&nbsp;
            <strong className="font-medium text-foreground">
              {formatQuantity(
                draft?.productionQuantity,
                draft?.productionUnit,
              )}
              {' '}
              {unitLabel(
                draft?.productionUnit,
              )}
            </strong>
          </span>
          {draft?.totalPortions && (
            <span>
              Portions&nbsp;
              <strong className="font-medium text-foreground">
                {formatQuantity(
                  draft.totalPortions,
                  'UNIT',
                )}
              </strong>
            </span>
          )}
          <span>
            Lecture&nbsp;
            <strong className="font-medium text-foreground">
              résultat simulé
            </strong>
          </span>
        </div>
      </div>

      <div className="hidden shrink-0 border-b border-border bg-muted/25 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(8rem,.8fr)_4rem_minmax(7rem,.7fr)_minmax(7rem,.7fr)_5rem] lg:gap-3">
        <span>Produit</span>
        <span className="text-right">Quantité nette</span>
        <span className="text-center">U</span>
        <span className="text-right">PU HT</span>
        <span className="text-right">Coût HT</span>
        <span className="text-right">%CM</span>
      </div>

      <div className="xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
        {kinds.map((kind) => {
          const sectionLines =
            lines.filter(
              (line) =>
                line.kind === kind,
            );

          return (
            <section key={kind}>
              {kinds.length > 1 && (
                <div className="border-b border-border bg-muted/35 px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                  {LINE_KIND_LABELS[kind]
                    ?? kind}
                </div>
              )}

              <div className="divide-y divide-border">
                {sectionLines.map((line) => {
                  const next =
                    findProjectionLine(
                      after,
                      line.id,
                    )
                    ?? line;
                  const adjustable =
                    line.kind
                    === 'INGREDIENT';
                  const selected =
                    adjustable
                    && selectedLineId
                      === line.id;
                  const productChanged =
                    (
                      next.productVariantId
                      !== line.productVariantId
                    )
                    || (
                      next.productVariantName
                      !== line.productVariantName
                    );
                  const qtyChanged =
                    quantityChanged(
                      line.netQuantity,
                      next.netQuantity,
                    );
                  const costDelta =
                    Number(next.lineCostHt)
                    - Number(line.lineCostHt);
                  const afterShare =
                    safePercent(
                      next
                        .materialCostSharePercent,
                    );
                  const priceLabel =
                    Number.isFinite(
                      Number(
                        next
                          .normalizedAmount,
                      ),
                    )
                      ? (
                        formatCurrency(
                          next
                            .normalizedAmount,
                        )
                        + '/'
                        + unitLabel(
                          next
                            .normalizedUnit,
                        )
                      )
                      : '—';

                  return (
                    <button
                      aria-pressed={
                        adjustable
                          ? selected
                          : undefined
                      }
                      className={
                        'w-full px-3 py-2.5 text-left transition-colors '
                        + (
                          adjustable
                            ? 'hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring '
                            : 'cursor-default '
                        )
                        + (
                          selected
                            ? 'bg-primary/5'
                            : ''
                        )
                      }
                      disabled={!adjustable}
                      key={line.id}
                      onClick={() =>
                        adjustable
                          && onSelect(line.id)}
                      type="button"
                    >
                      <div className="grid gap-2 lg:grid-cols-[minmax(0,1.55fr)_minmax(8rem,.8fr)_4rem_minmax(7rem,.7fr)_minmax(7rem,.7fr)_5rem] lg:items-center lg:gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {next
                              .productVariantName
                              ?? line
                                .productVariantName}
                          </p>
                          {productChanged && (
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              Avant : {line.productVariantName}
                            </p>
                          )}
                        </div>

                        <div className="min-w-0 lg:text-right">
                          <span className="mr-2 text-[11px] text-muted-foreground lg:hidden">
                            Quantité
                          </span>
                          <span
                            className={
                              'text-sm tabular-nums '
                              + (
                                qtyChanged
                                  ? 'font-semibold text-foreground'
                                  : 'font-medium'
                              )
                            }
                          >
                            {qtyChanged && (
                              <span className="mr-1 text-xs font-normal text-muted-foreground line-through">
                                {formatQuantity(
                                  line.netQuantity,
                                  line.referenceUnit,
                                )}
                              </span>
                            )}
                            {formatQuantity(
                              next.netQuantity,
                              next.referenceUnit,
                            )}
                          </span>
                        </div>

                        <p className="text-sm font-medium text-muted-foreground lg:text-center">
                          <span className="mr-2 text-[11px] lg:hidden">
                            Unité
                          </span>
                          {unitLabel(
                            next.referenceUnit,
                          )}
                        </p>

                        <p className="text-sm font-medium tabular-nums lg:text-right">
                          <span className="mr-2 text-[11px] text-muted-foreground lg:hidden">
                            PU HT
                          </span>
                          {priceLabel}
                        </p>

                        <div className="min-w-0 lg:text-right">
                          <p className="text-sm font-semibold tabular-nums">
                            {formatCurrency(
                              next.lineCostHt,
                            )}
                          </p>
                          {costDelta !== 0 && (
                            <p
                              className={
                                'text-[11px] font-medium tabular-nums '
                                + costDeltaClass(
                                  costDelta,
                                )
                              }
                            >
                              {formatSignedCurrency(
                                costDelta,
                              )}
                            </p>
                          )}
                        </div>

                        <div className="min-w-0 lg:text-right">
                          <p className="text-sm font-semibold tabular-nums">
                            {formatPercent(
                              afterShare,
                            )}
                          </p>
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                            <span
                              className="block h-full rounded-full bg-primary/75"
                              style={{
                                width:
                                  afterShare + '%',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

export {
  TechnicalSheetOptimizerRecipePreview,
};
