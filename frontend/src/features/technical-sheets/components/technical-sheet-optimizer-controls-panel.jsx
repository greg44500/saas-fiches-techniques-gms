import {
  Package,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  TechnicalSheetOptimizerInspector,
} from '@/features/technical-sheets/components/technical-sheet-optimizer-inspector';

const TOOLS = Object.freeze([
  {
    key: 'ADJUSTMENT',
    label: 'Réglage',
    Icon: SlidersHorizontal,
  },
  {
    key: 'PRODUCT',
    label: 'Produit',
    Icon: Package,
  },
  {
    key: 'SOURCING',
    label: 'Approvisionnement',
    Icon: Truck,
  },
  {
    key: 'CONSTRAINTS',
    label: 'Contraintes',
    Icon: ShieldCheck,
  },
]);

function TechnicalSheetOptimizerControlsPanel({
  alternatives,
  applying,
  autoOptions,
  autoSuggestion,
  baselineLine,
  canApply,
  canManageSourcing,
  comparing,
  costAdjustmentRange,
  line,
  ingredientColorMap,
  mode,
  onApply,
  onAutoOptionChange,
  onChangeLine,
  onCompare,
  onTakeAutoSuggestion,
  profile,
  projectionLine,
}) {
  const [activeTool, setActiveTool] =
    useState('ADJUSTMENT');

  return (
    <section
      aria-label="Panneau de pilotage"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="shrink-0">
        {profile}
      </div>

      {mode === 'MANUAL'
        ? (
          <>
            <nav
              aria-label="Outils de réglage"
              className="grid shrink-0 grid-cols-4 border-b border-border bg-muted/10"
            >
              {TOOLS.map(
                ({
                  key,
                  label,
                  Icon,
                }) => {
                  const disabled =
                    key === 'SOURCING'
                    && !canManageSourcing;
                  const active =
                    activeTool === key;

                  return (
                    <Tooltip key={key}>
                      <TooltipTrigger
                        render={(
                          <Button
                            aria-label={label}
                            aria-pressed={active}
                            className={
                              'h-10 min-w-0 rounded-none border-r border-border px-0 last:border-r-0 '
                              + (
                                active
                                  ? 'bg-primary/10 text-foreground'
                                  : 'text-muted-foreground'
                              )
                            }
                            disabled={disabled}
                            onClick={() =>
                              setActiveTool(key)}
                            type="button"
                            variant="ghost"
                          />
                        )}
                      >
                        <Icon
                          aria-hidden="true"
                          className="size-4"
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        {label}
                      </TooltipContent>
                    </Tooltip>
                  );
                },
              )}
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <TechnicalSheetOptimizerInspector
                activeTool={
                  activeTool
                }
                alternatives={
                  alternatives
                }
                baselineLine={
                  baselineLine
                }
                canManageSourcing={
                  canManageSourcing
                }
                line={line}
                ingredientColorMap={ingredientColorMap}
                onChange={
                  onChangeLine
                }
                onOpenConstraints={() =>
                  setActiveTool(
                    'CONSTRAINTS',
                  )}
                projectionLine={
                  projectionLine
                }
                range={
                  costAdjustmentRange
                }
              />
            </div>
          </>
        )
        : (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
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
                  onClick={
                    onTakeAutoSuggestion
                  }
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

      <div className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-border bg-card p-2">
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
          disabled={!canApply}
          onClick={onApply}
          size="sm"
          type="button"
        >
          {applying
            ? 'Application…'
            : 'Appliquer au brouillon'}
        </Button>
      </div>
    </section>
  );
}

export {
  TechnicalSheetOptimizerControlsPanel,
};
