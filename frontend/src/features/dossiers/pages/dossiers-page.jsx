import { useEffect, useMemo, useState } from 'react';
import { Eye, Plus } from 'lucide-react';
import { Link } from 'react-router';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { StatusBadge } from '@/components/shared/status-badge';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateDossierMutation,
  useGetDossierMetadataQuery,
  useListDossiersQuery,
  useUpdateDossierMutation,
} from '@/features/dossiers/api/dossiers-api';
import { DossierDetailsDrawer } from '@/features/dossiers/components/dossier-details-drawer';
import { DossierFormDialog } from '@/features/dossiers/components/dossier-form-dialog';
import { DOSSIER_PERMISSION } from '@/features/dossiers/constants/dossier-permissions';
import {
  formatDossierLocation,
  getDossierStatusLabel,
  getDossierStatusTone,
} from '@/features/dossiers/lib/dossier-presentation';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { useDataPagination } from '@/hooks/use-data-pagination';

const DEFAULT_STATUS_FILTER = '__DEFAULT__';

function getStatusFilterOptions(metadata, canReadDeleted) {
  return [
    {
      value: DEFAULT_STATUS_FILTER,
      label: 'Actifs et en pause',
    },
    ...(metadata?.dossierStatuses ?? [])
      .filter((status) => canReadDeleted || status.value !== 'DELETED'),
  ];
}

