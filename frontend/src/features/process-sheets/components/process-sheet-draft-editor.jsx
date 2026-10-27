import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
import {
  DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogOverlay, DialogPortal, DialogRoot, DialogTitle,
} from '@/components/ui/dialog';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useSaveProcessSheetDraftMutation, useValidateProcessSheetMutation } from '@/features/process-sheets/api/process-sheets-api';
import { ProcessIngredientRail } from '@/features/process-sheets/components/process-ingredient-rail';
import { ProcessSheetPhaseEditor } from '@/features/process-sheets/components/process-sheet-phase-editor';
import { ProcessSheetPhaseTree } from '@/features/process-sheets/components/process-sheet-phase-tree';
import { ProcessSheetPreview } from '@/features/process-sheets/components/process-sheet-preview';
import { ProcessStepFields } from '@/features/process-sheets/components/process-sheet-editor-fields';
import './process-sheet-workspace.css';

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
function newPhase(title = 'Nouvelle phase') {
  return {
    id: makeId(), title, instructions: '',
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
const MOBILE_VIEWS = [
  { value: 'structure', label: 'Structure' },
  { value: 'editor', label: 'Édition' },
];

function ProcessSheetDraftEditor({
  initialDraft, sourceIngredients, canEdit, canValidate = false,
  editorialState = 'DRAFT', compositionOutdated = false, processRevision = 0,
  canReadPhaseLibrary = false,
  dossierId, processSheetId, workspaceId,
  onReload,
}) {
  const [form, setForm] = useState(() => normalize(initialDraft));
  const [revision, setRevision] = useState(initialDraft?.revision ?? 0);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [activePhaseId, setActivePhaseId] = useState(() => initialDraft?.phases?.[0]?.id ?? null);
  const [activeStepId, setActiveStepId] = useState(() => initialDraft?.phases?.[0]?.steps?.[0]?.id ?? null);
  const [expandedPhaseIds, setExpandedPhaseIds] = useState(() => initialDraft?.phases?.[0]?.id
    ? [initialDraft.phases[0].id] : []);
  const [mobileView, setMobileView] = useState('structure');
  const [danger, setDanger] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saveDraft, saving] = useSaveProcessSheetDraftMutation();
  const [validateSheet, validating] = useValidateProcessSheetMutation();
  const [validationError, setValidationError] = useState('');
  const editable = canEdit && !saving.isLoading;

  // A background RTK Query refetch must never erase local unsaved work.
  useEffect(() => {
    if (!dirty && (initialDraft?.revision ?? 0) > revision) {
      setForm(normalize(initialDraft));
      setRevision(initialDraft.revision);
      setActivePhaseId(initialDraft?.phases?.[0]?.id ?? null);
      setActiveStepId(initialDraft?.phases?.[0]?.steps?.[0]?.id ?? null);
      setExpandedPhaseIds(initialDraft?.phases?.[0]?.id ? [initialDraft.phases[0].id] : []);
    }
  }, [initialDraft, dirty, revision]);

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
  const edit = (updater) => {
    if (!editable) return;
    setForm((current) => typeof updater === 'function' ? updater(current) : updater);
    setDirty(true);
    setValidationError('');
    if (!conflict) {
      setMessage('');
      setSaveError(false);
    }
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
  const expandPhase = (phaseId) => {
    setExpandedPhaseIds((current) => current.includes(phaseId)
      ? current : [...current, phaseId]);
  };
  const selectPhase = (phaseId) => {
    setActivePhaseId(phaseId);
    setActiveStepId(null);
    setMobileView('editor');
  };
  const selectStep = (phaseId, stepId) => {
    setActivePhaseId(phaseId);
    setActiveStepId(stepId);
    expandPhase(phaseId);
    setMobileView('editor');
  };
  const addPhase = (title) => {
    if (!editable || form.phases.length >= 40) return;
    const phase = newPhase(title);
    edit((current) => ({ ...current, phases: [...current.phases, phase] }));
    setActivePhaseId(phase.id);
    setActiveStepId(null);
    expandPhase(phase.id);
    setMobileView('editor');
  };
  const addStep = (i) => {
    if (!editable) return;
    const phase = form.phases[i];
    if (!phase || phase.steps.length >= 40) return;
    const step = newStep();
    patchPhase(i, { ...phase, steps: [...phase.steps, step] });
    selectStep(phase.id, step.id);
  };
  const renamePhase = (phaseId, title) => {
    if (!editable || !title.trim()) return;
    edit((current) => ({
      ...current,
      phases: current.phases.map((phase) => phase.id === phaseId
        ? { ...phase, title } : phase),
    }));
  };
  const deletePhase = (phaseId) => {
    const i = form.phases.findIndex((phase) => phase.id === phaseId);
    if (i < 0) return;
    const remaining = form.phases.filter((phase) => phase.id !== phaseId);
    edit((current) => ({
      ...current,
      phases: current.phases.filter((phase) => phase.id !== phaseId),
    }));
    if (activePhaseId === phaseId) {
      const fallback = remaining[Math.min(i, remaining.length - 1)];
      setActivePhaseId(fallback?.id ?? null);
      setActiveStepId(null);
    }
    setExpandedPhaseIds((current) => current.filter((id) => id !== phaseId));
  };
  const requestDeletePhase = (phaseId) => {
    if (!editable) return;
    const phase = form.phases.find((item) => item.id === phaseId);
    if (!phase) return;
    const isEmpty = phase.steps.length === 0
      && !(phase.instructions ?? '').trim()
      && (phase.ingredientLineKeys ?? []).length === 0;
    if (isEmpty) deletePhase(phaseId);
    else setDanger({ kind: 'phase', phaseId });
  };
  const togglePhase = (phaseId, open) => {
    setExpandedPhaseIds((current) => open
      ? current.includes(phaseId) ? current : [...current, phaseId]
      : current.filter((id) => id !== phaseId));
    if (!open && phaseId === activePhaseId && activeStepId) setActiveStepId(null);
  };

  const save = async () => {
    if (!editable || !dirty || conflict) return;
    setMessage('');
    setSaveError(false);
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
      setSaveError(false);
      setMessage('');
      setValidationError('');
    } catch (error) {
      const isConflict = error?.status === 409;
      setConflict(isConflict);
      setSaveError(true);
      setMessage(isConflict
        ? 'Une autre modification ou un changement de statut empêche la sauvegarde. Le brouillon local reste affiché.'
        : error?.data?.message ?? 'Échec de sauvegarde. Votre travail reste affiché.');
    }
  };
  const validate = async () => {
    if (!canValidate || dirty || conflict || saving.isLoading || validating.isLoading
      || processRevision !== revision || editorialState === 'VALIDATED' || compositionOutdated) return;
    setValidationError('');
    try {
      await validateSheet({
        workspaceId, dossierId, processSheetId,
        expectedRevision: processRevision,
      }).unwrap();
      await onReload();
    } catch (error) {
      setValidationError(error?.data?.message ?? 'Impossible de valider la Fiche process.');
    }
  };
  const reload = async () => {
    try {
      const fresh = await onReload();
      if (!fresh?.data?.draft) {
        setSaveError(true);
        setMessage('Impossible de recharger le brouillon. Les modifications locales restent affichées.');
        return;
      }
      setForm(normalize(fresh.data.draft));
      setRevision(fresh.data.draft.revision);
      setDirty(false);
      setConflict(false);
      setSaveError(false);
      setMessage('');
      setValidationError('');
      setActivePhaseId(fresh.data.draft.phases?.[0]?.id ?? null);
      setActiveStepId(fresh.data.draft.phases?.[0]?.steps?.[0]?.id ?? null);
      setExpandedPhaseIds(fresh.data.draft.phases?.[0]?.id ? [fresh.data.draft.phases[0].id] : []);
      setMobileView('structure');
    } catch {
      setSaveError(true);
      setMessage('Impossible de recharger le brouillon. Les modifications locales restent affichées.');
    }
  };
  const currentPhaseIndex = form.phases.findIndex((phase) => phase.id === activePhaseId);
  const currentPhase = form.phases[currentPhaseIndex] ?? null;
  const currentStepIndex = currentPhase?.steps.findIndex((step) => step.id === activeStepId) ?? -1;
  const currentStep = currentStepIndex >= 0 ? currentPhase.steps[currentStepIndex] : null;

  const confirmDanger = () => {
    if (!danger) return;
    if (danger.kind === 'reload') {
      setDanger(null);
      void reload();
      return;
    }
    if (!editable) { setDanger(null); return; }
    const i = form.phases.findIndex((phase) => phase.id === danger.phaseId);
    if (i < 0) { setDanger(null); return; }
    if (danger.kind === 'phase') {
      deletePhase(danger.phaseId);
    } else {
      const j = form.phases[i].steps.findIndex((step) => step.id === danger.stepId);
      if (j >= 0) {
        const remaining = form.phases[i].steps.filter((step) => step.id !== danger.stepId);
        edit((current) => ({
          ...current,
          phases: updateAt(current.phases, i, {
            ...current.phases[i],
            steps: current.phases[i].steps.filter((step) => step.id !== danger.stepId),
          }),
        }));
        if (danger.phaseId === activePhaseId && danger.stepId === activeStepId) {
          setActiveStepId(remaining[Math.min(j, remaining.length - 1)]?.id ?? null);
        }
        expandPhase(danger.phaseId);
      }
    }
    setDanger(null);
  };

  const dangerTitle = danger?.kind === 'phase' ? 'Supprimer cette phase ?'
    : danger?.kind === 'step' ? 'Supprimer cette étape ?'
      : 'Recharger le brouillon ?';
  const dangerDescription = danger?.kind === 'reload'
    ? 'Les modifications locales non enregistrées seront remplacées par la version du serveur. Cette action est irréversible.'
    : danger?.kind === 'phase'
      ? 'Cette phase et toutes ses étapes seront retirées du brouillon local. La suppression sera enregistrée seulement lors de la prochaine sauvegarde.'
      : 'Cette étape sera retirée du brouillon local. La suppression sera enregistrée seulement lors de la prochaine sauvegarde.';

  return (
    <div className="space-y-3" aria-label="Atelier de fabrication">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background py-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-base font-semibold">Déroulement de fabrication</h2>
          <InfoTooltip label="À propos du brouillon process"
            content="Les phases, étapes et ingrédients associés sont propres à cette Fiche process. La sauvegarde est manuelle et ne modifie pas la Fiche technique." />
          <span className={'text-xs font-medium '
            + (saveError ? 'text-destructive' : dirty ? 'text-warning' : 'text-success')}
            role="status">
            {conflict ? 'Conflit d’enregistrement'
              : saveError ? 'Erreur d’enregistrement'
                : dirty ? 'Modifications non enregistrées' : 'À jour'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setShowPreview((value) => !value)}
            size="sm" type="button" variant="outline">
            {showPreview ? 'Revenir à l’édition' : 'Aperçu du process'}
          </Button>
          {canValidate && (
            <Button disabled={dirty || saving.isLoading || validating.isLoading || conflict
              || processRevision !== revision || editorialState === 'VALIDATED' || compositionOutdated}
              onClick={validate} size="sm" type="button" variant="outline">
              {validating.isLoading ? 'Validation…' : 'Valider la Fiche process'}
            </Button>
          )}
          {canEdit && (
            <Button disabled={!dirty || saving.isLoading || conflict}
              onClick={save} size="sm" type="button">
              <Save aria-hidden="true" className="size-4" />
              {saving.isLoading ? 'Enregistrement…' : 'Enregistrer le brouillon'}
            </Button>
          )}
        </div>
      </header>
      {!canEdit && (
        <p className="text-sm text-muted-foreground">
          Consultation uniquement : droits d’édition ou Dossier actif requis.
        </p>
      )}
      {message && saveError && (
        <p className="text-sm text-destructive" role="alert">{message}</p>
      )}
      {validationError && <p className="text-sm text-destructive" role="alert">
        {validationError}
      </p>}
      {conflict && (
        <Button onClick={() => setDanger({ kind: 'reload' })} type="button" variant="outline">
          Recharger le brouillon
        </Button>
      )}
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
        <div className="grid gap-4 lg:h-[calc(100dvh-12rem)] lg:min-h-[480px] lg:grid-cols-[minmax(14rem,0.75fr)_minmax(0,2.25fr)]">
          <ProcessIngredientRail ingredients={ingredients} phases={form.phases} />
          <section aria-label="Phases et étapes"
            className="min-w-0 rounded-xl border border-border bg-card p-4 lg:min-h-0">
            <div className="mb-3 lg:hidden">
              <SegmentedControl ariaLabel="Vue de l’atelier"
                items={MOBILE_VIEWS} onValueChange={setMobileView} value={mobileView} />
            </div>
            <div className="grid min-h-0 gap-4 lg:h-full xl:grid-cols-[minmax(15rem,0.85fr)_minmax(0,1.65fr)]">
              <div className={'min-w-0 lg:min-h-0 lg:overflow-y-auto xl:border-r xl:border-border/70 xl:pr-4 '
                + (mobileView === 'editor' ? 'hidden lg:block' : '')}>
                <ProcessSheetPhaseTree
                  activePhaseId={activePhaseId}
                  activeStepId={activeStepId}
                  disabled={!editable}
                  canReadPhaseLibrary={canReadPhaseLibrary}
                  dossierId={dossierId}
                  workspaceId={workspaceId}
                  expandedPhaseIds={expandedPhaseIds}
                  onAddPhase={addPhase}
                  onAddStep={addStep}
                  onSelectPhase={selectPhase}
                  onSelectStep={selectStep}
                  onTogglePhase={togglePhase}
                  onRequestDeleteStep={(phaseId, stepId) => setDanger({
                    kind: 'step', phaseId, stepId,
                  })}
                  onRenamePhase={renamePhase}
                  onRequestDeletePhase={requestDeletePhase}
                  phases={form.phases}
                />
              </div>
              <div className={'min-w-0 lg:min-h-0 lg:overflow-y-auto xl:pl-1 '
                + (mobileView === 'structure' ? 'hidden lg:block' : '')}>
                {!currentPhase && (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Sélectionnez une phase ou ajoutez-en une pour commencer.
                  </p>
                )}
                {currentPhase && !currentStep && (
                  <ProcessSheetPhaseEditor
                    key={currentPhase.id}
                    count={form.phases.length}
                    disabled={!editable}
                    index={currentPhaseIndex}
                    ingredients={ingredients}
                    onChange={(next) => patchPhase(currentPhaseIndex, next)}
                    onChangeIngredients={(next) => changeIngredients(currentPhaseIndex, null, next)}
                    onMove={(direction) => edit((current) => ({
                      ...current,
                      phases: move(current.phases, currentPhaseIndex, direction),
                    }))}
                    phase={currentPhase}
                  />
                )}
                {currentStep && (
                  <section aria-label="Éditeur de l’étape" className="space-y-3" role="region">
                    <p className="text-xs text-muted-foreground">
                      {currentPhase.title} · Étape {currentStepIndex + 1}
                    </p>
                    <ProcessStepFields
                      key={currentStep.id}
                      count={currentPhase.steps.length}
                      disabled={!editable}
                      index={currentStepIndex}
                      ingredients={ingredients}
                      onChange={(next) => {
                        if (next.ingredientLineKeys !== currentStep.ingredientLineKeys) {
                          changeIngredients(currentPhaseIndex, currentStepIndex, next.ingredientLineKeys);
                        } else {
                          patchStep(currentPhaseIndex, currentStepIndex, next);
                        }
                      }}
                      onDelete={() => setDanger({
                        kind: 'step', phaseId: currentPhase.id, stepId: currentStep.id,
                      })}
                      onMove={(direction) => patchPhase(currentPhaseIndex, {
                        ...currentPhase,
                        steps: move(currentPhase.steps, currentStepIndex, direction),
                      })}
                      step={currentStep}
                    />
                  </section>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
      <DialogRoot onOpenChange={(open) => { if (!open) setDanger(null); }}
        open={Boolean(danger)}>
        <DialogPortal>
          <DialogOverlay className="backdrop-blur-none" />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dangerTitle}</DialogTitle>
              <DialogDescription>{dangerDescription}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setDanger(null)} type="button" variant="outline">
                Annuler
              </Button>
              <Button onClick={confirmDanger} type="button" variant="destructive">
                {danger?.kind === 'reload' ? 'Recharger et remplacer' : 'Supprimer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
    </div>
  );
}

export { ProcessSheetDraftEditor };
