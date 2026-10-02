import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  TechnicalSheetHistory,
} from '@/features/technical-sheets/components/technical-sheet-history';
import {
  formatBasisPoints,
  formatDecimalCurrency,
  formatMinorCurrency,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

function decimalValue(value) {
  return value?.$numberDecimal ?? value ?? null;
}

function definitionLabel(definitions, value, fallback = 'NC') {
  return (definitions ?? [])
    .find((definition) => definition.value === value)
    ?.label ?? fallback;
}

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums sm:text-right">
        {value}
      </dd>
    </div>
  );
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function RatioBar({ firstLabel, firstValue, secondLabel, secondValue }) {
  const first = Number(decimalValue(firstValue));
  const second = Number(decimalValue(secondValue));
  const total = (
    Number.isFinite(first) && first > 0 ? first : 0
  ) + (
    Number.isFinite(second) && second > 0 ? second : 0
  );

  if (total <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Répartition non calculable.
      </p>
    );
  }

  const firstPercent = Math.round((first / total) * 1000) / 10;
  const secondPercent = Math.round(1000 - (firstPercent * 10)) / 10;

  return (
    <div className="space-y-2">
      <div
        aria-label={firstLabel + ' ' + firstPercent + ' %, ' + secondLabel + ' ' + secondPercent + ' %'}
        className="flex h-3 overflow-hidden rounded-full bg-muted"
        role="img"
      >
        <div
          className="bg-foreground/75 transition-[width] duration-300"
          style={{ width: firstPercent + '%' }}
        />
        <div
          className="bg-muted-foreground/35 transition-[width] duration-300"
          style={{ width: secondPercent + '%' }}
        />
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>{firstLabel} · {firstPercent.toLocaleString('fr-FR')} %</span>
        <span>{secondLabel} · {secondPercent.toLocaleString('fr-FR')} %</span>
      </div>
    </div>
  );
}

function MarginComparison({ targetBasisPoints, actualBasisPoints }) {
  if (
    !Number.isInteger(targetBasisPoints)
    || !Number.isInteger(actualBasisPoints)
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        Comparaison de marge non calculable.
      </p>
    );
  }

  const target = targetBasisPoints / 100;
  const actual = actualBasisPoints / 100;
  const max = Math.max(target, actual, 1);
  const difference = (actualBasisPoints - targetBasisPoints) / 100;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[88px_1fr_auto] items-center gap-2 text-sm">
        <span className="text-muted-foreground">Cible</span>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-foreground/55"
            style={{ width: Math.min(100, (target / max) * 100) + '%' }}
          />
        </div>
        <span className="font-medium tabular-nums">
          {formatBasisPoints(targetBasisPoints)}
        </span>
      </div>
      <div className="grid grid-cols-[88px_1fr_auto] items-center gap-2 text-sm">
        <span className="text-muted-foreground">Réelle</span>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-foreground"
            style={{ width: Math.min(100, (actual / max) * 100) + '%' }}
          />
        </div>
        <span className="font-medium tabular-nums">
          {formatBasisPoints(actualBasisPoints)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Écart : {difference > 0 ? '+' : ''}
        {difference.toLocaleString('fr-FR', {
          maximumFractionDigits: 2,
        })} point{Math.abs(difference) > 1 ? 's' : ''}
      </p>
    </div>
  );
}

