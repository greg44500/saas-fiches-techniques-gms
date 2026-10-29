import { useEffect, useState } from 'react';

import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { downloadBlob } from '@/features/files/lib/download-blob';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
  DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogOverlay, DialogPortal, DialogRoot, DialogTitle,
} from '@/components/ui/dialog';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useExportProcessSheetPdfMutation, useSaveProcessSheetDraftMutation, useValidateProcessSheetMutation } from '@/features/process-sheets/api/process-sheets-api';
import { ProcessIngredientRail } from '@/features/process-sheets/components/process-ingredient-rail';
import { ProcessSheetControlPanel } from '@/features/process-sheets/components/process-sheet-control-panel';
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
  initialDraft, sourceIngredients, canEdit, canValidate = false, canExport = false,
  editorialState = 'DRAFT', compositionOutdated = false, processRevision = 0,
  canReadPhaseLibrary = false,
  dossierId, processSheetId, workspaceId,
  onReload, onDirtyChange, onRequestReconciliation,
  canOpenCompositionReview = false, compositionHelp = '',
  backPath = null, processTitle = null,
}) {
  const [form, setForm] = useState(() => normalize(initialDraft));
  const [revision, setRevision] = useState(initialDraft?.revision ?? 0);
  // A validation changes the process revision but not the draft revision.
  // Keep the two server concurrency tokens separate.
  const [serverRevisions, setServerRevisions] = useState(() => ({
    process: processRevision,
    draft: initialDraft?.revision ?? 0,
  }));
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
  const [exportProcessPdf, exporting] = useExportProcessSheetPdfMutation();
  const [exportError, setExportError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [validationSyncing, setValidationSyncing] = useState(false);
  const [validationErrorCode, setValidationErrorCode] = useState('');
  const [confirmValidation, setConfirmValidation] = useState(false);
  const usedIngredients = new Set(form.phases.flatMap((phase) => [
    ...(phase.ingredientLineKeys ?? []),
    ...(phase.steps ?? []).flatMap((step) => step.ingredientLineKeys ?? []),
  ]));
  const unassignedCount = (sourceIngredients?.lines ?? []).filter(
    (line) => !usedIngredients.has(line.lineKey),
  ).length;
  const documented = form.phases.some((phase) =>
    (phase.steps ?? []).some((step) => step.title?.trim() && step.instructions?.trim()));
  const editable = canEdit && !saving.isLoading && !validationSyncing;
  const exportDisabled = !canExport || dirty || conflict || saving.isLoading
    || exporting.isLoading || validationSyncing;
  const exportHelp = !canExport
    ? 'Votre rôle ne permet pas l’export PDF'
    : dirty || conflict
      ? 'Enregistrez les modifications avant d’exporter'
      : exporting.isLoading ? 'Génération du PDF…' : 'Télécharger le PDF du contenu enregistré';

  const exportPdf = async () => {
    if (exportDisabled) return;
    setExportError('');
    try {
      const artifact = await exportProcessPdf({ workspaceId, dossierId, processSheetId }).unwrap();
      downloadBlob(artifact.blob, artifact.fileName);
    } catch {
      setExportError('Le PDF n’a pas pu être généré. Aucun téléchargement n’a été effectué.');
    }
  };

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

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

  // A refetch may advance the aggregate after validation (without changing
  // the draft), or bring changes from another tab. Never overwrite dirty work.
  useEffect(() => {
    if (!dirty && initialDraft && initialDraft.revision >= revision
      && processRevision > serverRevisions.process) {
      setServerRevisions({ process: processRevision, draft: initialDraft.revision });
    }
  }, [dirty, initialDraft, processRevision, revision, serverRevisions.process]);

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
      setServerRevisions({ process: result.processRevision, draft: result.revision });
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
        : 'Votre travail reste affiché. Réessayez l’enregistrement ou contactez un responsable si le problème persiste.');
    }
  };
  // Keep the saved content revision and the aggregate revision together.
  // The GET response is authoritative; never infer one from the other.
  const applyServerSnapshot = (data) => {
    setForm(normalize(data.draft));
    setRevision(data.draft.revision);
    setServerRevisions({
      process: data.process.revision, draft: data.draft.revision,
    });
    setDirty(false);
    setConflict(false);
    setSaveError(false);
    setMessage('');
    setActivePhaseId(data.draft.phases?.[0]?.id ?? null);
    setActiveStepId(data.draft.phases?.[0]?.steps?.[0]?.id ?? null);
    setExpandedPhaseIds(data.draft.phases?.[0]?.id ? [data.draft.phases[0].id] : []);
    setMobileView('structure');
  };

  const fetchServerSnapshot = async () => {
    const result = await onReload();
    const data = result?.data;
    if (!data?.process || !data?.draft
      || !Number.isInteger(data.process.revision)
      || !Number.isInteger(data.draft.revision)) {
      throw new Error('Process server snapshot unavailable');
    }
    return data;
  };

  const validate = async () => {
    if (!canValidate || dirty || conflict || saving.isLoading || validating.isLoading
      || validationSyncing || serverRevisions.draft !== revision || processRevision > serverRevisions.process
      || editorialState === 'VALIDATED' || compositionOutdated) return;
    setValidationError('');
    setValidationErrorCode('');
    let attemptedRevision = null;
    setValidationSyncing(true);
    try {
      // A background invalidation can race with the editor's local revision
      // state. Refresh before the POST, but never silently validate newly
      // received content the user has not yet reviewed.
      const latest = await fetchServerSnapshot();
      if (latest.process.revision !== serverRevisions.process
        || latest.draft.revision !== revision) {
        applyServerSnapshot(latest);
        setValidationErrorCode('PROCESS_SHEET_REFRESHED');
        setValidationError(
          'Une version plus récente de cette Fiche process a été chargée. '
          + 'Vérifiez son contenu, puis relancez la validation si elle convient.',
        );
        return;
      }
      attemptedRevision = latest.process.revision;
      await validateSheet({
        workspaceId, dossierId, processSheetId,
        expectedRevision: attemptedRevision,
      }).unwrap();
      const saved = await fetchServerSnapshot();
      applyServerSnapshot(saved);
    } catch (error) {
      const code = error?.data?.code ?? '';
      setValidationErrorCode(code);
      if (code === 'PROCESS_SHEET_CHANGED') {
        // Distinguish a real concurrent write from a repeatable server
        // conflict. Never retry the destructive state transition blindly.
        try {
          const latest = await fetchServerSnapshot();
          const changed = latest.process.revision !== attemptedRevision;
          applyServerSnapshot(latest);
          setValidationErrorCode(changed ? 'PROCESS_SHEET_REFRESHED'
            : 'PROCESS_SHEET_VALIDATE_UNEXPECTED_CONFLICT');
          setValidationError(changed
            ? 'Une autre modification a été enregistrée pendant la validation. '
              + 'La dernière version est chargée : vérifiez-la avant de relancer.'
            : 'Le serveur a refusé la validation alors que la version semble à jour. '
              + 'Aucune validation n’a été enregistrée. Si cela se reproduit, '
              + 'le conflit doit être diagnostiqué côté serveur.');
        } catch {
          setValidationError('La validation a rencontré un conflit et '
            + 'l’actualisation a échoué. Vérifiez votre connexion avant de réessayer.');
        }
        return;
      }
      setValidationError(code === 'PROCESS_SHEET_PARENT_CHANGED'
        ? 'La Fiche technique associée a été validée de nouveau. Comparez les compositions pour continuer.'
        : code === 'PROCESS_SHEET_PARENT_REVISION_OPEN'
          ? 'Une modification de la Fiche technique est en cours. Elle doit être terminée avant la validation.'
          : code === 'PROCESS_SHEET_PARENT_INACTIVE' || code === 'PROCESS_SHEET_PARENT_UNVALIDATED'
            ? 'La Fiche technique associée doit être active et validée pour continuer.'
            : code === 'PROCESS_SHEET_ALREADY_VALIDATED'
              ? 'Cette Fiche process est déjà validée.'
              : code === 'PROCESS_SHEET_STEP_REQUIRED'
                ? 'Ajoutez au moins une phase et une étape avec des instructions.'
                : code === 'PROCESS_SHEET_INGREDIENT_INVALID'
                  ? 'Une association d’ingrédient doit être vérifiée avant validation.'
                  : error?.message === 'Process server snapshot unavailable'
                    ? 'Impossible de vérifier la dernière version de la Fiche process. '
                      + 'Aucune validation n’a été lancée.'
                    : 'La validation n’a pas abouti. Aucune validation n’a été enregistrée.');
    } finally {
      setValidationSyncing(false);
    }
  };

  const reload = async () => {
    try {
      const fresh = await fetchServerSnapshot();
      applyServerSnapshot(fresh);
      setValidationError('');
      setValidationErrorCode('');
    } catch {
      setSaveError(true);
      setMessage('Impossible de recharger la Fiche process. '
        + 'Les modifications locales restent affichées.');
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

  const validationDisabled = !canValidate || dirty || saving.isLoading
    || validating.isLoading || validationSyncing || conflict || serverRevisions.draft !== revision
    || processRevision > serverRevisions.process
    || editorialState === 'VALIDATED' || compositionOutdated;
  const validationHelp = !canValidate
    ? 'Validation non autorisée'
    : compositionOutdated
      ? 'Ingrédients à actualiser'
      : editorialState === 'VALIDATED'
        ? 'Déjà validée'
        : dirty
          ? 'Enregistrer d’abord'
          : conflict || serverRevisions.draft !== revision
            || processRevision > serverRevisions.process
            ? 'Actualiser les données'
            : saving.isLoading || validating.isLoading || validationSyncing
              ? 'Opération en cours'
              : 'Valider';
  const saveDisabled = !canEdit || !dirty || saving.isLoading || validationSyncing || conflict;
  const saveHelp = !canEdit
    ? 'Édition non autorisée'
    : conflict
      ? 'Actualiser les données'
      : !dirty
        ? 'Aucune modification'
        : saving.isLoading
          ? 'Enregistrement en cours'
          : 'Enregistrer';

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
      <header className="sticky top-0 z-10 flex min-w-0 flex-wrap items-center gap-3 bg-background py-1">
        {backPath && (
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link to={backPath}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              Fiches process
            </Link>
          </Button>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {processTitle && (
            <h1 className="min-w-0 truncate text-xl font-semibold"
              title={processTitle}>{processTitle}</h1>
          )}
          <StatusBadge
            className="shrink-0"
            tone={editorialState === 'VALIDATED' ? 'success'
              : editorialState === 'DRAFT' ? 'warning' : 'neutral'}
          >
            {editorialState === 'VALIDATED' ? 'Validée'
              : editorialState === 'DRAFT' ? 'Brouillon' : 'État indisponible'}
          </StatusBadge>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className={'flex items-center gap-1.5 text-xs font-medium '
            + (saveError || conflict ? 'text-muted-foreground'
              : dirty ? 'text-warning' : 'text-success')}
            role="status">
            {!dirty && !saveError && !conflict && (
              <CheckCircle2 aria-hidden="true" className="size-4" />
            )}
            {conflict ? 'Enregistrement à vérifier'
              : saveError ? 'Non enregistré'
                : dirty ? 'Modifications non enregistrées' : 'Enregistré'}
          </span>
          <ProcessSheetControlPanel
            previewActive={showPreview}
            compositionDisabled={!canOpenCompositionReview}
            compositionHelp={compositionHelp}
            saveDisabled={saveDisabled}
            saveHelp={saveHelp}
            exportDisabled={exportDisabled}
            exportHelp={exportHelp}
            onExport={exportPdf}
            validationDisabled={validationDisabled}
            validationHelp={validationHelp}
            onPreview={() => setShowPreview((value) => !value)}
            onReconcile={onRequestReconciliation}
            onSave={save}
            onValidate={() => {
              if (unassignedCount > 0) setConfirmValidation(true);
              else validate();
            }}
          />
        </div>
      </header>
      {exportError && <p role="alert" className="text-sm text-destructive">{exportError}</p>}
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold">Déroulement de fabrication</h2>
        <InfoTooltip label="À propos du brouillon process"
          content="Les phases, étapes et ingrédients associés sont propres à cette Fiche process. La sauvegarde est manuelle et ne modifie pas la Fiche technique." />
        {sourceIngredients?.hasLegacyLineIdentity && (
          <InfoTooltip label="À propos de la composition historique"
            content="Les ingrédients proviennent d’une ancienne validation. Une correspondance explicite peut être nécessaire si la Fiche technique est mise à jour." />
        )}
      </div>
      <DialogRoot open={confirmValidation}
        onOpenChange={(open) => setConfirmValidation(open)}>
        <DialogPortal>
          <DialogOverlay className="backdrop-blur-none" />
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>Valider avec des ingrédients non affectés ?</DialogTitle>
              </div>
              <DialogDescription className="sr-only">
                Vérifiez les phases et étapes de la Fiche process avant confirmation.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2 text-sm">
              {!documented && (
                <p role="status">Ajoutez une étape avec des instructions avant de valider.</p>
              )}
              <p role="status">
                {unassignedCount} ingrédient(s) ne sont associés à aucune phase ou étape.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmValidation(false)}>
                Annuler
              </Button>
              <Button type="button" disabled={!documented || validating.isLoading}
                onClick={() => { setConfirmValidation(false); validate(); }}>
                Valider quand même
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
      <DialogRoot
        open={Boolean(validationError || (saveError && !conflict))}
        onOpenChange={(open) => {
          if (!open) {
            setValidationError('');
            setValidationErrorCode('');
            if (!conflict) setSaveError(false);
          }
        }}
      >
        <DialogPortal>
          <DialogOverlay className="backdrop-blur-none" />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {validationError ? 'Validation impossible' : 'Enregistrement impossible'}
              </DialogTitle>
              <DialogDescription>
                {validationError || message}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setValidationError('');
                setValidationErrorCode('');
                if (!conflict) setSaveError(false);
              }}>
                Fermer
              </Button>
              {validationError && (validationErrorCode === 'PROCESS_SHEET_PARENT_CHANGED'
                || validationErrorCode === 'PROCESS_SHEET_PARENT_REVISION_OPEN'
                || validationErrorCode === 'PROCESS_SHEET_INGREDIENT_INVALID'
                || validationErrorCode === 'PROCESS_SHEET_PARENT_INACTIVE'
                || validationErrorCode === 'PROCESS_SHEET_PARENT_UNVALIDATED') && (
                <Button type="button" onClick={() => {
                  setValidationError('');
                  setValidationErrorCode('');
                  onRequestReconciliation?.();
                }}>
                  Examiner la Fiche technique
                </Button>
              )}
              {validationErrorCode === 'PROCESS_SHEET_CHANGED' && (
                <Button type="button" onClick={() => {
                  setValidationError('');
                  setValidationErrorCode('');
                  reload();
                }}>
                  Actualiser la Fiche process
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
      {conflict && (
        <Button onClick={() => setDanger({ kind: 'reload' })} type="button" variant="outline">
          Recharger le brouillon
        </Button>
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
            <div className="grid min-h-0 gap-4 lg:h-full xl:grid-cols-[minmax(19rem,1.1fr)_minmax(0,1.4fr)]">
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
