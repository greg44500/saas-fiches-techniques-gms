import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Save, Trash2 } from 'lucide-react';

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
      <div className="flex flex-wrap items-center gap-2">
        {chosen.map((line) => (
          <span className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs" key={line.lineKey}>
            {ingredientName(line)}
          </span>
        ))}
        {!chosen.length && <span className="text-xs text-muted-foreground">Aucun ingrédient associé</span>}
      </div>
      {ingredients.length > 0 && !disabled && (
        <Button
          aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}
          size="sm" type="button" variant="outline"
        >
          <Plus className="size-3" aria-hidden="true" />
          {expanded ? 'Fermer la sélection' : 'Associer des ingrédients'}
        </Button>
      )}
      {expanded && !disabled && (
        <div className="grid gap-1 rounded-md border border-border bg-muted/20 p-2 sm:grid-cols-2">
          {ingredients.map((line) => (
            <label className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-xs hover:bg-muted/50" key={line.lineKey}>
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
      )}
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



function ProcessStepEditor({
  step, index, disabled, ingredients, onChange, onDelete, onMove, count,
  active, onToggle,
}) {
  const assign = (field, value) => onChange({ ...step, [field]: value });
  const setDuration = (field, raw) => {
    const duration = { ...(step.duration ?? {}) };
    if (raw === '') delete duration[field];
    else duration[field] = Number(raw);
    assign('duration', duration);
  };
  const usedIngredients = ingredients.filter((line) => (step.ingredientLineKeys ?? []).includes(line.lineKey));
  const hasDetails = Boolean(step.duration && Object.keys(step.duration).length)
    || step.temperatureCelsius != null || Boolean(step.equipment?.length)
    || Boolean(step.manufacturingVigilance?.length)
    || Boolean(step.qualityControls?.length) || Boolean(step.sanitaryControls?.length);

  return (
    <article className="rounded-lg border border-border bg-background" aria-label={'Étape ' + (index + 1)}>
      <div className="flex flex-wrap items-start justify-between gap-2 p-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold">{index + 1}. {step.title || 'Étape sans titre'}</p>
          {!active && step.instructions && (
            <p className="line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{step.instructions}</p>
          )}
          {!active && usedIngredients.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {usedIngredients.map((line) => (
                <span className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground" key={line.lineKey}>
                  {ingredientName(line)}
                </span>
              ))}
            </div>
          )}
        </div>
        <Button aria-expanded={active} onClick={onToggle} size="sm" type="button" variant="outline">
          {active ? 'Replier' : disabled ? 'Consulter' : 'Modifier'}
          {active ? <ChevronDown className="size-3 rotate-180" aria-hidden="true" /> : <ChevronRight className="size-3" aria-hidden="true" />}
        </Button>
      </div>
      {active && (
        <div className="space-y-3 border-t border-border p-3">
          <ProductVariantField floating filled={Boolean(step.title)} id={'step-' + step.id} label="Titre de l’étape">
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
          <IngredientChoices disabled={disabled} ingredients={ingredients}
            label="Ingrédients affectés à cette étape"
            onChange={(next) => assign('ingredientLineKeys', next)}
            selected={step.ingredientLineKeys ?? []} />
          <details className="rounded-md border border-border p-3" open={undefined}>
            <summary className="cursor-pointer text-sm font-medium">
              Temps, température et équipements {hasDetails ? '· Renseignés' : '· Facultatifs'}
            </summary>
            <div className="mt-3 space-y-3">
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
            </div>
          </details>
          <details className="rounded-md border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">Vigilance, qualité et maîtrise sanitaire · Facultatifs</summary>
            <div className="mt-3 space-y-4">
              <StringListEditor label="Points de vigilance" items={step.manufacturingVigilance ?? []}
                disabled={disabled} onChange={(items) => assign('manufacturingVigilance', items)} />
              <ControlFields label="Qualité" controls={step.qualityControls ?? []}
                disabled={disabled} onChange={(next) => assign('qualityControls', next)} />
              <ControlFields label="Maîtrise sanitaire" controls={step.sanitaryControls ?? []}
                disabled={disabled} onChange={(next) => assign('sanitaryControls', next)} />
            </div>
          </details>
          {!disabled && (
            <div className="flex flex-wrap items-center justify-end gap-1 border-t border-border pt-2">
              <Button aria-label={'Monter étape ' + (index + 1)}
                disabled={index === 0} onClick={() => onMove(-1)} size="icon" type="button" variant="ghost">
                <ArrowUp className="size-4" />
              </Button>
              <Button aria-label={'Descendre étape ' + (index + 1)}
                disabled={index === count - 1} onClick={() => onMove(1)} size="icon" type="button" variant="ghost">
                <ArrowDown className="size-4" />
              </Button>
              <Button aria-label={'Supprimer étape ' + (index + 1)}
                onClick={onDelete} size="icon" type="button" variant="ghost">
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}
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
  const [activePhaseId, setActivePhaseId] = useState(() => initialDraft?.phases?.[0]?.id ?? null);
  const [activeStepId, setActiveStepId] = useState(null);
  const [visibleReasonKeys, setVisibleReasonKeys] = useState([]);
  const [saveDraft, saving] = useSaveProcessSheetDraftMutation();
  const editable = canEdit && !saving.isLoading;

  // RTK Query may refetch while there is unsaved work; never replace it.
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
  const reasonFor = (lineKey) => form.unassignedReasons.find((r) => r.lineKey === lineKey)?.reason ?? '';
  const pendingCount = unassigned.filter((line) => !reasonFor(line.lineKey).trim()).length;

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
  const patchStep = (i, j, step) => edit((current) => ({
    ...current,
    phases: updateAt(current.phases, i, {
      ...current.phases[i],
      steps: updateAt(current.phases[i].steps, j, step),
    }),
  }));
  const changeIngredients = (i, j, next) => edit((current) => ({
    ...current,
    phases: updateAt(current.phases, i, j == null
      ? { ...current.phases[i], ingredientLineKeys: next }
      : {
        ...current.phases[i],
        steps: updateAt(current.phases[i].steps, j, {
          ...current.phases[i].steps[j], ingredientLineKeys: next,
        }),
      }),
    unassignedReasons: current.unassignedReasons.filter((r) => !next.includes(r.lineKey)),
  }));
  const addPhase = () => {
    const phase = newPhase();
    edit((current) => ({ ...current, phases: [...current.phases, phase] }));
    setActivePhaseId(phase.id);
    setActiveStepId(null);
  };
  const addStep = (i) => {
    const step = newStep();
    const phase = form.phases[i];
    patchPhase(i, { ...phase, steps: [...phase.steps, step] });
    setActiveStepId(step.id);
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
      setActivePhaseId(fresh.data.draft.phases?.[0]?.id ?? null);
      setActiveStepId(null);
    }
  };
  const setReason = (lineKey, reason) => edit((current) => ({
    ...current,
    unassignedReasons: [
      ...current.unassignedReasons.filter((r) => r.lineKey !== lineKey),
      ...(reason ? [{ lineKey, reason }] : []),
    ],
  }));

  return (
    <Card>
      <CardHeader className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle>Déroulement de fabrication</CardTitle>
            <InfoTooltip label="À propos du brouillon process"
              content="Les phases, étapes et ingrédients associés sont propres à cette Fiche process. Les modifications sont enregistrées manuellement et ne modifient pas la Fiche technique." />
          </div>
          {canEdit && (
            <Button disabled={!dirty || saving.isLoading || conflict} onClick={save} size="sm" type="button">
              <Save className="size-4" aria-hidden="true" /> {saving.isLoading ? 'Enregistrement…' : 'Enregistrer le brouillon'}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground" role="status">
          Révision {revision} · {dirty ? 'Modifications non enregistrées' : 'À jour'}
        </p>
        {!canEdit && <p className="text-sm text-muted-foreground">Consultation uniquement : droits d’édition ou Dossier actif requis.</p>}
        {message && <p role={conflict ? 'alert' : 'status'} className="text-sm">{message}</p>}
        {conflict && <Button onClick={reload} type="button" variant="outline">Recharger le brouillon</Button>}
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {sourceIngredients?.hasLegacyLineIdentity && (
          <p role="note" className="rounded-md border border-border p-3 text-sm">
            Cette composition historique utilise des identifiants limités à sa validation M-004 d’origine.
            Les affectations ne sont pas transférables automatiquement à une autre version.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/30 p-3">
          <div>
            <p className="text-sm font-medium">Ingrédients de la composition M-004</p>
            <p className="text-xs text-muted-foreground">
              {ingredients.length - unassigned.length} sur {ingredients.length} affectés
              {pendingCount > 0 ? ' · ' + pendingCount + ' à examiner' : ''}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">{form.phases.length} phase(s)</p>
        </div>
        {form.phases.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
            Aucune phase. Commencez par ajouter la première phase de fabrication.
          </p>
        )}
        {form.phases.map((phase, i) => {
          const active = activePhaseId === phase.id;
          return (
            <section className="rounded-lg border border-border" key={phase.id} aria-label={'Phase ' + (i + 1)}>
              <div className="flex items-center gap-2 p-2">
                <Button className="min-w-0 flex-1 justify-start gap-3 text-left" variant="ghost" type="button"
                  aria-expanded={active} onClick={() => {
                    setActivePhaseId(active ? null : phase.id);
                    setActiveStepId(null);
                  }}>
                  <span className="rounded-md bg-muted px-2 py-1 text-sm font-semibold">{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{phase.title || 'Phase sans titre'}</span>
                  <span className="text-xs font-normal text-muted-foreground">{phase.steps.length} étape(s)</span>
                  {active ? <ChevronDown aria-hidden="true" className="size-4" />
                    : <ChevronRight aria-hidden="true" className="size-4" />}
                </Button>
              </div>
              {active && (
                <div className="space-y-3 border-t border-border p-3">
                  <ProductVariantField floating filled={Boolean(phase.title)}
                    id={'phase-' + phase.id} label="Titre de la phase">
                    <Input className="h-12 placeholder:text-transparent focus:placeholder:text-muted-foreground"
                      disabled={!editable} id={'phase-' + phase.id} maxLength={160}
                      placeholder="Ex. Préparation" value={phase.title}
                      onChange={(event) => patchPhase(i, { ...phase, title: event.target.value })} />
                  </ProductVariantField>
                  <details className="rounded-md border border-border p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      Consignes et ingrédients propres à la phase
                      {(phase.instructions || phase.ingredientLineKeys?.length) ? ' · Renseignés' : ' · Facultatifs'}
                    </summary>
                    <div className="mt-3 space-y-3">
                      <label className="grid gap-1 text-sm">Instructions de la phase
                        <Textarea disabled={!editable} maxLength={5000} value={phase.instructions ?? ''}
                          onChange={(event) => patchPhase(i, { ...phase, instructions: event.target.value })} />
                      </label>
                      <IngredientChoices disabled={!editable} ingredients={ingredients}
                        label="Ingrédients directement affectés à la phase"
                        selected={phase.ingredientLineKeys ?? []}
                        onChange={(next) => changeIngredients(i, null, next)} />
                    </div>
                  </details>
                  <div className="space-y-2">
                    {phase.steps.map((step, j) => (
                      <ProcessStepEditor
                        count={phase.steps.length} disabled={!editable} index={j}
                        ingredients={ingredients} key={step.id} step={step}
                        active={activeStepId === step.id}
                        onToggle={() => setActiveStepId(activeStepId === step.id ? null : step.id)}
                        onChange={(next) => {
                          if (next.ingredientLineKeys !== step.ingredientLineKeys) {
                            changeIngredients(i, j, next.ingredientLineKeys);
                          } else patchStep(i, j, next);
                        }}
                        onDelete={() => {
                          patchPhase(i, { ...phase, steps: phase.steps.filter((_, n) => n !== j) });
                          setActiveStepId(null);
                        }}
                        onMove={(direction) => patchPhase(i, {
                          ...phase, steps: move(phase.steps, j, direction),
                        })}
                      />
                    ))}
                  </div>
                  {editable && (
                    <Button disabled={phase.steps.length >= 40} onClick={() => addStep(i)}
                      size="sm" type="button" variant="outline">
                      <Plus className="size-4" aria-hidden="true" /> Ajouter une étape
                    </Button>
                  )}
                  {editable && (
                    <div className="flex justify-end gap-1 border-t border-border pt-2">
                      <Button aria-label={'Monter phase ' + (i + 1)} disabled={i === 0}
                        onClick={() => edit((state) => ({ ...state, phases: move(state.phases, i, -1) }))}
                        size="icon" type="button" variant="ghost"><ArrowUp className="size-4" /></Button>
                      <Button aria-label={'Descendre phase ' + (i + 1)} disabled={i === form.phases.length - 1}
                        onClick={() => edit((state) => ({ ...state, phases: move(state.phases, i, 1) }))}
                        size="icon" type="button" variant="ghost"><ArrowDown className="size-4" /></Button>
                      <Button aria-label={'Supprimer phase ' + (i + 1)}
                        onClick={() => {
                          edit((state) => ({ ...state, phases: state.phases.filter((_, n) => n !== i) }));
                          setActivePhaseId(null);
                          setActiveStepId(null);
                        }} size="icon" type="button" variant="ghost">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
        {editable && (
          <Button disabled={form.phases.length >= 40} onClick={addPhase} type="button" variant="outline">
            <Plus className="size-4" aria-hidden="true" /> Ajouter une phase
          </Button>
        )}
        <details className="rounded-lg border border-dashed border-border p-3">
          <summary className="cursor-pointer">
            <span className="text-sm font-semibold" role="heading" aria-level="3">
              Ingrédients non affectés ({unassigned.length})
            </span>
            <span className="ml-2 text-xs text-muted-foreground">
              {pendingCount ? pendingCount + ' à examiner' : 'Aucun ingrédient en attente de justification'}
            </span>
          </summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Chaque ingrédient non affecté doit recevoir une justification avant la validation officielle.
            </p>
            {unassigned.length === 0 && (
              <p className="text-xs text-muted-foreground">Tous les ingrédients sont affectés à une phase ou une étape.</p>
            )}
            {unassigned.map((line) => {
              const label = ingredientName(line);
              const showReason = Boolean(reasonFor(line.lineKey)) || visibleReasonKeys.includes(line.lineKey);
              return (
                <div className="space-y-2 border-t border-border pt-2" key={line.lineKey}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium">{label}</p>
                    {!showReason && editable && (
                      <Button size="sm" variant="outline" type="button"
                        onClick={() => setVisibleReasonKeys((keys) => [...keys, line.lineKey])}>
                        Justifier la non-utilisation
                      </Button>
                    )}
                  </div>
                  {showReason && (
                    <label className="grid gap-1 text-xs">
                      {label} — justification éventuelle
                      <Input disabled={!editable} maxLength={1000}
                        placeholder="Pourquoi cet ingrédient n’est-il pas utilisé ?"
                        value={reasonFor(line.lineKey)}
                        onChange={(event) => setReason(line.lineKey, event.target.value)} />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

export { ProcessSheetDraftEditor };