function TechnicalSheetAnalysisDrawer({
  economicSnapshot,
  history = [],
  historyLoading = false,
  metadata,
  onClose,
  open,
  productionSnapshot,
}) {
  const saleBasisLabel = definitionLabel(
    metadata?.saleBases,
    productionSnapshot?.saleBasis,
  );
  const productionUnitLabel = definitionLabel(
    metadata?.productionUnits ?? metadata?.units,
    productionSnapshot?.productionUnit,
  );
  const targetMarginBasisPoints =
    productionSnapshot?.targetMarginBasisPoints ?? null;
  const actualMarginBasisPoints =
    economicSnapshot?.actualMarginBasisPoints ?? null;

  return (
    <EntityDetailsDrawer
      description="Analyse des coûts, du prix de vente, de la marge et de l’historique validé de la Fiche."
      onClose={onClose}
      open={open}
      title="Analyse de gestion"
    >
      <Tabs defaultValue="summary">
        <TabsList aria-label="Analyse de la Fiche" variant="section">
          <TabsTrigger value="summary" variant="section">Synthèse</TabsTrigger>
          <TabsTrigger value="costs" variant="section">Coûts</TabsTrigger>
          <TabsTrigger value="price" variant="section">Prix & marge</TabsTrigger>
          <TabsTrigger value="history" variant="section">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" variant="section">
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                hint="Production complète"
                label="CF HT"
                value={formatDecimalCurrency(
                  decimalValue(economicSnapshot?.manufacturingCostHt),
                )}
              />
              <MetricCard
                hint="Par portion"
                label="CFU HT"
                value={formatDecimalCurrency(
                  decimalValue(economicSnapshot?.manufacturingCostPerPortionHt),
                )}
              />
              <MetricCard
                hint={'Par ' + saleBasisLabel.toLowerCase()}
                label="Prix retenu TTC"
                value={formatMinorCurrency(
                  economicSnapshot?.finalPriceTtcMinor,
                )}
              />
              <MetricCard
                label="Marge réelle"
                value={formatBasisPoints(actualMarginBasisPoints)}
              />
            </div>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Production</h3>
              <dl className="rounded-lg border border-border px-4">
                <DetailRow
                  label="Quantité produite"
                  value={
                    productionSnapshot?.productionQuantity
                    ? productionSnapshot.productionQuantity + ' ' + productionUnitLabel.toLowerCase()
                    : 'NC'
                  }
                />
                <DetailRow
                  label="Portions / pièce"
                  value={productionSnapshot?.portionsPerProductionUnit ?? 'NC'}
                />
                <DetailRow
                  label="Total portions"
                  value={
                    productionSnapshot?.totalPortions
                    ?? decimalValue(economicSnapshot?.totalPortions)
                    ?? 'NC'
                  }
                />
                <DetailRow label="Base de vente" value={saleBasisLabel} />
              </dl>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Structure du coût</h3>
              <RatioBar
                firstLabel="Matières"
                firstValue={economicSnapshot?.materialCostHt}
                secondLabel="Économat"
                secondValue={economicSnapshot?.economatCostHt}
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Objectif de marge</h3>
              <MarginComparison
                actualBasisPoints={actualMarginBasisPoints}
                targetBasisPoints={targetMarginBasisPoints}
              />
            </section>
          </div>
        </TabsContent>

        <TabsContent value="costs" variant="section">
          <dl className="rounded-lg border border-border px-4">
            <DetailRow
              label="CM HT · Matières, production"
              value={formatDecimalCurrency(decimalValue(economicSnapshot?.materialCostHt))}
            />
            <DetailRow
              label="CE HT · Économat, production"
              value={formatDecimalCurrency(decimalValue(economicSnapshot?.economatCostHt))}
            />
            <DetailRow
              label="CF HT · Fabrication, production"
              value={formatDecimalCurrency(decimalValue(economicSnapshot?.manufacturingCostHt))}
            />
            <DetailRow
              label="CM/Pce HT"
              value={formatDecimalCurrency(decimalValue(economicSnapshot?.materialCostPerProductionUnitHt))}
            />
            <DetailRow
              label="CF/Pce HT"
              value={formatDecimalCurrency(decimalValue(economicSnapshot?.manufacturingCostPerProductionUnitHt))}
            />
            <DetailRow
              label="CMU HT · Matière / portion"
              value={formatDecimalCurrency(decimalValue(economicSnapshot?.materialCostPerPortionHt))}
            />
            <DetailRow
              label="CEU HT · Économat / portion"
              value={formatDecimalCurrency(decimalValue(economicSnapshot?.economatCostPerPortionHt))}
            />
            <DetailRow
              label="CFU HT · Fabrication / portion"
              value={formatDecimalCurrency(decimalValue(economicSnapshot?.manufacturingCostPerPortionHt))}
            />
          </dl>
        </TabsContent>

        <TabsContent value="price" variant="section">
          <div className="space-y-5">
            <dl className="rounded-lg border border-border px-4">
              <DetailRow label="Base de vente" value={saleBasisLabel} />
              <DetailRow
                label="Marge cible"
                value={formatBasisPoints(targetMarginBasisPoints)}
              />
              <DetailRow
                label="Prix de vente calculé HT"
                value={formatDecimalCurrency(decimalValue(economicSnapshot?.theoreticalPriceHt))}
              />
              <DetailRow
                label="Prix de vente calculé TTC"
                value={formatDecimalCurrency(decimalValue(economicSnapshot?.theoreticalPriceTtc))}
              />
              <DetailRow
                label="Prix conseillé TTC"
                value={formatMinorCurrency(economicSnapshot?.advisedPriceTtcMinor)}
              />
              <DetailRow
                label="Prix retenu TTC"
                value={formatMinorCurrency(economicSnapshot?.finalPriceTtcMinor)}
              />
              <DetailRow
                label="Plancher économique TTC"
                value={formatDecimalCurrency(decimalValue(economicSnapshot?.economicFloorTtc))}
              />
              <DetailRow
                label="Marge réelle"
                value={formatBasisPoints(actualMarginBasisPoints)}
              />
            </dl>
            <MarginComparison
              actualBasisPoints={actualMarginBasisPoints}
              targetBasisPoints={targetMarginBasisPoints}
            />
          </div>
        </TabsContent>

        <TabsContent value="history" variant="section">
          {historyLoading ? (
            <p className="text-sm text-muted-foreground">
              Chargement de l’historique…
            </p>
          ) : (
            <TechnicalSheetHistory
              changeKindDefinitions={metadata?.changeKindDefinitions}
              validations={history}
            />
          )}
        </TabsContent>
      </Tabs>
    </EntityDetailsDrawer>
  );
}

export {
  MarginComparison,
  RatioBar,
  TechnicalSheetAnalysisDrawer,
};
