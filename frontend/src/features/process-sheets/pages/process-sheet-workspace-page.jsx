import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import {
  ProcessSheetDraftEditor,
} from '@/features/process-sheets/components/process-sheet-draft-editor';
import { ProcessSheetReconciliationDialog } from '@/features/process-sheets/components/process-sheet-reconciliation-dialog';
import {
  PROCESS_SHEET_PERMISSION,
} from '@/features/process-sheets/constants/process-sheet-permissions';
import {
  useGetProcessSheetQuery,
} from '@/features/process-sheets/api/process-sheets-api';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function ProcessSheetWorkspacePage() {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [localDirty, setLocalDirty] = useState(false);
  const { dossierId, processSheetId } = useParams();
  const { workspace, can } = useWorkspaceContext();
  const detail = useGetProcessSheetQuery({
    workspaceId: workspace.id, dossierId, processSheetId,
  });
  const backPath = '/workspaces/' + workspace.id
    + '/dossiers/' + dossierId + '/process-sheets';

  if (detail.isLoading && !detail.data) {
    return <p className="text-sm text-muted-foreground">Ouverture du brouillon process…</p>;
  }
  if (detail.isError || !detail.data) {
    return (
      <ErrorState
        title="Fiche process indisponible"
        description="Le process demandé n’est pas accessible ou a changé d’état."
        onRetry={detail.refetch}
      />
    );
  }

  const { process, draft, sourceIngredients, compositionOutdated, parentDraftOpen, dossierOperational } = detail.data;
  // GET shares the already-authorized Dossier operational state from the
  // backend, so edit roles do not require a second dossier:read permission.
  const canEdit = Boolean(can?.(PROCESS_SHEET_PERMISSION.EDIT))
    && process?.status === 'ACTIVE' && dossierOperational === true;
  const canReadPhaseLibrary = Boolean(can?.(PROCESS_SHEET_PERMISSION.READ));
  const canValidate = Boolean(can?.(PROCESS_SHEET_PERMISSION.VALIDATE))
    && process?.status === 'ACTIVE' && dossierOperational === true;
  const needsCompositionReview = Boolean(compositionOutdated || parentDraftOpen);
  const canOpenCompositionReview = needsCompositionReview
    && process?.status === 'ACTIVE' && dossierOperational === true;
  const compositionHelp = process?.status !== 'ACTIVE' || dossierOperational !== true
    ? 'La Fiche process et le dossier doivent être actifs pour actualiser la composition.'
    : parentDraftOpen
      ? 'Une modification de la Fiche technique est en cours. Ouvrez ce dialogue pour savoir comment la terminer.'
      : compositionOutdated
        ? 'Une nouvelle validation de la Fiche technique est disponible. Comparez les compositions avant de poursuivre.'
        : 'La Fiche process utilise déjà la composition officielle courante. Aucune actualisation n’est nécessaire.';

  if (!process || !draft) {
    return (
      <ErrorState
        title="Brouillon process indisponible"
        description="Les données du process sont incomplètes. Aucun brouillon vide ne doit les remplacer."
        onRetry={detail.refetch}
      />
    );
  }

  return (
    <div className="space-y-3">
      <header className="flex min-w-0 flex-wrap items-center gap-3">
        <Button asChild className="shrink-0" size="sm" variant="outline">
          <Link to={backPath}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Fiches process
          </Link>
        </Button>
        <span aria-hidden="true" className="shrink-0 text-muted-foreground">|</span>
        <h1 className="min-w-0 truncate text-xl font-semibold sm:text-2xl" title={process.title}>
          {process.title}
        </h1>
      </header>
      <ProcessSheetDraftEditor
        key={process.id}
        canEdit={canEdit}
        canValidate={canValidate}
        editorialState={process.editorialState}
        processRevision={process.revision}
        compositionOutdated={compositionOutdated || parentDraftOpen}
        canOpenCompositionReview={canOpenCompositionReview}
        compositionHelp={compositionHelp}
        onDirtyChange={setLocalDirty}
        onRequestReconciliation={() => setReviewOpen(true)}
        canReadPhaseLibrary={canReadPhaseLibrary}
        dossierId={dossierId}
        initialDraft={draft}
        onReload={detail.refetch}
        processSheetId={process.id}
        sourceIngredients={sourceIngredients}
        workspaceId={workspace.id}
      />
      <ProcessSheetReconciliationDialog
        canApply={canEdit && canValidate && !localDirty}
        applyUnavailableReason={localDirty
          ? 'Enregistrez vos modifications avant d’actualiser la composition.'
          : !canEdit || !canValidate
            ? 'Votre rôle ne permet pas de modifier et valider cette Fiche process.'
            : 'Le dossier et la Fiche process doivent être actifs pour actualiser.'}
        dossierId={dossierId}
        onClose={() => setReviewOpen(false)}
        onUpdated={detail.refetch}
        open={reviewOpen}
        processSheetId={process.id}
        technicalSheetId={process.technicalSheetId}
        workspaceId={workspace.id}
      />
    </div>
  );
}

export { ProcessSheetWorkspacePage };
