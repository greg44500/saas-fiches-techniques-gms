import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProductVariantField } from '@/features/products/components/product-variant-field';
import { IngredientChoices } from '@/features/process-sheets/components/process-sheet-editor-fields';
import { ProcessPhasePicker } from '@/features/process-sheets/components/process-phase-picker';

// Phase-specific fields reuse existing inputs and ingredient selectors.
function ProcessSheetPhaseEditor({
  phase, index, count, ingredients, disabled, onChange,
  onChangeIngredients, onAddStep, onMove, onRequestDelete,
  workspaceId, dossierId, canReadPhaseLibrary,
}) {
  return (
    <section aria-label={'Phase ' + (index + 1)} className="space-y-4" role="region">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold">Phase {index + 1}</p>
        {!disabled && (
          <div className="flex items-center gap-1">
            <Button aria-label={'Monter phase ' + (index + 1)}
              disabled={index === 0} onClick={() => onMove(-1)}
              size="icon" type="button" variant="ghost">
              <ArrowUp aria-hidden="true" className="size-4" />
            </Button>
            <Button aria-label={'Descendre phase ' + (index + 1)}
              disabled={index === count - 1} onClick={() => onMove(1)}
              size="icon" type="button" variant="ghost">
              <ArrowDown aria-hidden="true" className="size-4" />
            </Button>
            <Button aria-label={'Supprimer phase ' + (index + 1)}
              onClick={onRequestDelete} size="icon" type="button" variant="ghost">
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          </div>
        )}
      </div>
      <ProductVariantField floating filled={Boolean(phase.title)}
        id={'phase-' + phase.id} label="Titre de la phase">
        <Input className="h-12 placeholder:text-transparent focus:placeholder:text-muted-foreground"
          disabled={disabled} id={'phase-' + phase.id} maxLength={160}
          placeholder="Ex. Préparation" value={phase.title}
          onChange={(event) => onChange({ ...phase, title: event.target.value })} />
      </ProductVariantField>
      {!disabled && (
        <ProcessPhasePicker
          canReadLibrary={canReadPhaseLibrary}
          dossierId={dossierId}
          mode="rename"
          onSelect={(title) => onChange({ ...phase, title })}
          workspaceId={workspaceId}
        />
      )}
      <label className="grid gap-1 text-sm">Instructions de la phase
        <Textarea disabled={disabled} maxLength={5000}
          value={phase.instructions ?? ''}
          onChange={(event) => onChange({ ...phase, instructions: event.target.value })} />
      </label>
      <IngredientChoices
        disabled={disabled}
        ingredients={ingredients}
        label="Ingrédients directement affectés à la phase"
        selected={phase.ingredientLineKeys ?? []}
        onChange={onChangeIngredients}
      />
      {!disabled && (
        <Button disabled={phase.steps.length >= 40} onClick={onAddStep}
          size="sm" type="button" variant="outline">
          <Plus aria-hidden="true" className="size-4" />
          Ajouter une étape
        </Button>
      )}
    </section>
  );
}

export { ProcessSheetPhaseEditor };
