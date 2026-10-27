import { Check } from 'lucide-react';

import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';

// This is a compact progress indicator, not an ingredient editor.
// Keep each M-004 occurrence identified by lineKey, even when names repeat.
function ProcessIngredientRail({ ingredients, phases }) {
  const usages = new Map();

  for (const phase of phases) {
    const phaseTitle = phase.title || 'Phase sans titre';
    for (const lineKey of phase.ingredientLineKeys ?? []) {
      usages.set(lineKey, [
        ...(usages.get(lineKey) ?? []),
        'Phase : ' + phaseTitle,
      ]);
    }
    for (const step of phase.steps ?? []) {
      for (const lineKey of step.ingredientLineKeys ?? []) {
        usages.set(lineKey, [
          ...(usages.get(lineKey) ?? []),
          'Étape : ' + (step.title || 'Étape sans titre') + ' · ' + phaseTitle,
        ]);
      }
    }
  }

  const assignedCount = ingredients.filter((line) => usages.has(line.lineKey)).length;
  const remainingCount = ingredients.length - assignedCount;

  return (
    <aside
      aria-label="Suivi des ingrédients"
      className="min-w-0 rounded-xl border border-border bg-card p-4 lg:min-h-0 lg:overflow-y-auto"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Ingrédients</h3>
        <p className="text-xs text-muted-foreground" role="status">
          {assignedCount} affecté{assignedCount === 1 ? '' : 's'} · {remainingCount} à affecter
        </p>
      </div>
      <ul aria-label="Liste des ingrédients" className="mt-4 space-y-0.5">
        {ingredients.map((line) => {
          const locations = usages.get(line.lineKey) ?? [];
          return (
            <li className="flex min-w-0 items-center gap-2 rounded-md py-1.5" key={line.lineKey}>
              <span className="min-w-0 flex-1 text-sm">
                {line.productVariantName ?? 'Référence indisponible'}
              </span>
              {locations.length > 0 && (
                <Tooltip>
                  <TooltipTrigger
                    aria-label={'Affecté dans : ' + locations.join(' ; ')}
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-emerald-400"
                    type="button"
                  >
                    <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="space-y-1">
                      {locations.map((location, index) => (
                        <p key={index}>{location}</p>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </li>
          );
        })}
      </ul>
      {ingredients.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">Aucun ingrédient disponible.</p>
      )}
    </aside>
  );
}

export { ProcessIngredientRail };
