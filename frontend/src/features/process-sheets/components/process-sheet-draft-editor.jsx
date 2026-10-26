import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProductVariantField } from '@/features/products/components/product-variant-field';
import { useSaveProcessSheetDraftMutation } from '@/features/process-sheets/api/process-sheets-api';

function makeId() {
  const suffix = Math.random().toString(36).slice(2, 12);
  return 'item-' + Date.now().toString(36) + '-' + suffix;
}
function newStep() {
  return {
    id: makeId(), title: 'Nouvelle étape', instructions: '',
    ingredientLineKeys: [], equipment: [], manufacturingVigilance: [],
    qualityControls: [], sanitaryControls: [],
  };
}
function newPhase() {
  return {
    id: makeId(), title: 'Nouvelle phase', instructions: '',
    ingredientLineKeys: [], steps: [],
  };
}
function move(items, index, offset) {
  const destination = index + offset;
  if (destination < 0 || destination >= items.length) return items;
  const next = [...items];
  [next[index], next[destination]] = [next[destination], next[index]];
  return next;
}
function updateAt(items, index, value) {
  return items.map((item, i) => i === index ? value : item);
}
const normalize = (draft) => ({
  phases: draft?.phases ?? [],
  unassignedReasons: draft?.unassignedReasons ?? [],
});
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

function IngredientChoices({ ingredients, selected, onChange, disabled, label }) {
  if (!ingredients.length) return <p className="text-xs text-muted-foreground">Aucun ingrédient disponible.</p>;
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium text-muted-foreground">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {ingredients.map((ingredient, index) => (
          <label
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1 text-xs"
            key={ingredient.lineKey}
          >
            <Checkbox
              checked={selected.includes(ingredient.lineKey)}
              disabled={disabled}
              onChange={(event) => {
                const next = event.target.checked
                  ? [...selected, ingredient.lineKey]
                  : selected.filter((key) => key !== ingredient.lineKey);
                onChange(next);
              }}
            />
            {ingredient.productVariantName ?? 'Référence indisponible'} ({index + 1})
          </label>
        ))}
      </div>
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
        <div className="grid gap-2 rounded-md border border-border p-2" key={index}>
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

