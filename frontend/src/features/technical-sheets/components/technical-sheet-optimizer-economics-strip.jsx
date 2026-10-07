import {
  formatCurrency,
  formatPercent,
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

function signedCurrency(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  return (
    (number > 0 ? '+' : '')
    + formatCurrency(number)
  );
}

function signedPercentPoints(value) {
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

function Metric({
  after,
  before,
  delta,
  label,
}) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="text-lg font-semibold tabular-nums">
          {after}
        </p>
        <span className="text-xs text-muted-foreground">
          avant {before}
        </span>
      </div>
      <p className="mt-1 text-xs font-medium tabular-nums text-primary">
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
      className="overflow-hidden rounded-xl border border-border bg-card"
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
            signedCurrency(
              materialAfter
              - materialBefore,
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
            signedCurrency(
              manufacturingAfter
              - manufacturingBefore,
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
            signedPercentPoints(
              (
                marginAfter
                - marginBefore
              ) / 100,
            )
          }
          label="Marge réelle"
        />
        <Metric
          after={
            formatCurrency(
              savings?.amountHt
              ?? 0,
            )
          }
          before="0,00 €"
          delta={
            formatPercent(
              savings?.percent
              ?? 0,
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
