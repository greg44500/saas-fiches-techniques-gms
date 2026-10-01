import {
  PanelRightOpen,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { ActionIconButton } from '@/components/shared/action-icon-button';
import {
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  formatBasisPoints,
  formatDecimalCurrency,
  formatMinorCurrency,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

function toScaledDecimal(value) {
  const normalized = String(value ?? '').trim();

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;

  const [integer, fraction = ''] = normalized.split('.');

  return {
    digits: BigInt(integer + fraction),
    scale: fraction.length,
  };
}

function scaledToDecimal({ digits, scale }) {
  if (scale === 0) return digits.toString();

  const padded = digits.toString().padStart(scale + 1, '0');
  const integer = padded.slice(0, -scale);
  const fraction = padded.slice(-scale).replace(/0+$/, '');

  return fraction ? integer + '.' + fraction : integer;
}

function sumDecimalStrings(values) {
  const decimals = values
    .map(toScaledDecimal)
    .filter(Boolean);

  if (decimals.length === 0) return null;

  const scale = Math.max(...decimals.map((entry) => entry.scale));
  const digits = decimals.reduce(
    (total, entry) => (
      total
      + entry.digits * (10n ** BigInt(scale - entry.scale))
    ),
    0n,
  );

  return scaledToDecimal({ digits, scale });
}

function getVisibleCosts(lines, economicSnapshot) {
  if (economicSnapshot) {
    return {
      materialCostHt: economicSnapshot.materialCostHt,
      economatCostHt: economicSnapshot.economatCostHt,
      manufacturingCostHt: economicSnapshot.manufacturingCostHt,
    };
  }

  const materialCostHt = sumDecimalStrings(
    lines
      .filter((line) => line.kind === 'INGREDIENT')
      .map((line) => line.valuation?.lineCostHt)
      .filter(Boolean),
  );
  const economatCostHt = sumDecimalStrings(
    lines
      .filter((line) => line.kind === 'ECONOMAT')
      .map((line) => line.valuation?.lineCostHt)
      .filter(Boolean),
  );

  return {
    materialCostHt,
    economatCostHt,
    manufacturingCostHt: sumDecimalStrings(
      [materialCostHt, economatCostHt].filter(Boolean),
    ),
  };
}

function compactMetricValue(value) {
  if (value === 'Non calculé' || value === 'Non renseignée') {
    return 'NC';
  }

  return value;
}

function MetricLabel({ children, tooltip }) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={tooltip}
        className="w-fit cursor-help text-xs font-medium text-muted-foreground underline decoration-dotted underline-offset-4"
        type="button"
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function Metric({ label, tooltip, value }) {
  return (
    <div className="min-w-0 space-y-1">
      <MetricLabel tooltip={tooltip}>{label}</MetricLabel>
      <p className="truncate text-sm font-semibold tabular-nums">
        {compactMetricValue(value)}
      </p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function TechnicalSheetEconomicsBar({
  canValuate = false,
  economicSnapshot,
  editDisabled = false,
  finalPriceInputValue = '',
  finalPriceMode = 'ADVISED',
  lines = [],
  onFieldBlur,
  onFinalPriceInputChange,
  onFinalPriceModeChange,
  targetMarginBasisPoints,
  vatRateBasisPoints,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const visibleCosts = useMemo(
    () => getVisibleCosts(lines, economicSnapshot),
    [economicSnapshot, lines],
  );
  return (
    <>
      <div className="space-y-3">
        <div className="flex items-end gap-3">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-6">
            <Metric
              label="CM HT"
              tooltip="Coût matières hors taxe"
              value={formatDecimalCurrency(visibleCosts.materialCostHt)}
            />
            <Metric
              label="CE HT"
              tooltip="Coût économat hors taxe"
              value={formatDecimalCurrency(visibleCosts.economatCostHt)}
            />
            <Metric
              label="CF HT"
              tooltip="Coût de fabrication hors taxe"
              value={formatDecimalCurrency(visibleCosts.manufacturingCostHt)}
            />


            <Metric
              label="PC TTC"
              tooltip="Prix conseillé toutes taxes comprises"
              value={formatMinorCurrency(economicSnapshot?.advisedPriceTtcMinor)}
            />

            <div className="min-w-0 space-y-1">
              <MetricLabel tooltip="Prix final toutes taxes comprises">
                PF TTC
              </MetricLabel>
              <div className="flex min-w-0 gap-1">
                {finalPriceMode === 'MANUAL' ? (
                  <Input
                    aria-label="Prix final TTC (€)"
                    className="h-8 min-w-0 flex-1 tabular-nums"
                    disabled={editDisabled || !canValuate}
                    inputMode="decimal"
                    onBlur={onFieldBlur}
                    onChange={(event) => onFinalPriceInputChange?.(event.target.value)}
                    value={finalPriceInputValue}
                  />
                ) : (
                  <p className="flex h-8 min-w-0 flex-1 items-center truncate rounded-md border border-border bg-muted/20 px-2 text-sm font-semibold tabular-nums">
                    {compactMetricValue(
                      formatMinorCurrency(economicSnapshot?.finalPriceTtcMinor),
                    )}
                  </p>
                )}

                <Select
                  disabled={editDisabled || !canValuate}
                  items={[
                    { value: 'ADVISED', label: 'Conseillé' },
                    { value: 'MANUAL', label: 'Manuel' },
                  ]}
                  onValueChange={onFinalPriceModeChange}
                  value={finalPriceMode}
                >
                  <SelectTrigger
                    aria-label="Mode de Prix final"
                    className="h-8 min-h-8 w-24 shrink-0 px-2 text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADVISED">Conseillé</SelectItem>
                    <SelectItem value="MANUAL">Manuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Metric
              label="%MR"
              tooltip="Marge réelle"
              value={formatBasisPoints(economicSnapshot?.actualMarginBasisPoints)}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ActionIconButton
              Icon={PanelRightOpen}
              label="Afficher le détail de la valorisation"
              onClick={() => setDetailsOpen(true)}
              tooltipLabel="Détail de la valorisation"
              variant="outline"
            />
          </div>
        </div>
      </div>

      <DialogRoot
        onOpenChange={setDetailsOpen}
        open={detailsOpen}
      >
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="left-auto! right-0! top-0! h-dvh! w-full! max-w-md! translate-x-0! translate-y-0! overflow-y-auto rounded-none! border-y-0! border-r-0!">
            <DialogHeader>
              <div className="flex items-center justify-between gap-3">
                <DialogTitle>Détail de la valorisation</DialogTitle>
                <ActionIconButton
                  Icon={X}
                  label="Fermer le détail de la valorisation"
                  onClick={() => setDetailsOpen(false)}
                  tooltipLabel="Fermer"
                  variant="ghost"
                />
              </div>
            </DialogHeader>

            <div className="mt-5">
              <DetailRow
                label="Coût matières HT"
                value={formatDecimalCurrency(visibleCosts.materialCostHt)}
              />
              <DetailRow
                label="Économat HT"
                value={formatDecimalCurrency(visibleCosts.economatCostHt)}
              />
              <DetailRow
                label="Coût fabrication HT"
                value={formatDecimalCurrency(visibleCosts.manufacturingCostHt)}
              />
              <DetailRow
                label="Marge cible"
                value={formatBasisPoints(targetMarginBasisPoints)}
              />
              <DetailRow
                label="TVA"
                value={formatBasisPoints(vatRateBasisPoints)}
              />
              <DetailRow
                label="Prix théorique HT"
                value={formatDecimalCurrency(economicSnapshot?.theoreticalPriceHt)}
              />
              <DetailRow
                label="Prix théorique TTC"
                value={formatDecimalCurrency(economicSnapshot?.theoreticalPriceTtc)}
              />
              <DetailRow
                label="Prix conseillé TTC"
                value={formatMinorCurrency(economicSnapshot?.advisedPriceTtcMinor)}
              />
              <DetailRow
                label="Prix final TTC"
                value={formatMinorCurrency(economicSnapshot?.finalPriceTtcMinor)}
              />
              <DetailRow
                label="Plancher économique TTC"
                value={formatDecimalCurrency(economicSnapshot?.economicFloorTtc)}
              />
              <DetailRow
                label="Marge réelle"
                value={formatBasisPoints(economicSnapshot?.actualMarginBasisPoints)}
              />
            </div>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
    </>
  );
}

export {
  MetricLabel,
  compactMetricValue,
  TechnicalSheetEconomicsBar,
  getVisibleCosts,
  sumDecimalStrings,
};
