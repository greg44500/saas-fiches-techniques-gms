import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Circle, Plus, Save, Trash2 } from 'lucide-react';
import { IngredientChoices, ProcessStepFields, ingredientName } from '@/features/process-sheets/components/process-sheet-editor-fields';
import { ProcessSheetDisclosure } from '@/features/process-sheets/components/process-sheet-disclosure';
import './process-sheet-workspace.css';
import { ProcessSheetPreview } from '@/features/process-sheets/components/process-sheet-preview';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
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
  const [activeStepId, setActiveStepId] = useState(() => initialDraft?.phases?.[0]?.steps?.[0]?.id ?? null);
  const [visibleReasonKeys, setVisibleReasonKeys] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saveDraft, saving] = useSaveProcessSheetDraftMutation();
  const editable = canEdit && !saving.isLoading;

  // RTK Query may refetch while there is unsaved work; never replace it.
  useEffect(() => {
    if (!dirty && (initialDraft?.revision ?? 0) > revision) {
      setForm(normalize(initialDraft));
      setRevision(initialDraft.revision);
      setActivePhaseId(initialDraft?.phases?.[0]?.id ?? null);
      setActiveStepId(initialDraft?.phases?.[0]?.steps?.[0]?.id ?? null);
    }
  }, [initialDraft, dirty, revision]);

  // Protect local edits against a browser refresh or closing the tab.
  useEffect(() => {
    if (!dirty) return undefined;
    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

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
    // A stale expectedRevision must stay blocked until an explicit reload.
    if (!conflict) setMessage('');
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
      setActiveStepId(fresh.data.draft.phases?.[0]?.steps?.[0]?.id ?? null);
    }
  };
  const setReason = (lineKey, reason) => edit((current) => ({
    ...current,
    unassignedReasons: [
      ...current.unassignedReasons.filter((r) => r.lineKey !== lineKey),
      ...(reason ? [{ lineKey, reason }] : []),
    ],
  }));

  const currentPhaseIndex = form.phases.findIndex((phase) => phase.id === activePhaseId);
  const currentPhase = form.phases[currentPhaseIndex] ?? null;
  const currentStepIndex = currentPhase?.steps.findIndex((step) => step.id === activeStepId) ?? -1;
  const currentStep = currentStepIndex >= 0 ? currentPhase.steps[currentStepIndex] : null;
  const assignmentCount = (lineKey) => form.phases.reduce((count, phase) => (
    count
    + Number((phase.ingredientLineKeys ?? []).includes(lineKey))
    + phase.steps.reduce((sum, step) => sum + Number((step.ingredientLineKeys ?? []).includes(lineKey)), 0)
  ), 0);

  return (
    <div className="space-y-3" aria-label="Atelier de fabrication">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background py-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Déroulement de fabrication</h2>
            <InfoTooltip label="À propos du brouillon process"
              content="Les phases, étapes et ingrédients associés sont propres à cette Fiche process. Les modifications sont enregistrées manuellement et ne modifient pas la Fiche technique." />
          </div>
          <p className="text-xs text-muted-foreground" role="status">
            Révision {revision} · {dirty ? 'Modifications non enregistrées' : 'À jour'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setShowPreview((value) => !value)}
            size="sm" type="button" variant="outline">
            {showPreview ? 'Revenir à l’édition' : 'Aperçu du process'}
          </Button>
          {canEdit && (
            <Button disabled={!dirty || saving.isLoading || conflict} onClick={save} size="sm" type="button">
              <Save className="size-4" aria-hidden="true" />
              {saving.isLoading ? 'Enregistrement…' : 'Enregistrer le brouillon'}
            </Button>
          )}
        </div>
      </header>
      {!canEdit && <p className="text-sm text-muted-foreground">Consultation uniquement : droits d’édition ou Dossier actif requis.</p>}
      {message && <p role={conflict ? 'alert' : 'status'} className="text-sm">{message}</p>}
      {conflict && <Button onClick={reload} type="button" variant="outline">Recharger le brouillon</Button>}
      {sourceIngredients?.hasLegacyLineIdentity && (
        <p role="note" className="border-l-2 border-border pl-3 text-sm text-muted-foreground">
          Cette composition historique utilise des identifiants limités à sa validation M-004 d’origine.
          Les affectations ne sont pas transférables automatiquement à une autre version.
        </p>
      )}
      {showPreview ? (
        <div className="process-sheet-pane-enter py-3">
          <ProcessSheetPreview phases={form.phases} ingredients={ingredients} />
        </div>
      ) : (
        <div className="grid gap-4 lg:h-[calc(100vh-15rem)] lg:min-h-[490px] lg:grid-cols-[minmax(15rem,0.78fr)_minmax(0,2fr)]">
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
                              onChange={(event) => setReason(line.lineKey, event.target.value)} />
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
          <div
            aria-label="Phases et étapes"
            className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-4 lg:min-h-0 lg:overflow-y-auto"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Phases de fabrication</h3>
              {editable && (
                <Button disabled={form.phases.length >= 40} onClick={addPhase}
                  size="sm" type="button" variant="outline">
                  <Plus className="size-4" aria-hidden="true" /> Ajouter une phase
                </Button>
              )}
            </div>
            {form.phases.length > 0 && (
              <nav aria-label="Navigation des phases" className="flex gap-2 overflow-x-auto pb-2">
                {form.phases.map((phase, i) => (
                  <button
                    aria-pressed={phase.id === activePhaseId}
                    className={'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150 motion-reduce:transition-none '
                      + (phase.id === activePhaseId
                        ? 'bg-foreground font-medium text-background'
                        : 'bg-muted/60 text-foreground hover:bg-muted')}
                    key={phase.id}
                    onClick={() => {
                      setActivePhaseId(phase.id);
                      setActiveStepId(phase.steps[0]?.id ?? null);
                    }}
                    type="button"
                  >
                    <span className="text-xs tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    <span className="max-w-44 truncate">{phase.title || 'Phase sans titre'}</span>
                  </button>
                ))}
              </nav>
            )}
            {!currentPhase && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Aucune phase. Commencez par ajouter la première phase de fabrication.
              </p>
            )}
            {currentPhase && (
              <section className="process-sheet-pane-enter space-y-4" key={currentPhase.id}
                aria-label={'Phase ' + (currentPhaseIndex + 1)}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-base font-semibold">{currentPhase.title || 'Phase sans titre'}</p>
                    <p className="text-xs text-muted-foreground">
                      {currentPhase.steps.length} étape(s)
                    </p>
                  </div>
                  {editable && (
                    <div className="flex items-center gap-1">
                      <Button aria-label={'Monter phase ' + (currentPhaseIndex + 1)}
                        disabled={currentPhaseIndex === 0}
                        onClick={() => edit((current) => ({
                          ...current,
                          phases: move(current.phases, currentPhaseIndex, -1),
                        }))}
                        size="icon" type="button" variant="ghost">
                        <ArrowUp className="size-4" aria-hidden="true" />
                      </Button>
                      <Button aria-label={'Descendre phase ' + (currentPhaseIndex + 1)}
                        disabled={currentPhaseIndex === form.phases.length - 1}
                        onClick={() => edit((current) => ({
                          ...current,
                          phases: move(current.phases, currentPhaseIndex, 1),
                        }))}
                        size="icon" type="button" variant="ghost">
                        <ArrowDown className="size-4" aria-hidden="true" />
                      </Button>
                      <Button aria-label={'Supprimer phase ' + (currentPhaseIndex + 1)}
                        onClick={() => {
                          edit((current) => ({
                            ...current,
                            phases: current.phases.filter((_, n) => n !== currentPhaseIndex),
                          }));
                          const remaining = form.phases.filter((_, n) => n !== currentPhaseIndex);
                          const fallback = remaining[Math.min(currentPhaseIndex, remaining.length - 1)];
                          setActivePhaseId(fallback?.id ?? null);
                          setActiveStepId(fallback?.steps[0]?.id ?? null);
                        }}
                        size="icon" type="button" variant="ghost">
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </div>
                <ProductVariantField floating filled={Boolean(currentPhase.title)}
                  id={'phase-' + currentPhase.id} label="Titre de la phase">
                  <Input className="h-12 placeholder:text-transparent focus:placeholder:text-muted-foreground"
                    disabled={!editable} id={'phase-' + currentPhase.id} maxLength={160}
                    placeholder="Ex. Préparation" value={currentPhase.title}
                    onChange={(event) => patchPhase(currentPhaseIndex, {
                      ...currentPhase, title: event.target.value,
                    })} />
                </ProductVariantField>
                <ProcessSheetDisclosure title={'Consignes et ingrédients propres à la phase · '
                  + ((currentPhase.instructions || currentPhase.ingredientLineKeys?.length) ? 'Renseignés' : 'Facultatifs')}>
                  <label className="grid gap-1 text-sm">Instructions de la phase
                    <Textarea disabled={!editable} maxLength={5000}
                      value={currentPhase.instructions ?? ''}
                      onChange={(event) => patchPhase(currentPhaseIndex, {
                        ...currentPhase, instructions: event.target.value,
                      })} />
                  </label>
                  <IngredientChoices
                    disabled={!editable}
                    ingredients={ingredients}
                    label="Ingrédients directement affectés à la phase"
                    selected={currentPhase.ingredientLineKeys ?? []}
                    onChange={(next) => changeIngredients(currentPhaseIndex, null, next)}
                  />
                </ProcessSheetDisclosure>
                <div className="space-y-2 border-t border-border/70 pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold">Étapes</h4>
                    {editable && (
                      <Button disabled={currentPhase.steps.length >= 40}
                        onClick={() => addStep(currentPhaseIndex)}
                        size="sm" type="button" variant="ghost">
                        <Plus className="size-4" aria-hidden="true" /> Ajouter une étape
                      </Button>
                    )}
                  </div>
                  {currentPhase.steps.length === 0 ? (
                    <p className="py-3 text-sm text-muted-foreground">
                      Aucune étape pour cette phase.
                    </p>
                  ) : (
                    <div className="divide-y divide-border/60" role="list" aria-label="Étapes de la phase">
                      {currentPhase.steps.map((step, j) => {
                        const selected = step.id === activeStepId;
                        const count = (step.ingredientLineKeys ?? []).length;
                        return (
                          <div key={step.id} role="listitem">
                            <button
                              aria-label={'Sélectionner étape ' + (j + 1) + ' : ' + (step.title || 'Étape sans titre')}
                              aria-pressed={selected}
                              className={'flex w-full items-start gap-3 rounded-md px-2 py-3 text-left transition-colors duration-150 motion-reduce:transition-none '
                                + (selected ? 'bg-muted/70' : 'hover:bg-muted/40')}
                              onClick={() => setActiveStepId(step.id)}
                              type="button"
                            >
                              <span className="mt-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                                {String(j + 1).padStart(2, '0')}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{step.title || 'Étape sans titre'}</span>
                                {step.instructions && (
                                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{step.instructions}</span>
                                )}
                              </span>
                              {count > 0 && (
                                <span className="text-xs text-muted-foreground">{count} ingr.</span>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {currentStep && (
                  <div className="border-t border-border pt-4" aria-label="Éditeur de l’étape" role="region">
                    <ProcessStepFields
                      key={currentStep.id}
                      count={currentPhase.steps.length}
                      disabled={!editable}
                      index={currentStepIndex}
                      ingredients={ingredients}
                      step={currentStep}
                      onChange={(next) => {
                        if (next.ingredientLineKeys !== currentStep.ingredientLineKeys) {
                          changeIngredients(currentPhaseIndex, currentStepIndex, next.ingredientLineKeys);
                        } else {
                          patchStep(currentPhaseIndex, currentStepIndex, next);
                        }
                      }}
                      onDelete={() => {
                        const remaining = currentPhase.steps.filter((_, j) => j !== currentStepIndex);
                        patchPhase(currentPhaseIndex, { ...currentPhase, steps: remaining });
                        setActiveStepId(remaining[Math.min(currentStepIndex, remaining.length - 1)]?.id ?? null);
                      }}
                      onMove={(direction) => patchPhase(currentPhaseIndex, {
                        ...currentPhase,
                        steps: move(currentPhase.steps, currentStepIndex, direction),
                      })}
                    />
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { ProcessSheetDraftEditor };
