import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  useGetProcessSheetQuery,
} from '@/features/process-sheets/api/process-sheets-api';
import {
  ProcessSheetCompositionPanel,
} from '@/features/process-sheets/components/process-sheet-composition-panel';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function ProcessSheetWorkspacePage() {
  const { dossierId, processSheetId } = useParams();
  const { workspace } = useWorkspaceContext();
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

  const { process, draft } = detail.data;

  return (
    <div className="space-y-5">
      <Button asChild size="sm" variant="outline">
        <Link to={backPath}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          Fiches process
        </Link>
      </Button>
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">{process.title}</h1>
        <InfoTooltip
          label="À propos du brouillon de fabrication"
          content="La Fiche process est liée à la validation M-004 sélectionnée lors de sa création. Le travail sur les phases et étapes sera enregistré dans un brouillon spécifique au process."
        />
      </header>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ProcessSheetCompositionPanel
          dossierId={dossierId}
          technicalSheetId={process.technicalSheetId}
          workspaceId={workspace.id}
        />
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Phases et étapes</CardTitle>
              <InfoTooltip
                label="À propos des phases et étapes"
                content="Les étapes, les phases et les affectations d’ingrédients constituent le brouillon de la Fiche process. La saisie sera activée une fois les contrats de sauvegarde et de validation terminés."
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {draft && draft.phases.length > 0 ? (
              <p className="text-sm">{draft.phases.length} phases enregistrées.</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucune phase enregistrée. Le brouillon est initialisé, mais l’éditeur de phases
                et d’étapes n’est pas encore disponible dans ce lot.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { ProcessSheetWorkspacePage };
