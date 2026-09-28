import {
  Eye,
  Plus,
  Search,
  Settings2,
} from 'lucide-react';
import { useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router';

import {
  DataTable,
  DataTableActions,
} from '@/components/data-display/data-table';
import { DataPagination } from '@/components/data-display/data-pagination';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useGetTechnicalSheetCapacityQuery,
  useListTechnicalSheetsQuery,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  TechnicalSheetCreateDialog,
} from '@/features/technical-sheets/components/technical-sheet-create-dialog';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';
import {
  getTechnicalSheetStatusPresentation,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';
import {
  useGetDossierByIdQuery,
} from '@/features/dossiers/api/dossiers-api';
import { useDataPagination } from '@/hooks/use-data-pagination';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

function TechnicalSheetsPage() {
  const { dossierId } = useParams();
  const navigate = useNavigate();
  const { can, membership, workspace } = useWorkspaceContext();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const { page, pageSize, setPage, setPageSize } = useDataPagination();

  const dossierQuery = useGetDossierByIdQuery({
    workspaceId: workspace.id,
    dossierId,
  });
  const listQuery = useListTechnicalSheetsQuery({
    workspaceId: workspace.id,
    dossierId,
    page,
    limit: pageSize,
    search: search.trim() || undefined,
  });
  const capacityQuery = useGetTechnicalSheetCapacityQuery(workspace.id);

  if (
    (dossierQuery.isLoading && !dossierQuery.data)
    || (listQuery.isLoading && !listQuery.data)
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement des Fiches techniques…
      </p>
    );
  }

  if (dossierQuery.isError || !dossierQuery.data) {
    return (
      <ErrorState
        description="Le Dossier demandé n’est pas accessible ou n’a pas pu être chargé."
        onRetry={dossierQuery.refetch}
        title="Dossier indisponible"
      />
    );
  }

  if (listQuery.isError) {
    return (
      <ErrorState
        description="Les Fiches techniques n’ont pas pu être chargées."
        onRetry={listQuery.refetch}
        title="Liste indisponible"
      />
    );
  }

  const dossier = dossierQuery.data;
  const sheets = listQuery.data?.sheets ?? [];
  const pagination = listQuery.data?.pagination;
  const capacity = capacityQuery.data;
  const quotaReached = Boolean(
    capacity
    && !capacity.unlimited
    && capacity.current >= capacity.limit,
  );
  const operational = dossier.status === 'ACTIVE';
  const canCreate = can(TECHNICAL_SHEET_PERMISSION.CREATE)
    && operational
    && !quotaReached;
  const isOwner = membership?.role?.key === 'owner';

  const columns = [
    {
      id: 'name',
      header: 'Fiche technique',
      cell: (sheet) => (
        <div>
          <p className="font-medium">{sheet.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {sheet.currentValidatedStateId
              ? 'Un état validé est disponible'
              : 'Aucun état validé'}
          </p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (sheet) => {
        const presentation = getTechnicalSheetStatusPresentation(sheet.status);
        return (
          <StatusBadge tone={presentation.tone}>
            {presentation.label}
          </StatusBadge>
        );
      },
    },
    {
      id: 'updated',
      header: 'Dernière modification',
      cell: (sheet) => new Date(sheet.updatedAt).toLocaleString('fr-FR'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (sheet) => (
        <DataTableActions>
          <Button asChild size="sm" variant="outline">
            <Link
              to={
                '/workspaces/' + workspace.id
                + '/dossiers/' + dossierId
                + '/technical-sheets/' + sheet.id
              }
            >
              <Eye aria-hidden="true" className="size-4" />
              Ouvrir
            </Link>
          </Button>
        </DataTableActions>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link to={'/workspaces/' + workspace.id + '/dossiers/' + dossierId}>
              Retour au Dossier
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              {dossier.name}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Fiches techniques
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Composition, approvisionnement, valorisation et historique validé de ce Dossier.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isOwner && (
              <Button asChild size="sm" variant="outline">
                <Link to={'/workspaces/' + workspace.id + '/technical-sheets/trash'}>
                  Corbeille
                </Link>
              </Button>
            )}
            {can(TECHNICAL_SHEET_PERMISSION.SETTINGS_MANAGE) && (
              <Button asChild size="sm" variant="outline">
                <Link
                  to={
                    '/workspaces/' + workspace.id
                    + '/dossiers/' + dossierId
                    + '/technical-sheets/settings'
                  }
                >
                  <Settings2 aria-hidden="true" className="size-4" />
                  Réglages
                </Link>
              </Button>
            )}
            {can(TECHNICAL_SHEET_PERMISSION.CREATE) && (
              <Button
                disabled={!canCreate}
                onClick={() => setCreateOpen(true)}
                size="sm"
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                Créer
              </Button>
            )}
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Capacité</CardTitle>
        </CardHeader>
        <CardContent>
          {capacityQuery.isError ? (
            <p className="text-sm text-muted-foreground">
              La capacité du Workspace n’a pas pu être chargée.
            </p>
          ) : capacity ? (
            <div className="space-y-1">
              <p className="text-2xl font-semibold">
                {capacity.current}
                {' / '}
                {capacity.unlimited ? 'illimité' : capacity.limit}
              </p>
              <p className="text-sm text-muted-foreground">
                Les Fiches en corbeille continuent de consommer une unité jusqu’à leur purge définitive.
              </p>
              {quotaReached && (
                <p className="text-sm font-medium text-warning">
                  Limite atteinte : la modification des Fiches existantes reste autorisée, mais pas la création ni la copie.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Chargement de la capacité…
            </p>
          )}
        </CardContent>
      </Card>

      {!operational && (
        <Card>
          <CardHeader>
            <CardTitle>Dossier non opérationnel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Les consultations restent disponibles selon vos droits, mais la création et le travail courant exigent un Dossier actif.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-xl">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
        />
        <Input
          aria-label="Rechercher une Fiche technique"
          className="pl-9"
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Rechercher par nom ou description…"
          value={search}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            aria-label="Fiches techniques"
            columns={columns}
            data={sheets}
            emptyContent={(
              <EmptyState
                description={
                  search.trim()
                    ? 'Aucune Fiche ne correspond à cette recherche.'
                    : 'Créez la première Fiche technique de ce Dossier.'
                }
                title="Aucune Fiche technique"
              />
            )}
            getRowKey={(sheet) => sheet.id}
            rowClassName="transition-colors hover:bg-muted/35"
          />
          <DataPagination
            disabled={listQuery.isFetching}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            page={page}
            pageSize={pageSize}
            pagination={pagination}
          />
        </CardContent>
      </Card>

      <TechnicalSheetCreateDialog
        dossierId={dossierId}
        onClose={() => setCreateOpen(false)}
        onCreated={(result) => {
          setCreateOpen(false);
          navigate(
            '/workspaces/' + workspace.id
            + '/dossiers/' + dossierId
            + '/technical-sheets/' + result.sheet.id,
          );
        }}
        open={createOpen}
        workspaceId={workspace.id}
      />
    </div>
  );
}

export { TechnicalSheetsPage };