function ProcessStepEditor({ step, index, disabled, ingredients, onChange, onDelete, onMove, count }) {
  const assign = (field, value) => onChange({ ...step, [field]: value });
  const setDuration = (field, raw) => {
    const duration = { ...(step.duration ?? {}) };
    if (raw === '') delete duration[field];
    else duration[field] = Number(raw);
    assign('duration', duration);
  };
  return (
    <article className="space-y-3 rounded-lg border border-border p-3" aria-label={'Étape ' + (index + 1)}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Étape {index + 1}</h4>
        {!disabled && (
          <div className="flex gap-1">
            <Button aria-label={'Monter étape ' + (index + 1)} disabled={index === 0} onClick={() => onMove(-1)} size="icon" type="button" variant="ghost"><ArrowUp className="size-4" /></Button>
            <Button aria-label={'Descendre étape ' + (index + 1)} disabled={index === count - 1} onClick={() => onMove(1)} size="icon" type="button" variant="ghost"><ArrowDown className="size-4" /></Button>
            <Button aria-label={'Supprimer étape ' + (index + 1)} onClick={onDelete} size="icon" type="button" variant="ghost"><Trash2 className="size-4" /></Button>
          </div>
        )}
      </div>
      <ProductVariantField floating filled={Boolean(step.title)} id={'step-' + step.id} label="Titre de l’étape">
        <Input
          className="h-12 placeholder:text-transparent focus:placeholder:text-muted-foreground"
          disabled={disabled} id={'step-' + step.id} maxLength={160}
          onChange={(event) => assign('title', event.target.value)}
          placeholder="Ex. Émincer les légumes" value={step.title}
        />
      </ProductVariantField>
      <label className="grid gap-1 text-sm">Instructions
        <Textarea disabled={disabled} maxLength={5000} onChange={(event) => assign('instructions', event.target.value)} value={step.instructions ?? ''} />
      </label>
      <IngredientChoices disabled={disabled} ingredients={ingredients} label="Ingrédients affectés à cette étape" onChange={(next) => assign('ingredientLineKeys', next)} selected={step.ingredientLineKeys ?? []} />
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          ['activeMinutes', 'Temps actif (min)'],
          ['restMinutes', 'Repos / attente (min)'],
          ['treatmentMinutes', 'Cuisson / traitement (min)'],
        ].map(([field, label]) => (
          <label className="grid gap-1 text-xs" key={field}>{label}
            <Input disabled={disabled} min="0" max="10080" type="number" step="1" onChange={(event) => setDuration(field, event.target.value)} value={step.duration?.[field] ?? ''} />
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs">Température (°C)
          <Input disabled={disabled} min="-100" max="350" step="0.1" type="number" value={step.temperatureCelsius ?? ''} onChange={(event) => assign('temperatureCelsius', event.target.value === '' ? null : Number(event.target.value))} />
        </label>
        <StringListEditor
          label="Équipements"
          items={step.equipment ?? []}
          disabled={disabled}
          onChange={(items) => assign('equipment', items)}
        />
      </div>
      <StringListEditor
        label="Points de vigilance"
        items={step.manufacturingVigilance ?? []}
        disabled={disabled}
        onChange={(items) => assign('manufacturingVigilance', items)}
      />
      <ControlFields label="Qualité" controls={step.qualityControls ?? []} disabled={disabled} onChange={(next) => assign('qualityControls', next)} />
      <ControlFields label="Maîtrise sanitaire" controls={step.sanitaryControls ?? []} disabled={disabled} onChange={(next) => assign('sanitaryControls', next)} />
    </article>
  );
}

function ProcessSheetDraftEditor({
  initialDraft, sourceIngredients, canEdit, dossierId, processSheetId, workspaceId,
  onReload,
}) {
  const [form, setForm] = useState(() => normalize(initialDraft));
  const [revision, setRevision] = useState(initialDraft?.revision ?? 0);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);
  const [saveDraft, saving] = useSaveProcessSheetDraftMutation();
  const editable = canEdit && !saving.isLoading;

  // Do not overwrite an unsaved local edit when RTK Query refetches.
  // A newly saved revision is not replaced by a still-stale cached revision.
  useEffect(() => {
    if (!dirty && (initialDraft?.revision ?? 0) > revision) {
      setForm(normalize(initialDraft));
      setRevision(initialDraft.revision);
    }
  }, [initialDraft, dirty, revision]);

  const ingredients = sourceIngredients?.lines ?? [];
  const assigned = new Set(form.phases.flatMap((p) => [
    ...(p.ingredientLineKeys ?? []),
    ...p.steps.flatMap((s) => s.ingredientLineKeys ?? []),
  ]));
  const unassigned = ingredients.filter((line) => !assigned.has(line.lineKey));

  const edit = (updater) => {
    if (!editable) return;
    setForm((current) => typeof updater === 'function' ? updater(current) : updater);
    setDirty(true);
    setMessage('');
    setConflict(false);
  };
  const patchPhase = (i, phase) => edit((current) => ({
    ...current, phases: updateAt(current.phases, i, phase),
  }));
  const patchStep = (i, j, step) => {
    const phase = form.phases[i];
    patchPhase(i, { ...phase, steps: updateAt(phase.steps, j, step) });
  };
  const changeIngredients = (i, j, next) => {
    const updatedReasonKeys = new Set(next);
    if (j == null) {
      patchPhase(i, { ...form.phases[i], ingredientLineKeys: next });
    } else {
      patchStep(i, j, { ...form.phases[i].steps[j], ingredientLineKeys: next });
    }
    setForm((current) => ({
      ...current,
      unassignedReasons: current.unassignedReasons.filter((r) => !updatedReasonKeys.has(r.lineKey)),
    }));
  };
  const save = async () => {
    if (!editable || !dirty || conflict) return;
    setMessage('');
    try {
      const result = await saveDraft({
        workspaceId, dossierId, processSheetId, expectedRevision: revision,
        phases: form.phases,
        unassignedReasons: form.unassignedReasons.filter((item) => item.reason.trim()),
      }).unwrap();
      setForm(normalize(result));
      setRevision(result.revision);
      setDirty(false);
      setConflict(false);
      setMessage('Brouillon enregistré.');
    } catch (error) {
      const isConflict = error?.status === 409;
      setConflict(isConflict);
      setMessage(isConflict
        ? 'Une autre modification ou un changement de statut empêche la sauvegarde. Rechargez avant de recommencer.'
        : error?.data?.message ?? 'Échec de sauvegarde. Votre travail reste affiché.');
    }
  };
  const reload = async () => {
    const fresh = await onReload();
    if (fresh?.data?.draft) {
      setForm(normalize(fresh.data.draft));
      setRevision(fresh.data.draft.revision);
      setDirty(false);
      setConflict(false);
      setMessage('');
    }
  };
  const reasonFor = (lineKey) => form.unassignedReasons.find((r) => r.lineKey === lineKey)?.reason ?? '';
  const setReason = (lineKey, reason) => edit((current) => ({
    ...current,
    unassignedReasons: [
      ...current.unassignedReasons.filter((r) => r.lineKey !== lineKey),
      ...(reason ? [{ lineKey, reason }] : []),
    ],
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle>Phases et étapes</CardTitle>
            <InfoTooltip label="À propos du brouillon process" content="Les phases, étapes et ingrédients associés sont propres à cette Fiche process. Les modifications sont enregistrées manuellement et ne modifient pas la Fiche technique." />
          </div>
          {editable && (
            <Button disabled={!dirty || saving.isLoading || conflict} onClick={save} size="sm" type="button">
              <Save className="size-4" aria-hidden="true" /> {saving.isLoading ? 'Enregistrement…' : 'Enregistrer le brouillon'}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Révision {revision} · {dirty ? 'Modifications non enregistrées' : 'À jour'}
        </p>
        {!canEdit && <p className="text-sm text-muted-foreground">Consultation uniquement : droits d’édition ou Dossier actif requis.</p>}
        {message && <p role={conflict ? 'alert' : 'status'} className="text-sm">{message}</p>}
        {conflict && <Button onClick={reload} type="button" variant="outline">Recharger le brouillon</Button>}
      </CardHeader>
      <CardContent className="space-y-4">
        {sourceIngredients?.hasLegacyLineIdentity && (
          <p role="note" className="rounded-md border border-border p-3 text-sm">
            Cette composition historique utilise des identifiants limités à sa validation M-004 d’origine.
            Les affectations ne sont pas transférables automatiquement à une autre version.
          </p>
        )}
        {form.phases.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune phase enregistrée. Commencez par ajouter une phase.</p>
        )}
        {form.phases.map((phase, i) => (
          <section className="space-y-3 rounded-lg border border-border p-3" key={phase.id} aria-label={'Phase ' + (i + 1)}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">Phase {i + 1}</h3>
              {editable && (
                <div className="flex gap-1">
                  <Button aria-label={'Monter phase ' + (i + 1)} disabled={i === 0} onClick={() => edit((state) => ({ ...state, phases: move(state.phases, i, -1) }))} size="icon" type="button" variant="ghost"><ArrowUp className="size-4" /></Button>
                  <Button aria-label={'Descendre phase ' + (i + 1)} disabled={i === form.phases.length - 1} onClick={() => edit((state) => ({ ...state, phases: move(state.phases, i, 1) }))} size="icon" type="button" variant="ghost"><ArrowDown className="size-4" /></Button>
                  <Button aria-label={'Supprimer phase ' + (i + 1)} onClick={() => edit((state) => ({ ...state, phases: state.phases.filter((_, n) => n !== i) }))} size="icon" type="button" variant="ghost"><Trash2 className="size-4" /></Button>
                </div>
              )}
            </div>
            <ProductVariantField floating filled={Boolean(phase.title)} id={'phase-' + phase.id} label="Titre de la phase">
              <Input className="h-12 placeholder:text-transparent focus:placeholder:text-muted-foreground" disabled={!editable} id={'phase-' + phase.id} maxLength={160} placeholder="Ex. Préparation" value={phase.title} onChange={(event) => patchPhase(i, { ...phase, title: event.target.value })} />
            </ProductVariantField>
            <label className="grid gap-1 text-sm">Instructions de la phase
              <Textarea disabled={!editable} maxLength={5000} value={phase.instructions ?? ''} onChange={(event) => patchPhase(i, { ...phase, instructions: event.target.value })} />
            </label>
            <IngredientChoices
              disabled={!editable} ingredients={ingredients} label="Ingrédients directement affectés à la phase"
              selected={phase.ingredientLineKeys ?? []}
              onChange={(next) => changeIngredients(i, null, next)}
            />
            {phase.steps.map((step, j) => (
              <ProcessStepEditor
                count={phase.steps.length} disabled={!editable} index={j}
                ingredients={ingredients} key={step.id} step={step}
                onChange={(next) => patchStep(i, j, next)}
                onDelete={() => patchPhase(i, { ...phase, steps: phase.steps.filter((_, n) => n !== j) })}
                onMove={(direction) => patchPhase(i, { ...phase, steps: move(phase.steps, j, direction) })}
              />
            ))}
            {editable && (
              <Button disabled={!editable || phase.steps.length >= 40} onClick={() => patchPhase(i, { ...phase, steps: [...phase.steps, newStep()] })} size="sm" type="button" variant="outline">
                <Plus className="size-4" aria-hidden="true" /> Ajouter une étape
              </Button>
            )}
          </section>
        ))}
        {editable && (
          <Button disabled={!editable || form.phases.length >= 40} onClick={() => edit((current) => ({
            ...current, phases: [...current.phases, newPhase()],
          }))} type="button" variant="outline">
            <Plus className="size-4" aria-hidden="true" /> Ajouter une phase
          </Button>
        )}
        <section className="space-y-2 rounded-lg border border-dashed border-border p-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Ingrédients non affectés ({unassigned.length})</h3>
            <InfoTooltip label="À propos des ingrédients non affectés" content="Une justification explicite sera exigée pour chaque ingrédient volontairement non affecté lors de la validation officielle." />
          </div>
          {unassigned.length === 0 && <p className="text-xs text-muted-foreground">Tous les ingrédients sont affectés à une phase ou une étape.</p>}
          {unassigned.map((line) => (
            <label className="grid gap-1 text-xs" key={line.lineKey}>
              {line.productVariantName ?? 'Référence indisponible'} (ligne {line.sourcePosition + 1}) — justification éventuelle
              <Input disabled={!editable} maxLength={1000} placeholder="Pourquoi cet ingrédient n’est-il pas utilisé ?" value={reasonFor(line.lineKey)} onChange={(event) => setReason(line.lineKey, event.target.value)} />
            </label>
          ))}
        </section>
      </CardContent>
    </Card>
  );
}

export { ProcessSheetDraftEditor };
