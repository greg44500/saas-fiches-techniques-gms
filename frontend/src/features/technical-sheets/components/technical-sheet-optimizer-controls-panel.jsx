import {
  Package,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Truck,
  WandSparkles,
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
  mode,
  onApply,
  onAutoOptionChange,
  onChangeLine,
  onCompare,
  onModeChange,
  onReset,
  onTakeAutoSuggestion,
  projectionLine,
}) {
  const [activeTool, setActiveTool] =
    useState('ADJUSTMENT');

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="shrink-0 border-b border-border p-3">
        <div className="mb-3 flex items-center gap-2">
          <WandSparkles
            aria-hidden="true"
            className="size-4"
          />
          <p className="text-sm font-semibold">
            Réglages
          </p>
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
      </div>

      {mode === 'MANUAL'
        ? (
          <div className="flex min-h-0 flex-1">
            <nav
              aria-label="Outils de réglage"
              className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-border bg-muted/20 py-3"
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

                  return (
                    <Tooltip key={key}>
                      <TooltipTrigger
                        aria-label={
                          label
                        }
                        aria-pressed={
                          activeTool
                          === key
                        }
                        className={
                          'inline-flex size-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring '
                          + (
                            activeTool
                            === key
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          )
                          + (
                            disabled
                              ? ' cursor-not-allowed opacity-40'
                              : ''
                          )
                        }
                        disabled={
                          disabled
                        }
                        onClick={() =>
                          setActiveTool(
                            key,
                          )}
                      >
                        <Icon
                          aria-hidden="true"
                          className="size-4"
                        />
                      </TooltipTrigger>
                      <TooltipContent side="left">
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
                onChange={
                  onChangeLine
                }
                projectionLine={
                  projectionLine
                }
                range={
                  costAdjustmentRange
                }
              />
            </div>
          </div>
        )
        : (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
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

      <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border bg-card p-3">
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
