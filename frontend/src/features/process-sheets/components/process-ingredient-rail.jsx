import { useState } from 'react';
import { Check, Circle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ingredientName } from '@/features/process-sheets/components/process-sheet-editor-fields';

// This rail remains visible while the selected phase or step changes.
// Assignment means "used at least once", never exclusive consumption.
function ProcessIngredientRail({ ingredients, phases, unassignedReasons, editable, onReasonChange }) {
  const [visibleReasonKeys, setVisibleReasonKeys] = useState([]);
  const assigned = new Set(phases.flatMap((phase) => [
    ...(phase.ingredientLineKeys ?? []),
    ...phase.steps.flatMap((step) => step.ingredientLineKeys ?? []),
  ]));
  const unassigned = ingredients.filter((line) => !assigned.has(line.lineKey));
  const reasonFor = (lineKey) => unassignedReasons.find((item) => item.lineKey === lineKey)?.reason ?? '';
  const pendingCount = unassigned.filter((line) => !reasonFor(line.lineKey).trim()).length;
  const assignmentCount = (lineKey) => phases.reduce((count, phase) => (
    count
    + Number((phase.ingredientLineKeys ?? []).includes(lineKey))
    + phase.steps.reduce((sum, step) => sum + Number((step.ingredientLineKeys ?? []).includes(lineKey)), 0)
  ), 0);

  return (
          <aside
            aria-label="Suivi des ingrédients"
            className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-4 lg:min-h-0 lg:overflow-y-auto"
          >
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Ingrédients M-004</h3>
              <p className="text-xs text-muted-foreground">
                {ingredients.length - unassigned.length} sur {ingredients.length} affectés
              </p>
              <p className="text-xs text-muted-foreground">
                Une ligne peut être associée à plusieurs opérations.
              </p>
            </div>
            <section className="space-y-2" aria-label="Ingrédients à examiner">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold" role="heading" aria-level="3">
                  Ingrédients non affectés ({unassigned.length})
                </h4>
                {pendingCount > 0 && (
                  <span className="text-xs text-muted-foreground">{pendingCount} à examiner</span>
                )}
              </div>
              {unassigned.length === 0 ? (
                <p className="text-xs text-muted-foreground">Tous les ingrédients sont affectés à une phase ou une étape.</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {unassigned.map((line) => {
                    const label = ingredientName(line);
                    const existingReason = reasonFor(line.lineKey);
                    const showReason = Boolean(existingReason) || visibleReasonKeys.includes(line.lineKey);
                    return (
                      <li className="space-y-2 py-2" key={line.lineKey}>
                        <div className="flex items-start gap-2">
                          <Circle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="min-w-0 flex-1 text-xs">{label}</span>
                        </div>
                        {!showReason && editable && (
                          <Button size="sm" type="button" variant="ghost"
                            onClick={() => setVisibleReasonKeys((keys) => [...keys, line.lineKey])}>
                            Justifier la non-utilisation
                          </Button>
                        )}
                        {showReason && (
                          <label className="grid gap-1 text-xs">
                            {label} — justification éventuelle
                            <Input disabled={!editable} maxLength={1000}
                              placeholder="Pourquoi cet ingrédient n’est-il pas utilisé ?"
                              value={existingReason}
                              onChange={(event) => onReasonChange(line.lineKey, event.target.value)} />
                          </label>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
            <section className="space-y-2 border-t border-border pt-3" aria-label="Ingrédients déjà affectés">
              <h4 className="text-sm font-semibold">Déjà affectés ({ingredients.length - unassigned.length})</h4>
              {ingredients.filter((line) => assigned.has(line.lineKey)).length === 0 ? (
                <p className="text-xs text-muted-foreground">Les affectations apparaîtront ici.</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {ingredients.filter((line) => assigned.has(line.lineKey)).map((line) => (
                    <li className="flex items-start gap-2 py-2" key={line.lineKey}>
                      <Check className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1 text-xs">{ingredientName(line)}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {assignmentCount(line.lineKey)} association(s)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
  );
}

export { ProcessIngredientRail };
