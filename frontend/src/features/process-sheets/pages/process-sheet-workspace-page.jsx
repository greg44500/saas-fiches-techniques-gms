import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
import {
  ProcessSheetDraftEditor,
} from '@/features/process-sheets/components/process-sheet-draft-editor';
import {
  PROCESS_SHEET_PERMISSION,
} from '@/features/process-sheets/constants/process-sheet-permissions';
import {
  useGetProcessSheetQuery,
} from '@/features/process-sheets/api/process-sheets-api';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function ProcessSheetWorkspacePage() {
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

  const { process, draft, sourceIngredients, compositionOutdated, dossierOperational } = detail.data;
  // GET shares the already-authorized Dossier operational state from the
  // backend, so edit roles do not require a second dossier:read permission.
  const canEdit = Boolean(can?.(PROCESS_SHEET_PERMISSION.EDIT))
    && process?.status === 'ACTIVE' && dossierOperational === true;
  const canReadPhaseLibrary = Boolean(can?.('process-library:read'));

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
      <header className="flex min-w-0 items-center gap-3">
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
        <InfoTooltip
          label="À propos du brouillon de fabrication"
          content="La Fiche process est liée à la validation M-004 sélectionnée lors de sa création. Le travail sur les phases et étapes sera enregistré dans un brouillon spécifique au process."
        />
      </header>
      {compositionOutdated && (
        <p className="rounded-lg border border-border bg-muted/50 p-3 text-sm" role="note">
          La composition M-004 a évolué depuis la création de ce process.
          Les ingrédients ci-dessous proviennent de la validation liée à ce brouillon ;
          aucune correspondance n’est appliquée automatiquement.
        </p>
      )}
      <ProcessSheetDraftEditor
        key={process.id}
        canEdit={canEdit}
        canReadPhaseLibrary={canReadPhaseLibrary}
        dossierId={dossierId}
        initialDraft={draft}
        onReload={detail.refetch}
        processSheetId={process.id}
        sourceIngredients={sourceIngredients}
        workspaceId={workspace.id}
      />
    </div>
  );
}

export { ProcessSheetWorkspacePage };
