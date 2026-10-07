import {
  Package,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Truck,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
    shortLabel: 'Appro.',
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

      <div className="shrink-0 border-b border-border px-3 py-2.5">
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
          <>
            <nav
              aria-label="Outils de réglage"
              className="grid shrink-0 grid-cols-4 border-b border-border bg-muted/15"
            >
              {TOOLS.map(
                ({
                  key,
                  label,
                  shortLabel,
                  Icon,
                }) => {
                  const disabled =
                    key === 'SOURCING'
                    && !canManageSourcing;
                  const active =
                    activeTool === key;

                  return (
                    <Button
                      aria-label={label}
                      aria-pressed={active}
                      className={
                        'h-14 min-w-0 rounded-none border-r border-border px-1 last:border-r-0 '
                        + (
                          active
                            ? 'bg-primary/10 text-foreground'
                            : 'text-muted-foreground'
                        )
                      }
                      disabled={disabled}
                      key={key}
                      onClick={() =>
                        setActiveTool(key)}
                      type="button"
                      variant="ghost"
                    >
                      <span className="flex min-w-0 flex-col items-center gap-1">
                        <Icon
                          aria-hidden="true"
                          className="size-4"
                        />
                        <span className="max-w-full truncate text-[11px] font-medium">
                          {shortLabel ?? label}
                        </span>
                      </span>
                    </Button>
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
          </>
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
    </section>
  );
}

export {
  TechnicalSheetOptimizerControlsPanel,
};
