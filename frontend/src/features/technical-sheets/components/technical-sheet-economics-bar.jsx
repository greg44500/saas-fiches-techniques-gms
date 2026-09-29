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

function Metric({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-right">{value}</span>
    </div>
  );
}

function TechnicalSheetEconomicsBar({
  economicSnapshot,
  lines = [],
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
      <div className="sticky top-0 z-30 -mx-px border-y border-border bg-background/85 px-4 py-3 shadow-sm backdrop-blur-md">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-4 h-4 bg-gradient-to-b from-background/70 to-transparent"
        />

        <div className="flex items-center gap-4">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 xl:grid-cols-5">
            <Metric
              label="Coût matières HT"
              value={formatDecimalCurrency(visibleCosts.materialCostHt)}
            />
            <Metric
              label="Économat HT"
              value={formatDecimalCurrency(visibleCosts.economatCostHt)}
            />
            <Metric
              label="Coût fabrication HT"
              value={formatDecimalCurrency(visibleCosts.manufacturingCostHt)}
            />
            <Metric
              label="Prix final TTC"
              value={formatMinorCurrency(economicSnapshot?.finalPriceTtcMinor)}
            />
            <Metric
              label="Marge réelle"
              value={formatBasisPoints(economicSnapshot?.actualMarginBasisPoints)}
            />
          </div>

          <ActionIconButton
            Icon={PanelRightOpen}
            label="Afficher le détail de la valorisation"
            onClick={() => setDetailsOpen(true)}
            tooltipLabel="Détail de la valorisation"
            variant="outline"
          />
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
  TechnicalSheetEconomicsBar,
  getVisibleCosts,
  sumDecimalStrings,
};
