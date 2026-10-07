import {
  RotateCcw,
  Sparkles,
  WandSparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  TechnicalSheetOptimizationCurve,
} from '@/features/technical-sheets/components/technical-sheet-optimization-curve';
import {
  TechnicalSheetOptimizerInspector,
} from '@/features/technical-sheets/components/technical-sheet-optimizer-inspector';

function TechnicalSheetOptimizerControlsPanel({
  alternatives,
  applying,
  autoOptions,
  autoSuggestion,
  canApply,
  canManageSourcing,
  comparing,
  costAdjustmentRange,
  curve,
  curvePoints,
  line,
  mode,
  onApply,
  onAutoOptionChange,
  onChangeLine,
  onCompare,
  onCurveChange,
  onModeChange,
  onReset,
  onTakeAutoSuggestion,
  projectionLine,
}) {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="space-y-2 pb-3">
          <div className="flex items-center gap-2">
            <WandSparkles
              aria-hidden="true"
              className="size-4"
            />
            <CardTitle className="text-sm">
              Réglages économiques
            </CardTitle>
          </div>

          <div
            aria-label="Mode d’optimisation"
            className="grid grid-cols-2 rounded-lg border border-border p-1"
            role="group"
          >
            <Button
              onClick={() =>
                onModeChange('MANUAL')}
              size="sm"
              type="button"
              variant={
                mode === 'MANUAL'
                  ? 'secondary'
                  : 'ghost'
              }
            >
              Manuel
            </Button>
            <Button
              onClick={() =>
                onModeChange('AUTO')}
              size="sm"
              type="button"
              variant={
                mode === 'AUTO'
                  ? 'secondary'
                  : 'ghost'
              }
            >
              <Sparkles
                aria-hidden="true"
                className="size-4"
              />
              Auto
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {mode === 'MANUAL'
            ? (
              <>
                <div>
                  <p className="text-sm font-medium">
                    Ajustement économique global
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    L’axe horizontal classe les lignes selon leur contribution actuelle au coût matière. Montez la courbe pour réduire les coûts ; la quantité compatible est recalculée automatiquement.
                  </p>
                </div>

                <TechnicalSheetOptimizationCurve
                  curve={curve}
                  onChange={onCurveChange}
                  points={curvePoints}
                  range={costAdjustmentRange}
                />
              </>
            )
            : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">
                    Leviers automatiques
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Le serveur propose un prochain mouvement favorable sans modifier le brouillon.
                  </p>
                </div>

                {[
                  [
                    'adjustQuantities',
                    'Quantités avec garde-fou',
                  ],
                  [
                    'productAlternatives',
                    'Produit / rendement',
                  ],
                  [
                    'sourcingAlternatives',
                    'Approvisionnement',
                  ],
                ].map(([key, label]) => (
                  <label
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                    key={key}
                  >
                    <span>{label}</span>
                    <Switch
                      checked={
                        autoOptions[key]
                      }
                      disabled={
                        key
                          === 'sourcingAlternatives'
                        && !canManageSourcing
                      }
                      onCheckedChange={(checked) =>
                        onAutoOptionChange(
                          key,
                          checked,
                        )}
                    />
                  </label>
                ))}

                {autoSuggestion && (
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-sm font-medium">
                      Proposition disponible
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {autoSuggestion.kind === 'QUANTITY'
                        ? 'Ajustement d’une quantité'
                        : autoSuggestion.kind === 'PRODUCT'
                          ? 'Alternative Produit'
                          : 'Alternative d’approvisionnement'}
                      {autoSuggestion.label
                        ? ' · ' + autoSuggestion.label
                        : ''}
                    </p>
                    <Button
                      className="mt-3 w-full"
                      onClick={onTakeAutoSuggestion}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Reprendre en Manuel
                    </Button>
                  </div>
                )}
              </div>
            )}
        </CardContent>
      </Card>

      {mode === 'MANUAL' && (
        <TechnicalSheetOptimizerInspector
          alternatives={alternatives}
          canManageSourcing={
            canManageSourcing
          }
          line={line}
          onChange={onChangeLine}
          projectionLine={
            projectionLine
          }
        />
      )}

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3">
        <Button
          onClick={onReset}
          size="sm"
          type="button"
          variant="ghost"
        >
          <RotateCcw
            aria-hidden="true"
            className="size-4"
          />
          Réinitialiser
        </Button>
        <Button
          disabled={comparing}
          onClick={onCompare}
          size="sm"
          type="button"
          variant="outline"
        >
          {comparing
            ? 'Calcul…'
            : 'Comparer'}
        </Button>
        <Button
          className="col-span-2"
          disabled={!canApply}
          onClick={onApply}
          type="button"
        >
          {applying
            ? 'Application…'
            : 'Appliquer au brouillon'}
        </Button>
      </div>
    </div>
  );
}

export {
  TechnicalSheetOptimizerControlsPanel,
};