function DossiersPage() {
  const { can, workspace } = useWorkspaceContext();
  const { toast } = useToast();
  const {
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useDataPagination();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(DEFAULT_STATUS_FILTER);
  const [drawerState, setDrawerState] = useState({
    dossierId: null,
    open: false,
  });
  const [formState, setFormState] = useState({
    dossier: null,
    mode: 'create',
    open: false,
  });

  const metadataQuery = useGetDossierMetadataQuery(workspace.id);
  const dossiersQuery = useListDossiersQuery({
    workspaceId: workspace.id,
    page,
    limit: pageSize,
    search: search || undefined,
    status: statusFilter === DEFAULT_STATUS_FILTER ? undefined : statusFilter,
  });
  const [createDossier, createState] = useCreateDossierMutation();
  const [updateDossier, updateState] = useUpdateDossierMutation();

  useEffect(() => {
    const totalPages = dossiersQuery.data?.pagination?.totalPages;

    if (totalPages && page > totalPages) {
      setPage(totalPages);
    }
  }, [dossiersQuery.data?.pagination?.totalPages, page, setPage]);

  const statusOptions = useMemo(
    () => getStatusFilterOptions(
      metadataQuery.data,
      can(DOSSIER_PERMISSION.LIFECYCLE_UPDATE),
    ),
    [can, metadataQuery.data],
  );

  const isInitialLoading = (
    (dossiersQuery.isLoading && dossiersQuery.data === undefined)
    || (metadataQuery.isLoading && metadataQuery.data === undefined)
  );
  const hasError = dossiersQuery.isError || metadataQuery.isError;
  const dossiers = dossiersQuery.data?.dossiers ?? [];
  const mutationPending = createState.isLoading || updateState.isLoading;

  function applySearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function changeStatus(value) {
    setPage(1);
    setStatusFilter(value);
  }

  function openCreateDialog() {
    setFormState({
      dossier: null,
      mode: 'create',
      open: true,
    });
  }

  function openEditDialog(dossier) {
    setFormState({
      dossier,
      mode: 'edit',
      open: true,
    });
  }

  function closeFormDialog() {
    if (mutationPending) return;

    setFormState((current) => ({
      ...current,
      open: false,
    }));
  }

  async function submitForm(payload) {
    if (formState.mode === 'edit' && formState.dossier) {
      await updateDossier({
        workspaceId: workspace.id,
        dossierId: formState.dossier.id,
        ...payload,
      }).unwrap();

      toast({
        title: 'Dossier mis à jour',
        variant: 'success',
      });
    } else {
      await createDossier({
        workspaceId: workspace.id,
        ...payload,
      }).unwrap();

      toast({
        title: 'Dossier créé',
        variant: 'success',
      });
    }

    setFormState((current) => ({
      ...current,
      open: false,
    }));
  }

  function retry() {
    dossiersQuery.refetch();
    metadataQuery.refetch();
  }

  const columns = [
    {
      id: 'name',
      header: 'Dossier',
      cell: (dossier) => (
        <div>
          <p className="font-medium">{dossier.name}</p>
          {dossier.brand && (
            <p className="mt-1 text-xs text-muted-foreground">{dossier.brand}</p>
          )}
        </div>
      ),
    },
    {
      id: 'location',
      header: 'Localisation',
      cell: (dossier) => formatDossierLocation(dossier),
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (dossier) => (
        <StatusBadge tone={getDossierStatusTone(dossier.status)}>
          {getDossierStatusLabel(dossier.status, metadataQuery.data)}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (dossier) => (
        <DataTableActions>
          <ActionIconButton
            Icon={Eye}
            label={`Voir ${dossier.name}`}
            onClick={() => setDrawerState({
              dossierId: dossier.id,
              open: true,
            })}
            variant="outline"
          />
          {dossier.status === 'ACTIVE' && (
            <Button asChild size="sm" variant="outline">
              <Link to={`/workspaces/${workspace.id}/dossiers/${dossier.id}`}>
                Ouvrir
              </Link>
            </Button>
          )}
        </DataTableActions>
      ),
    },
  ];

  const help = 'Recherchez, filtrez et ouvrez les magasins auxquels votre rôle et votre périmètre donnent accès.';

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dossiers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Magasins rattachés à {workspace.name}.
            </p>
          </div>
          <InfoTooltip content={help} label="À propos des dossiers" />
        </div>

        {can(DOSSIER_PERMISSION.CREATE) && (
          <Button onClick={openCreateDialog} type="button">
            <Plus aria-hidden="true" className="size-4" />
            Créer un dossier
          </Button>
        )}
      </header>

      <section className="rounded-xl border border-border bg-card">
        <div className="grid gap-3 border-b border-border p-5 lg:grid-cols-[1fr_240px]">
          <form className="flex gap-2" onSubmit={applySearch}>
            <Input
              aria-label="Rechercher un dossier"
              maxLength={120}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Nom, enseigne, ville ou code postal"
              value={searchInput}
            />
            <Button type="submit" variant="outline">
              Rechercher
            </Button>
          </form>

          <Select
            items={statusOptions}
            onValueChange={changeStatus}
            value={statusFilter}
          >
            <SelectTrigger aria-label="Filtrer par statut">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isInitialLoading ? (
          <p className="p-5 text-sm text-muted-foreground">Chargement des dossiers…</p>
        ) : hasError ? (
          <ErrorState
            description="Les dossiers ou leurs métadonnées n’ont pas pu être chargés."
            onRetry={retry}
            title="Dossiers indisponibles"
          />
        ) : (
          <>
            <DataTable
              caption="Dossiers accessibles du workspace"
              columns={columns}
              data={dossiers}
              emptyContent={(
                <EmptyState
                  className="p-0"
                  description={
                    search || statusFilter !== DEFAULT_STATUS_FILTER
                      ? 'Modifiez la recherche ou le filtre pour élargir les résultats.'
                      : 'Créez un premier dossier ou demandez une affectation à un dossier existant.'
                  }
                  title="Aucun dossier à afficher"
                />
              )}
              getRowKey={(dossier) => dossier.id}
            />

            <div className="px-5 pb-5">
              <DataPagination
                ariaLabel="Pagination des dossiers"
                disabled={dossiersQuery.isFetching}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                page={page}
                pageSize={pageSize}
                pagination={dossiersQuery.data?.pagination}
              />
            </div>
          </>
        )}
      </section>

      <DossierDetailsDrawer
        dossierId={drawerState.dossierId}
        metadata={metadataQuery.data}
        onClose={() => setDrawerState((current) => ({
          ...current,
          open: false,
        }))}
        onEdit={openEditDialog}
        open={drawerState.open}
        workspaceId={workspace.id}
      />

      <DossierFormDialog
        dossier={formState.dossier}
        mode={formState.mode}
        onClose={closeFormDialog}
        onSubmit={submitForm}
        open={formState.open}
        pending={mutationPending}
      />
    </div>
  );
}

export {
  DEFAULT_STATUS_FILTER,
  DossiersPage,
  getStatusFilterOptions,
};
