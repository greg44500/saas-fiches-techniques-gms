import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useGetDossierByIdQuery,
  useGetDossierMetadataQuery,
} from '@/features/dossiers/api/dossiers-api';
import {
  formatDossierLocation,
  getDossierStatusLabel,
  getDossierStatusTone,
} from '@/features/dossiers/lib/dossier-presentation';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function DossierWorkspacePage() {
  const { dossierId } = useParams();
  const { workspace } = useWorkspaceContext();
  const dossierQuery = useGetDossierByIdQuery({
    workspaceId: workspace.id,
    dossierId,
  });
  const metadataQuery = useGetDossierMetadataQuery(workspace.id);

  if (
    (dossierQuery.isLoading && dossierQuery.data === undefined)
    || (metadataQuery.isLoading && metadataQuery.data === undefined)
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement du dossier…
      </p>
    );
  }

  if (dossierQuery.isError || metadataQuery.isError || !dossierQuery.data) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link to={`/workspaces/${workspace.id}/dossiers`}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Retour aux dossiers
          </Link>
        </Button>
        <ErrorState
          description="Le dossier demandé n’est pas accessible ou n’a pas pu être chargé."
          onRetry={() => {
            dossierQuery.refetch();
            metadataQuery.refetch();
          }}
          title="Dossier indisponible"
        />
      </div>
    );
  }

  const dossier = dossierQuery.data;
  const operational = dossier.status === 'ACTIVE';

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link to={`/workspaces/${workspace.id}/dashboard`}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              Tableau de bord
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to={`/workspaces/${workspace.id}/dossiers`}>
              Dossiers
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">{workspace.name}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {dossier.name}
            </h1>
            {dossier.brand && (
              <p className="mt-1 text-sm text-muted-foreground">
                {dossier.brand}
              </p>
            )}
          </div>

          <StatusBadge tone={getDossierStatusTone(dossier.status)}>
            {getDossierStatusLabel(dossier.status, metadataQuery.data)}
          </StatusBadge>
        </div>
      </header>

      {!operational ? (
        <Card>
          <CardHeader>
            <CardTitle>Contexte de travail indisponible</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Seul un dossier actif peut être utilisé comme contexte de travail métier.
            </p>
            <p className="text-sm text-muted-foreground">
              Vous pouvez consulter ou administrer ce dossier depuis la liste des Dossiers selon vos permissions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Contexte actif</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Toutes les futures opérations métier ouvertes depuis cette page seront rattachées à ce magasin et revalidées côté serveur.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Localisation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{formatDossierLocation(dossier)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{dossier.contactName || 'Responsable non renseigné'}</p>
                <p className="text-muted-foreground">
                  {dossier.documentEmail || 'Email documents non renseigné'}
                </p>
                <p className="text-muted-foreground">
                  {dossier.phone || 'Téléphone non renseigné'}
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export { DossierWorkspacePage };
