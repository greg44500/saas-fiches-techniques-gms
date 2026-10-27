import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { ProcessStepDetails } from '@/features/process-sheets/components/process-step-details-dialog';
import { ProcessIconAction } from '@/features/process-sheets/components/process-icon-action';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProductVariantField } from '@/features/products/components/product-variant-field';

function ingredientName(line) {
  const position = Number.isInteger(line.sourcePosition) ? line.sourcePosition + 1 : '?';
  return (line.productVariantName ?? 'Référence indisponible') + ' (ligne ' + position + ')';
}

// The composition is opened only on demand. A line may be assigned to multiple
// phases/steps: checking it here adds an association, not a move.
function IngredientChoices({ ingredients, selected, onChange, disabled, label }) {
  const [expanded, setExpanded] = useState(false);
  const chosen = ingredients.filter((line) => selected.includes(line.lineKey));
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium text-muted-foreground">{label}</legend>
      <div className="flex flex-wrap items-center gap-1.5">
        {chosen.map((line) => (
          <span className="rounded-md bg-muted px-2 py-1 text-xs" key={line.lineKey}>
            {ingredientName(line)}
          </span>
        ))}
        {!chosen.length && <span className="text-xs text-muted-foreground">Aucun ingrédient associé</span>}
      </div>
      {ingredients.length > 0 && !disabled && (
        <Button
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Plus className="size-3" aria-hidden="true" />
          {expanded ? 'Fermer la sélection' : 'Associer des ingrédients'}
        </Button>
      )}
      <div
        aria-hidden={!expanded || disabled}
        className={expanded && !disabled
          ? 'grid grid-rows-[1fr] opacity-100 transition-[grid-template-rows,opacity] duration-200 ease-in-out motion-reduce:transition-none'
          : 'grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-200 ease-in-out motion-reduce:transition-none'}
        inert={!expanded || disabled ? true : undefined}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="grid gap-1 pb-2 sm:grid-cols-2">
            {ingredients.map((line) => (
              <label
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs hover:bg-muted/70"
                key={line.lineKey}
              >
                <Checkbox
                  checked={selected.includes(line.lineKey)}
                  disabled={disabled}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...selected, line.lineKey]
                      : selected.filter((key) => key !== line.lineKey);
                    onChange(next);
                  }}
                />
                <span>{ingredientName(line)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      {!ingredients.length && <p className="text-xs text-muted-foreground">Aucun ingrédient disponible.</p>}
    </fieldset>
  );
}

function ProcessStepFields({
  step, index, disabled, ingredients, onChange, onDelete, onMove, count,
}) {
  const assign = (field, value) => onChange({ ...step, [field]: value });

  return (
    <article aria-label={'Étape ' + (index + 1)} className="process-sheet-pane-enter space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold">Étape {index + 1} · {step.title || 'Étape sans titre'}</h4>
        </div>
        {!disabled && (
          <div className="flex gap-1">
            <ProcessIconAction
              disabled={index === 0}
              icon={ArrowUp}
              label={'Monter étape ' + (index + 1)}
              onClick={() => onMove(-1)}
            />
            <ProcessIconAction
              disabled={index === count - 1}
              icon={ArrowDown}
              label={'Descendre étape ' + (index + 1)}
              onClick={() => onMove(1)}
            />
            <ProcessIconAction
              icon={Trash2}
              label={'Supprimer étape ' + (index + 1)}
              onClick={onDelete}
            />
          </div>
        )}
      </div>
      <ProductVariantField floating filled={Boolean(step.title)}
        id={'step-' + step.id} label="Titre de l’étape">
        <Input
          className="h-12 placeholder:text-transparent focus:placeholder:text-muted-foreground"
          disabled={disabled} id={'step-' + step.id} maxLength={160}
          onChange={(event) => assign('title', event.target.value)}
          placeholder="Ex. Préparer les légumes" value={step.title}
        />
      </ProductVariantField>
      <label className="grid gap-1 text-sm">Instructions
        <Textarea
          className="focus-visible:border-ring focus-visible:ring-0 focus-visible:ring-offset-0"
          disabled={disabled} maxLength={5000}
          onChange={(event) => assign('instructions', event.target.value)}
          value={step.instructions ?? ''} />
      </label>
      <IngredientChoices
        disabled={disabled} ingredients={ingredients}
        label="Ingrédients affectés à cette étape"
        onChange={(next) => assign('ingredientLineKeys', next)}
        selected={step.ingredientLineKeys ?? []}
      />
      <ProcessStepDetails disabled={disabled} onChange={onChange} step={step} />
    </article>
  );
}

export { IngredientChoices, ProcessStepFields, ingredientName };
