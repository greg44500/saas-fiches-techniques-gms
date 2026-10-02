import { useEffect, useMemo, useRef, useState } from 'react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TechnicalSheetEconomicMetricLabel,
} from '@/features/technical-sheets/components/technical-sheet-economic-metric-label';
import {
  formatBasisPoints,
  formatDecimalCurrency,
  formatMinorCurrency,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';
import { cn } from '@/lib/utils';

function compactMetricValue(value) {
  if (
    value === 'Non calculé'
    || value === 'Non renseignée'
  ) {
    return 'NC';
  }

  return value;
}

function LocalMetricLabel({ children, tooltip }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <span>{children}</span>
      <InfoTooltip
        className="size-5"
        content={tooltip}
        label={'Définition : ' + children}
      />
    </span>
  );
}

function Metric({
  definitions,
  displayLabel,
  fallbackLabel,
  metricKey,
  value,
}) {
  return (
    <div className="min-w-0 space-y-1 rounded-md px-2 py-1.5">
      <TechnicalSheetEconomicMetricLabel
        className="text-xs font-medium text-muted-foreground"
        definitions={definitions}
        displayLabel={displayLabel}
        fallbackLabel={fallbackLabel}
        metricKey={metricKey}
      />
      <p className="truncate text-sm font-semibold tabular-nums">
        {compactMetricValue(value)}
      </p>
    </div>
  );
}

function snapshotKey(snapshot) {
  if (!snapshot) return 'none';

  return [
    snapshot.manufacturingCostHt,
    snapshot.materialCostPerPortionHt,
    snapshot.manufacturingCostPerPortionHt,
    snapshot.finalPriceTtcMinor,
    snapshot.actualMarginBasisPoints,
  ].map((value) => (
    value?.$numberDecimal ?? value ?? 'null'
  )).join('|');
}

function TechnicalSheetEconomicsBar({
  canValuate = false,
  economicMetricDefinitions = [],
  economicSnapshot,
  editDisabled = false,
  finalPriceInputValue = '',
  finalPriceMode = '',
  finalPriceModeItems = [],
  onFieldBlur,
  onFinalPriceInputChange,
  onFinalPriceModeChange,
  saleBasis,
  saleBasisItems = [],
  updating = false,
}) {
  const currentSnapshotKey = useMemo(
    () => snapshotKey(economicSnapshot),
    [economicSnapshot],
  );
  const previousSnapshotKeyRef = useRef(currentSnapshotKey);
  const [recentlyUpdated, setRecentlyUpdated] = useState(false);
  const saleBasisLabel = (
    saleBasisItems.find((item) => item.value === saleBasis)?.label
    ?? 'base de vente'
  );

  useEffect(() => {
    if (
      previousSnapshotKeyRef.current === currentSnapshotKey
    ) {
      return undefined;
    }

    previousSnapshotKeyRef.current = currentSnapshotKey;
    setRecentlyUpdated(true);

    const timeoutId = window.setTimeout(() => {
      setRecentlyUpdated(false);
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [currentSnapshotKey]);

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card/70 px-2 py-2 transition-colors duration-300',
        recentlyUpdated && 'border-primary/30 bg-primary/5',
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex min-h-5 items-center justify-between gap-3 px-2">
          <p className="text-xs font-medium text-muted-foreground">
            Repères économiques
          </p>
          <p
            aria-live="polite"
            className="text-xs text-muted-foreground"
          >
            {updating ? 'Actualisation…' : 'À jour'}
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-x-2 gap-y-1 md:grid-cols-3 xl:grid-cols-[0.8fr_0.8fr_0.8fr_minmax(240px,1.4fr)_0.7fr]">
          <Metric
            definitions={economicMetricDefinitions}
            fallbackLabel="CF HT"
            metricKey="manufacturingCostHt"
            value={formatDecimalCurrency(
              economicSnapshot?.manufacturingCostHt,
            )}
          />
          <Metric
            definitions={economicMetricDefinitions}
            fallbackLabel="CMU HT"
            metricKey="materialCostPerPortionHt"
            value={formatDecimalCurrency(
              economicSnapshot?.materialCostPerPortionHt,
            )}
          />
          <Metric
            definitions={economicMetricDefinitions}
            fallbackLabel="CFU HT"
            metricKey="manufacturingCostPerPortionHt"
            value={formatDecimalCurrency(
              economicSnapshot?.manufacturingCostPerPortionHt,
            )}
          />

          <div className="min-w-0 space-y-1 rounded-md px-2 py-1.5">
            <LocalMetricLabel
              tooltip={
                'Prix de vente retenu TTC par '
                + saleBasisLabel.toLowerCase()
              }
            >
              Prix retenu TTC
            </LocalMetricLabel>
            <div className="flex min-w-0 gap-1">
              {finalPriceModeItems.find(
                (item) => (
                  item.value === finalPriceMode
                  && item.requiresManualPrice
                ),
              ) ? (
                <Input
                  aria-label="Prix retenu TTC (€)"
                  className="h-8 min-w-0 flex-1 tabular-nums"
                  disabled={editDisabled || !canValuate}
                  inputMode="decimal"
                  onBlur={onFieldBlur}
                  onChange={(event) => (
                    onFinalPriceInputChange?.(
                      event.target.value,
                    )
                  )}
                  value={finalPriceInputValue}
                />
              ) : (
                <p className="flex h-8 min-w-0 flex-1 items-center truncate rounded-md border border-border bg-muted/20 px-2 text-sm font-semibold tabular-nums">
                  {compactMetricValue(
                    formatMinorCurrency(
                      economicSnapshot?.finalPriceTtcMinor,
                    ),
                  )}
                </p>
              )}

              <Select
                disabled={editDisabled || !canValuate}
                items={finalPriceModeItems}
                onValueChange={onFinalPriceModeChange}
                value={finalPriceMode}
              >
                <SelectTrigger
                  aria-label="Mode de Prix retenu"
                  className="h-8 min-h-8 w-24 shrink-0 px-2 text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {finalPriceModeItems.map((item) => (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Metric
            definitions={economicMetricDefinitions}
            displayLabel="%MR"
            fallbackLabel="Marge réelle"
            metricKey="actualMarginBasisPoints"
            value={formatBasisPoints(
              economicSnapshot?.actualMarginBasisPoints,
            )}
          />
        </div>
      </div>
    </div>
  );
}

export {
  LocalMetricLabel,
  compactMetricValue,
  TechnicalSheetEconomicsBar,
};
