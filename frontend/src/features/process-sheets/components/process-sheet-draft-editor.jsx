import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Save, Trash2 } from 'lucide-react';
import { IngredientChoices, ProcessStepEditor, ingredientName } from '@/features/process-sheets/components/process-sheet-editor-fields';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
