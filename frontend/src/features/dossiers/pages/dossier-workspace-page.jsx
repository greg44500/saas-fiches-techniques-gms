import {
  ArrowLeft,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react';
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
  DOSSIER_SUPPLIER_PAGE_PERMISSIONS,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';
import {
  formatDossierLocation,
  getDossierStatusLabel,
  getDossierStatusTone,
} from '@/features/dossiers/lib/dossier-presentation';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function DossierWorkspacePage() {
  const { dossierId } = useParams();
  const { can, canAny, workspace } = useWorkspaceContext();
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

      <header className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {dossier.name}
          </h1>
          <StatusBadge tone={getDossierStatusTone(dossier.status)}>
            {getDossierStatusLabel(dossier.status, metadataQuery.data)}
          </StatusBadge>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <div className="flex min-w-0 items-start gap-2">
            <MapPin
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <span>{formatDossierLocation(dossier)}</span>
          </div>
          <div className="flex min-w-0 items-start gap-2">
            <UserRound
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <span>{dossier.contactName || 'Responsable non renseigné'}</span>
          </div>
          <div className="flex min-w-0 items-start gap-2">
            <Mail
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <span className="break-all">
              {dossier.documentEmail || 'Email documents non renseigné'}
            </span>
          </div>
          <div className="flex min-w-0 items-start gap-2">
            <Phone
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <span>{dossier.phone || 'Téléphone non renseigné'}</span>
          </div>
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
        <div className="flex flex-wrap gap-2">
          {canAny(DOSSIER_SUPPLIER_PAGE_PERMISSIONS) && (
            <Button asChild>
              <Link to={'/workspaces/' + workspace.id + '/dossiers/' + dossier.id + '/suppliers'}>
                Fournisseurs et prix
              </Link>
            </Button>
          )}
          {can(TECHNICAL_SHEET_PERMISSION.READ) && (
            <Button asChild variant="outline">
              <Link
                to={
                  '/workspaces/' + workspace.id
                  + '/dossiers/' + dossier.id
                  + '/technical-sheets'
                }
              >
                Fiches techniques
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export { DossierWorkspacePage };
