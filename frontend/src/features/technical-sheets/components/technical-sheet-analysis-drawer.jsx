import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  TechnicalSheetEconomicMetricLabel,
} from '@/features/technical-sheets/components/technical-sheet-economic-metric-label';
import {
  TechnicalSheetHistory,
} from '@/features/technical-sheets/components/technical-sheet-history';
import {
  formatBasisPoints,
  formatDecimalCurrency,
  formatMinorCurrency,
  formatSignedBasisPointDelta,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';
import { cn } from '@/lib/utils';

function decimalValue(value) {
  return value?.$numberDecimal ?? value ?? null;
}

function decimalNumber(value) {
  const parsed = Number(decimalValue(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function definitionLabel(definitions, value, fallback = 'NC') {
  return (definitions ?? [])
    .find((definition) => definition.value === value)
    ?.label ?? fallback;
}

function formatSignedCurrencyDelta(value) {
  const parsed = decimalNumber(value);
  if (parsed === null) return 'NC';

  const arrow = parsed > 0 ? '↑' : parsed < 0 ? '↓' : '—';
  return arrow + ' ' + formatDecimalCurrency(Math.abs(parsed));
}

function getDeltaToneClass(value, { decimal = false } = {}) {
  const parsed = decimal
    ? decimalNumber(value)
    : Number.isInteger(value)
      ? value
      : null;

  if (parsed === null || parsed === 0) {
    return 'text-muted-foreground';
  }

  return parsed > 0 ? 'text-success' : 'text-destructive';
}

function DeltaValue({
  decimal = false,
  formattedValue,
  value,
}) {
  return (
    <span
      className={cn(
        'font-semibold tabular-nums',
        getDeltaToneClass(value, { decimal }),
      )}
    >
      {formattedValue}
    </span>
  );
}

function getMarginDiagnostic(economicSnapshot) {
  const marginAmount = decimalNumber(
    economicSnapshot?.actualMarginAmountHt,
  );
  const targetDelta =
    economicSnapshot?.targetMarginDeltaBasisPoints;

  if (marginAmount === null) {
    return {
      tone: 'neutral',
      title: 'Diagnostic indisponible',
      description:
        'La valorisation doit être complète pour analyser la marge.',
    };
  }

  if (marginAmount < 0) {
    return {
      tone: 'destructive',
      title: 'Prix retenu sous le coût de fabrication',
      description:
        'Le Prix retenu HT ne couvre pas le coût de fabrication de la base de vente.',
    };
  }

  if (marginAmount === 0) {
    return {
      tone: 'warning',
      title: 'Coût de fabrication couvert sans marge positive',
      description:
        'Le Prix retenu HT couvre exactement le coût de fabrication de la base de vente.',
    };
  }

  if (Number.isInteger(targetDelta) && targetDelta >= 0) {
    return {
      tone: 'success',
      title: 'Marge positive et objectif atteint',
      description:
        'La marge sur coût de fabrication est positive et atteint la marge cible.',
    };
  }

  if (Number.isInteger(targetDelta) && targetDelta < 0) {
    return {
      tone: 'warning',
      title: 'Marge positive, objectif non atteint',
      description:
        'Le coût de fabrication est couvert, mais la marge réelle reste sous la marge cible.',
    };
  }

  return {
    tone: 'warning',
    title: 'Marge positive',
    description:
      'Le coût de fabrication est couvert, mais la comparaison à la cible est indisponible.',
  };
}

const diagnosticToneClasses = {
  success: 'border-success/35 bg-success/10 text-success',
  warning: 'border-warning/35 bg-warning/10 text-warning',
  destructive:
    'border-destructive/35 bg-destructive/10 text-destructive',
  neutral: 'border-border bg-muted/20 text-foreground',
};

const diagnosticBarClasses = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  neutral: 'bg-muted-foreground',
};

function DetailRow({ hint, label, value }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center">
      <dt className="text-sm text-muted-foreground">
        <div>{label}</div>
        {hint ? (
          <div className="mt-0.5 text-xs text-muted-foreground/80">
            {hint}
          </div>
        ) : null}
      </dt>
      <dd className="text-sm font-semibold tabular-nums sm:text-right">
        {value}
      </dd>
    </div>
  );
}

function MetricCard({ hint, label, value }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3">
      <div className="text-xs font-medium text-muted-foreground">
        {label}
      </div>
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
          className="bg-primary transition-[width] duration-300"
          style={{ width: firstPercent + '%' }}
        />
        <div
          className="bg-secondary transition-[width] duration-300"
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

function MarginComparison({
  actualBasisPoints,
  diagnosticTone = 'neutral',
  targetBasisPoints,
  targetDeltaBasisPoints,
}) {
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

  const target = Math.max(0, targetBasisPoints / 100);
  const actual = Math.max(0, actualBasisPoints / 100);
  const max = Math.max(target, actual, 1);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[88px_1fr_auto] items-center gap-2 text-sm">
        <span className="text-muted-foreground">Cible</span>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary/65"
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
            className={cn(
              'h-full',
              diagnosticBarClasses[diagnosticTone]
              ?? diagnosticBarClasses.neutral,
            )}
            style={{ width: Math.min(100, (actual / max) * 100) + '%' }}
          />
        </div>
        <span className="font-medium tabular-nums">
          {formatBasisPoints(actualBasisPoints)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Écart :{' '}
        <DeltaValue
          formattedValue={formatSignedBasisPointDelta(
            targetDeltaBasisPoints,
          )}
          value={targetDeltaBasisPoints}
        />
      </p>
    </div>
  );
}

function DiagnosticPanel({ diagnostic }) {
  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3',
        diagnosticToneClasses[diagnostic.tone]
        ?? diagnosticToneClasses.neutral,
      )}
      role="status"
    >
      <p className="text-sm font-semibold">{diagnostic.title}</p>
      <p className="mt-1 text-xs opacity-80">
        {diagnostic.description}
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
  const metricDefinitions =
    metadata?.economicMetricDefinitions ?? [];
  const saleBasisLabel = definitionLabel(
    metadata?.saleBases,
    productionSnapshot?.saleBasis,
  );
  const productionUnitLabel = definitionLabel(
    metadata?.productionUnits ?? metadata?.units,
    productionSnapshot?.productionUnit,
  );
  const productionQuantity =
    decimalValue(productionSnapshot?.productionQuantity);
  const portionsPerProductionUnit =
    decimalValue(
      productionSnapshot?.portionsPerProductionUnit,
    );
  const totalPortions = (
    decimalValue(productionSnapshot?.totalPortions)
    ?? decimalValue(economicSnapshot?.totalPortions)
  );
  const targetMarginBasisPoints =
    productionSnapshot?.targetMarginBasisPoints ?? null;
  const actualMarginBasisPoints =
    economicSnapshot?.actualMarginBasisPoints ?? null;
  const targetDeltaBasisPoints =
    economicSnapshot?.targetMarginDeltaBasisPoints ?? null;
  const diagnostic = getMarginDiagnostic(economicSnapshot);
  const saleBasisLower = saleBasisLabel.toLowerCase();

  const metricLabel = (metricKey, fallbackLabel, displayLabel) => (
    <TechnicalSheetEconomicMetricLabel
      definitions={metricDefinitions}
      displayLabel={displayLabel}
      fallbackLabel={fallbackLabel}
      metricKey={metricKey}
    />
  );

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
                label={metricLabel('manufacturingCostHt', 'CF HT')}
                value={formatDecimalCurrency(
                  decimalValue(economicSnapshot?.manufacturingCostHt),
                )}
              />
              <MetricCard
                hint="Par portion"
                label={metricLabel(
                  'manufacturingCostPerPortionHt',
                  'CFU HT',
                )}
                value={formatDecimalCurrency(
                  decimalValue(
                    economicSnapshot?.manufacturingCostPerPortionHt,
                  ),
                )}
              />
              <MetricCard
                hint={'Par ' + saleBasisLower}
                label="Prix retenu TTC"
                value={formatMinorCurrency(
                  economicSnapshot?.finalPriceTtcMinor,
                )}
              />
              <MetricCard
                label={metricLabel(
                  'actualMarginBasisPoints',
                  'Marge réelle',
                )}
                value={formatBasisPoints(actualMarginBasisPoints)}
              />
            </div>

            <DiagnosticPanel diagnostic={diagnostic} />

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">
                Diagnostic de marge
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard
                  hint={'Par ' + saleBasisLower}
                  label={metricLabel(
                    'actualMarginAmountHt',
                    'Marge sur coût de fabrication HT',
                  )}
                  value={formatDecimalCurrency(
                    decimalValue(
                      economicSnapshot?.actualMarginAmountHt,
                    ),
                  )}
                />
                <MetricCard
                  hint="Production complète"
                  label={metricLabel(
                    'manufacturingMarginProductionHt',
                    'Marge sur coût de fabrication HT · production',
                  )}
                  value={formatDecimalCurrency(
                    decimalValue(
                      economicSnapshot?.manufacturingMarginProductionHt,
                    ),
                  )}
                />
                <MetricCard
                  hint="Écart en points"
                  label={metricLabel(
                    'targetMarginDeltaBasisPoints',
                    'Écart vs cible',
                  )}
                  value={(
                    <DeltaValue
                      formattedValue={formatSignedBasisPointDelta(
                        targetDeltaBasisPoints,
                      )}
                      value={targetDeltaBasisPoints}
                    />
                  )}
                />
                <MetricCard
                  hint={'Par ' + saleBasisLower}
                  label={metricLabel(
                    'targetMarginDeltaAmountHt',
                    'Écart monétaire vs cible',
                  )}
                  value={(
                    <DeltaValue
                      decimal
                      formattedValue={formatSignedCurrencyDelta(
                        economicSnapshot?.targetMarginDeltaAmountHt,
                      )}
                      value={economicSnapshot?.targetMarginDeltaAmountHt}
                    />
                  )}
                />
                <MetricCard
                  hint="Production complète"
                  label={metricLabel(
                    'targetMarginDeltaProductionHt',
                    'Écart production vs cible',
                  )}
                  value={(
                    <DeltaValue
                      decimal
                      formattedValue={formatSignedCurrencyDelta(
                        economicSnapshot?.targetMarginDeltaProductionHt,
                      )}
                      value={economicSnapshot?.targetMarginDeltaProductionHt}
                    />
                  )}
                />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Production</h3>
              <dl className="rounded-lg border border-border px-4">
                <DetailRow
                  label="Quantité produite"
                  value={
                    productionQuantity
                      ? productionQuantity
                        + ' '
                        + productionUnitLabel.toLowerCase()
                      : 'NC'
                  }
                />
                <DetailRow
                  label="Portions / pièce"
                  value={portionsPerProductionUnit ?? 'NC'}
                />
                <DetailRow
                  label="Total portions"
                  value={totalPortions ?? 'NC'}
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
                diagnosticTone={diagnostic.tone}
                targetBasisPoints={targetMarginBasisPoints}
                targetDeltaBasisPoints={targetDeltaBasisPoints}
              />
            </section>
          </div>
        </TabsContent>

        <TabsContent value="costs" variant="section">
          <dl className="rounded-lg border border-border px-4">
            <DetailRow
              hint="Matières · production"
              label={metricLabel('materialCostHt', 'CM HT')}
              value={formatDecimalCurrency(
                decimalValue(economicSnapshot?.materialCostHt),
              )}
            />
            <DetailRow
              hint="Économat · production"
              label={metricLabel('economatCostHt', 'CE HT')}
              value={formatDecimalCurrency(
                decimalValue(economicSnapshot?.economatCostHt),
              )}
            />
            <DetailRow
              hint="Fabrication · production"
              label={metricLabel('manufacturingCostHt', 'CF HT')}
              value={formatDecimalCurrency(
                decimalValue(economicSnapshot?.manufacturingCostHt),
              )}
            />
            <DetailRow
              hint="Matières · pièce"
              label={metricLabel(
                'materialCostPerProductionUnitHt',
                'CM/Pce HT',
              )}
              value={formatDecimalCurrency(
                decimalValue(
                  economicSnapshot?.materialCostPerProductionUnitHt,
                ),
              )}
            />
            <DetailRow
              hint="Fabrication · pièce"
              label={metricLabel(
                'manufacturingCostPerProductionUnitHt',
                'CF/Pce HT',
              )}
              value={formatDecimalCurrency(
                decimalValue(
                  economicSnapshot
                    ?.manufacturingCostPerProductionUnitHt,
                ),
              )}
            />
            <DetailRow
              hint="Matières · portion"
              label={metricLabel(
                'materialCostPerPortionHt',
                'CMU HT',
              )}
              value={formatDecimalCurrency(
                decimalValue(
                  economicSnapshot?.materialCostPerPortionHt,
                ),
              )}
            />
            <DetailRow
              hint="Économat · portion"
              label={metricLabel(
                'economatCostPerPortionHt',
                'CEU HT',
              )}
              value={formatDecimalCurrency(
                decimalValue(
                  economicSnapshot?.economatCostPerPortionHt,
                ),
              )}
            />
            <DetailRow
              hint="Fabrication · portion"
              label={metricLabel(
                'manufacturingCostPerPortionHt',
                'CFU HT',
              )}
              value={formatDecimalCurrency(
                decimalValue(
                  economicSnapshot?.manufacturingCostPerPortionHt,
                ),
              )}
            />
          </dl>
        </TabsContent>

        <TabsContent value="price" variant="section">
          <div className="space-y-5">
            <dl className="rounded-lg border border-border px-4">
              <DetailRow label="Base de vente" value={saleBasisLabel} />
              <DetailRow
                label="TVA de vente"
                value={formatBasisPoints(
                  productionSnapshot?.vatRateBasisPoints,
                )}
              />
              <DetailRow
                label="Marge cible"
                value={formatBasisPoints(targetMarginBasisPoints)}
              />
              <DetailRow
                label="Prix de vente calculé HT"
                value={formatDecimalCurrency(
                  decimalValue(economicSnapshot?.theoreticalPriceHt),
                )}
              />
              <DetailRow
                label="Prix de vente calculé TTC"
                value={formatDecimalCurrency(
                  decimalValue(economicSnapshot?.theoreticalPriceTtc),
                )}
              />
              <DetailRow
                label="Prix conseillé TTC"
                value={formatMinorCurrency(
                  economicSnapshot?.advisedPriceTtcMinor,
                )}
              />
              <DetailRow
                label="Prix retenu TTC"
                value={formatMinorCurrency(
                  economicSnapshot?.finalPriceTtcMinor,
                )}
              />
              <DetailRow
                label="Plancher économique TTC"
                value={formatDecimalCurrency(
                  decimalValue(economicSnapshot?.economicFloorTtc),
                )}
              />
              <DetailRow
                label={metricLabel(
                  'actualMarginBasisPoints',
                  'Marge réelle',
                )}
                value={formatBasisPoints(actualMarginBasisPoints)}
              />
              <DetailRow
                label={metricLabel(
                  'actualMarginAmountHt',
                  'Marge sur coût de fabrication HT',
                )}
                value={formatDecimalCurrency(
                  decimalValue(
                    economicSnapshot?.actualMarginAmountHt,
                  ),
                )}
              />
              <DetailRow
                label={metricLabel(
                  'manufacturingMarginProductionHt',
                  'Marge sur coût de fabrication HT · production',
                )}
                value={formatDecimalCurrency(
                  decimalValue(
                    economicSnapshot?.manufacturingMarginProductionHt,
                  ),
                )}
              />
              <DetailRow
                label={metricLabel(
                  'targetMarginDeltaBasisPoints',
                  'Écart vs cible',
                )}
                value={formatSignedBasisPointDelta(
                  targetDeltaBasisPoints,
                )}
              />
              <DetailRow
                label={metricLabel(
                  'targetMarginDeltaAmountHt',
                  'Écart monétaire vs cible',
                )}
                value={formatSignedCurrencyDelta(
                  economicSnapshot?.targetMarginDeltaAmountHt,
                )}
              />
              <DetailRow
                label={metricLabel(
                  'targetMarginDeltaProductionHt',
                  'Écart production vs cible',
                )}
                value={formatSignedCurrencyDelta(
                  economicSnapshot?.targetMarginDeltaProductionHt,
                )}
              />
            </dl>
            <DiagnosticPanel diagnostic={diagnostic} />
            <MarginComparison
              actualBasisPoints={actualMarginBasisPoints}
              diagnosticTone={diagnostic.tone}
              targetBasisPoints={targetMarginBasisPoints}
              targetDeltaBasisPoints={targetDeltaBasisPoints}
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
  formatSignedBasisPointDelta,
  formatSignedCurrencyDelta,
  getMarginDiagnostic,
  MarginComparison,
  RatioBar,
  TechnicalSheetAnalysisDrawer,
};
