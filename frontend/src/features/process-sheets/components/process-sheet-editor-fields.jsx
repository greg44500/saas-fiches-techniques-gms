import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { ProcessSheetDisclosure } from '@/features/process-sheets/components/process-sheet-disclosure';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProductVariantField } from '@/features/products/components/product-variant-field';

function updateAt(items, index, value) {
  return items.map((item, i) => i === index ? value : item);
}

function StringListEditor({ label, items, disabled, onChange }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium">{label}</legend>
      {items.map((item, index) => (
        <div className="flex items-center gap-2" key={index}>
          <Input
            aria-label={label + ' ' + (index + 1)}
            disabled={disabled}
            maxLength={1000}
            onChange={(event) => onChange(updateAt(items, index, event.target.value))}
            value={item}
          />
          {!disabled && (
            <Button
              aria-label={'Supprimer ' + label + ' ' + (index + 1)}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              size="icon" type="button" variant="ghost"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <Button
          disabled={items.length >= 30}
          onClick={() => onChange([...items, ''])}
          size="sm" type="button" variant="outline"
        >
          <Plus aria-hidden="true" className="size-3" /> Ajouter
        </Button>
      )}
    </fieldset>
  );
}



function ingredientName(line) {
  return (line.productVariantName ?? 'Référence indisponible') + ' (ligne ' + (line.sourcePosition + 1) + ')';
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

function ControlFields({ label, controls, disabled, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="text-xs font-medium">{label}</h5>
        <Button
          disabled={disabled || controls.length >= 30}
          onClick={() => onChange([...controls, { instruction: '' }])}
          size="sm" type="button" variant="outline"
        >
          <Plus className="size-3" aria-hidden="true" /> Ajouter un contrôle
        </Button>
      </div>
      {controls.map((control, index) => (
        <div className="grid gap-2 border-l-2 border-border pl-3" key={index}>
          {[
            ['instruction', 'Instruction'],
            ['expectedCriterion', 'Critère attendu'],
            ['correctiveAction', 'Mesure corrective'],
          ].map(([name, text]) => (
            <label className="grid gap-1 text-xs" key={name}>
              {text}
              <Input
                aria-label={label + ' ' + text + ' ' + (index + 1)}
                disabled={disabled}
                onChange={(event) => onChange(updateAt(controls, index, {
                  ...control, [name]: event.target.value,
                }))}
                value={control[name] ?? ''}
              />
            </label>
          ))}
          <Button
            disabled={disabled}
            onClick={() => onChange(controls.filter((_, i) => i !== index))}
            size="sm" type="button" variant="ghost"
          >Supprimer ce contrôle</Button>
        </div>
      ))}
    </div>
  );
}



function ProcessStepFields({
  step, index, disabled, ingredients, onChange, onDelete, onMove, count,
}) {
  const assign = (field, value) => onChange({ ...step, [field]: value });
  const setDuration = (field, raw) => {
    const duration = { ...(step.duration ?? {}) };
    if (raw === '') delete duration[field];
    else duration[field] = Number(raw);
    assign('duration', duration);
  };
  const hasDetails = Boolean(step.duration && Object.keys(step.duration).length)
    || step.temperatureCelsius != null || Boolean(step.equipment?.length)
    || Boolean(step.manufacturingVigilance?.length)
    || Boolean(step.qualityControls?.length) || Boolean(step.sanitaryControls?.length);

  return (
    <article aria-label={'Étape ' + (index + 1)} className="process-sheet-pane-enter space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold">Étape {index + 1} · {step.title || 'Étape sans titre'}</h4>
          <p className="text-xs text-muted-foreground">Édition de l’opération sélectionnée</p>
        </div>
        {!disabled && (
          <div className="flex gap-1">
            <Button aria-label={'Monter étape ' + (index + 1)}
              disabled={index === 0} onClick={() => onMove(-1)} size="icon"
              type="button" variant="ghost"><ArrowUp className="size-4" aria-hidden="true" /></Button>
            <Button aria-label={'Descendre étape ' + (index + 1)}
              disabled={index === count - 1} onClick={() => onMove(1)} size="icon"
              type="button" variant="ghost"><ArrowDown className="size-4" aria-hidden="true" /></Button>
            <Button aria-label={'Supprimer étape ' + (index + 1)}
              onClick={onDelete} size="icon" type="button" variant="ghost">
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
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
        <Textarea disabled={disabled} maxLength={5000}
          onChange={(event) => assign('instructions', event.target.value)}
          value={step.instructions ?? ''} />
      </label>
      <IngredientChoices
        disabled={disabled} ingredients={ingredients}
        label="Ingrédients affectés à cette étape"
        onChange={(next) => assign('ingredientLineKeys', next)}
        selected={step.ingredientLineKeys ?? []}
      />
      <div className="border-t border-border/70">
        <ProcessSheetDisclosure title={'Temps, température et équipements · ' + (hasDetails ? 'Renseignés' : 'Facultatifs')}>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ['activeMinutes', 'Temps actif (min)'],
              ['restMinutes', 'Repos / attente (min)'],
              ['treatmentMinutes', 'Cuisson / traitement (min)'],
            ].map(([field, label]) => (
              <label className="grid gap-1 text-xs" key={field}>{label}
                <Input disabled={disabled} min="0" max="10080" type="number" step="1"
                  onChange={(event) => setDuration(field, event.target.value)}
                  value={step.duration?.[field] ?? ''} />
              </label>
            ))}
          </div>
          <label className="grid gap-1 text-xs">Température (°C)
            <Input disabled={disabled} min="-100" max="350" step="0.1" type="number"
              value={step.temperatureCelsius ?? ''}
              onChange={(event) => assign('temperatureCelsius', event.target.value === '' ? null : Number(event.target.value))} />
          </label>
          <StringListEditor label="Équipements" items={step.equipment ?? []}
            disabled={disabled} onChange={(items) => assign('equipment', items)} />
        </ProcessSheetDisclosure>
        <ProcessSheetDisclosure title="Vigilance, qualité et maîtrise sanitaire · Facultatifs">
          <div className="space-y-4">
            <StringListEditor label="Points de vigilance" items={step.manufacturingVigilance ?? []}
              disabled={disabled} onChange={(items) => assign('manufacturingVigilance', items)} />
            <ControlFields label="Qualité" controls={step.qualityControls ?? []}
              disabled={disabled} onChange={(next) => assign('qualityControls', next)} />
            <ControlFields label="Maîtrise sanitaire" controls={step.sanitaryControls ?? []}
              disabled={disabled} onChange={(next) => assign('sanitaryControls', next)} />
          </div>
        </ProcessSheetDisclosure>
      </div>
    </article>
  );
}

export { IngredientChoices, ProcessStepFields, ingredientName };
