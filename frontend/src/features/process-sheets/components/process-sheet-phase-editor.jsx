import { ArrowDown, ArrowUp } from 'lucide-react';

import { ProcessIconAction } from '@/features/process-sheets/components/process-icon-action';
import { IngredientChoices } from '@/features/process-sheets/components/process-sheet-editor-fields';
import { Textarea } from '@/components/ui/textarea';

// Structural actions (create, rename, delete) live in the phase tree.
// The contextual editor only changes the selected phase's content.
function ProcessSheetPhaseEditor({
  phase, index, count, ingredients, disabled, onChange,
  onChangeIngredients, onMove,
}) {
  return (
    <section aria-label={'Phase ' + (index + 1)} className="space-y-4" role="region">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="min-w-0 break-words text-sm font-semibold">
          Phase {index + 1} : {phase.title || 'Phase sans titre'}
        </h4>
        {!disabled && (
          <div className="flex items-center gap-1">
            <ProcessIconAction
              disabled={index === 0}
              icon={ArrowUp}
              label={'Monter phase ' + (index + 1)}
              onClick={() => onMove(-1)}
            />
            <ProcessIconAction
              disabled={index === count - 1}
              icon={ArrowDown}
              label={'Descendre phase ' + (index + 1)}
              onClick={() => onMove(1)}
            />
          </div>
        )}
      </div>
      <label className="grid gap-1 text-sm">
        Instructions de la phase
        <Textarea
          className="focus-visible:border-ring focus-visible:ring-0 focus-visible:ring-offset-0"
          disabled={disabled}
          maxLength={5000}
          onChange={(event) => onChange({ ...phase, instructions: event.target.value })}
          value={phase.instructions ?? ''}
        />
      </label>
      <IngredientChoices
        disabled={disabled}
        ingredients={ingredients}
        label="Ingrédients directement affectés à la phase"
        onChange={onChangeIngredients}
        selected={phase.ingredientLineKeys ?? []}
      />
    </section>
  );
}

export { ProcessSheetPhaseEditor };
