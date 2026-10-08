import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  formatSignedPercentPoints,
} from '@/features/technical-sheets/lib/technical-sheet-optimizer';

function economicValue(
  projection,
  key,
) {
  return projection
    ?.economicSnapshot?.[key]
    ?? null;
}

function marginLabel(value) {
  if (!Number.isFinite(Number(value))) {
    return '—';
  }

  return formatPercent(
    Number(value) / 100,
  );
}

function deltaTone(
  value,
  favorableWhenPositive,
) {
  const number = Number(value);

  if (
    !Number.isFinite(number)
    || number === 0
  ) {
    return 'text-muted-foreground';
  }

  const favorable =
    favorableWhenPositive
      ? number > 0
      : number < 0;

  return favorable
    ? 'text-primary'
    : 'text-destructive';
}

function Metric({
  after,
  before,
  delta,
  deltaClassName,
  label,
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-background/55 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-[11px] font-medium text-muted-foreground">
          {label}
        </p>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          av. {before}
        </span>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <p className="truncate text-base font-semibold tabular-nums">
          {after}
        </p>
        <p
          className={
            'shrink-0 text-[11px] font-medium tabular-nums '
            + deltaClassName
          }
        >
          {delta}
        </p>
      </div>
    </div>
  );
}

function TechnicalSheetOptimizerEconomicsStrip({
  after,
  before,
  savings,
  simulationError,
  simulationStatus,
}) {
  const materialBefore =
    Number(
      economicValue(
        before,
        'materialCostHt',
      ),
    );
  const materialAfter =
    Number(
      economicValue(
        after,
        'materialCostHt',
      ),
    );
  const manufacturingBefore =
    Number(
      economicValue(
        before,
        'manufacturingCostHt',
      ),
    );
  const manufacturingAfter =
    Number(
      economicValue(
        after,
        'manufacturingCostHt',
      ),
    );
  const marginBefore =
    Number(
      economicValue(
        before,
        'actualMarginBasisPoints',
      ),
    );
  const marginAfter =
    Number(
      economicValue(
        after,
        'actualMarginBasisPoints',
      ),
    );
  const materialDelta =
    materialAfter - materialBefore;
  const manufacturingDelta =
    manufacturingAfter
    - manufacturingBefore;
  const marginDelta =
    (
      marginAfter - marginBefore
    ) / 100;
  const savingsAmount =
    Number(
      savings?.amountHt
      ?? 0,
    );
  const savingsPercent =
    Number(
      savings?.percent
      ?? 0,
    );
  const economicImpact =
    savingsAmount > 0
      ? {
        label: 'Économie estimée',
        amount: savingsAmount,
        percent: savingsPercent,
        className:
          'text-primary',
      }
      : savingsAmount < 0
        ? {
          label: 'Surcoût estimé',
          amount:
            Math.abs(
              savingsAmount,
            ),
          percent:
            Math.abs(
              savingsPercent,
            ),
          className:
            'text-destructive',
        }
        : {
          label: 'Écart estimé',
          amount: 0,
          percent: 0,
          className:
            'text-muted-foreground',
        };

  const statusLabel =
    simulationStatus === 'pending'
      ? 'Recalcul en cours…'
      : simulationStatus === 'ready'
        ? 'Simulation à jour'
        : simulationStatus === 'input-invalid'
          ? 'Réglage à compléter'
          : simulationStatus === 'error'
            ? 'Simulation à vérifier'
            : 'Valeurs de référence';

  return (
    <section
      aria-label="Impact économique"
      className="shrink-0 rounded-xl border border-border bg-card p-2.5"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-sm font-semibold">
          Impact économique
        </p>
        <p
          aria-label="État de la simulation"
          className="text-xs text-muted-foreground"
          role="status"
        >
          {statusLabel}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          after={
            formatCurrency(
              materialAfter,
            )
          }
          before={
            formatCurrency(
              materialBefore,
            )
          }
          delta={
            formatSignedCurrency(
              materialDelta,
            )
          }
          deltaClassName={
            deltaTone(
              materialDelta,
              false,
            )
          }
          label="Coût matière HT"
        />
        <Metric
          after={
            formatCurrency(
              manufacturingAfter,
            )
          }
          before={
            formatCurrency(
              manufacturingBefore,
            )
          }
          delta={
            formatSignedCurrency(
              manufacturingDelta,
            )
          }
          deltaClassName={
            deltaTone(
              manufacturingDelta,
              false,
            )
          }
          label="Coût de fabrication HT"
        />
        <Metric
          after={
            marginLabel(
              marginAfter,
            )
          }
          before={
            marginLabel(
              marginBefore,
            )
          }
          delta={
            formatSignedPercentPoints(
              marginDelta,
            )
          }
          deltaClassName={
            deltaTone(
              marginDelta,
              true,
            )
          }
          label="Marge réelle"
        />
        <Metric
          after={
            formatCurrency(
              economicImpact.amount,
            )
          }
          before="0,00 €"
          delta={
            formatPercent(
              economicImpact.percent,
            )
          }
          deltaClassName={
            economicImpact.className
          }
          label={
            economicImpact.label
          }
        />
      </div>

      {simulationError && (
        <p
          className="mt-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive"
          role="alert"
        >
          {simulationError}
        </p>
      )}
    </section>
  );
}

export {
  TechnicalSheetOptimizerEconomicsStrip,
};
