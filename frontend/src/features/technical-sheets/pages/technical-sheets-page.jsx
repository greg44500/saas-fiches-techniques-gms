import {
  Eye,
  Plus,
  Search,
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
import { InfoTooltip } from '@/components/shared/info-tooltip';
import {
  TechnicalSheetStatusBadge,
} from '@/features/technical-sheets/components/technical-sheet-status-badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useGetDossierTechnicalSheetSettingsQuery,
  useGetTechnicalSheetCapacityQuery,
  useGetTechnicalSheetMetadataQuery,
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
  const { can, workspace } = useWorkspaceContext();
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
  const settingsQuery = useGetDossierTechnicalSheetSettingsQuery({
    workspaceId: workspace.id,
    dossierId,
  });
  const metadataQuery = useGetTechnicalSheetMetadataQuery({
    workspaceId: workspace.id,
    dossierId,
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
  const defaultTargetMarginBasisPoints =
    settingsQuery.data?.defaultTargetMarginBasisPoints
    ?? dossier.technicalSheetSettings
      ?.defaultTargetMarginBasisPoints
    ?? null;
  const operational = dossier.status === 'ACTIVE';
  const canCreate = can(TECHNICAL_SHEET_PERMISSION.CREATE)
    && operational
    && !quotaReached;
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
        const presentation = getTechnicalSheetStatusPresentation(
          sheet.status,
          metadataQuery.data?.statusDefinitions,
        );
        return (
          <TechnicalSheetStatusBadge tone={presentation.tone}>
            {presentation.label}
          </TechnicalSheetStatusBadge>
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
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Fiches techniques
          </h2>
          <InfoTooltip
            content="Composition, approvisionnement, valorisation et historique validé de ce Dossier."
            label="À propos des Fiches techniques"
          />
        </div>

        <div className="flex flex-wrap gap-2">
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
      </header>

      {quotaReached && (
        <div
          className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm"
          role="alert"
        >
          La limite de Fiches techniques du Workspace est atteinte. Les Fiches existantes restent modifiables, mais aucune nouvelle Fiche ni copie ne peut être créée.
        </div>
      )}

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

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
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
        </div>

        <DataTable
          aria-label="Fiches techniques"
          columns={columns}
          data={sheets}
          emptyContent={(
            <EmptyState
              className="p-0"
              description={
                search.trim()
                  ? 'Aucune Fiche ne correspond à cette recherche.'
                  : 'Créez la première Fiche technique de ce Dossier.'
              }
              title="Aucune Fiche technique"
            />
          )}
          getRowKey={(sheet) => sheet.id}
          rowClassName="transition-colors hover:bg-muted/50"
        />
        <div className="px-5 pb-5">
          <DataPagination
            disabled={listQuery.isFetching}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            page={page}
            pageSize={pageSize}
            pagination={pagination}
          />
        </div>
      </section>

      <TechnicalSheetCreateDialog
        defaultTargetMarginBasisPoints={
          defaultTargetMarginBasisPoints
        }
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
