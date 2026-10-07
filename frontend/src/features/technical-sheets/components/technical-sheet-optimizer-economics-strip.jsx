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
    <div className="min-w-0 px-4 py-2.5">
      <p className="text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="text-base font-semibold tabular-nums">
          {after}
        </p>
        <span className="text-[11px] text-muted-foreground">
          avant {before}
        </span>
      </div>
      <p
        className={
          'mt-1 text-xs font-medium tabular-nums '
          + deltaClassName
        }
      >
        {delta}
      </p>
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

  const statusLabel =
    simulationStatus === 'pending'
      ? 'Recalcul en cours…'
      : simulationStatus === 'ready'
        ? 'Simulation à jour'
        : simulationStatus === 'error'
          ? 'Simulation à vérifier'
          : 'Valeurs de référence';

  return (
    <section
      aria-label="Impact économique"
      className="shrink-0 overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
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

      <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
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
              savingsAmount,
            )
          }
          before="0,00 €"
          delta={
            formatPercent(
              savings?.percent
              ?? 0,
            )
          }
          deltaClassName={
            deltaTone(
              savingsAmount,
              true,
            )
          }
          label="Économie estimée"
        />
      </div>

      {simulationError && (
        <p
          className="border-t border-border px-4 py-2 text-xs text-destructive"
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
