import { useEffect, useState } from 'react';

import {
  useCreateDossierMutation,
  useGetDossierMetadataQuery,
  useListDossiersQuery,
} from '@/features/dossiers/api/dossiers-api';
import { DashboardDossiers } from '@/features/dossiers/components/dashboard-dossiers';
import { DossierFormDialog } from '@/features/dossiers/components/dossier-form-dialog';
import { DOSSIER_PERMISSION } from '@/features/dossiers/constants/dossier-permissions';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { useToast } from '@/components/shared/toast-provider';
import { isInitialQueryLoading } from '@/features/workspace/lib/dashboard-query';

const DASHBOARD_DOSSIER_LIMIT = 12;

function DossiersDashboardWidget() {
  const { workspace, can } = useWorkspaceContext();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createDossier, createState] = useCreateDossierMutation();
  const dossiersQuery = useListDossiersQuery({
    workspaceId: workspace.id,
    page,
    limit: DASHBOARD_DOSSIER_LIMIT,
    search: search || undefined,
  });
  const metadataQuery = useGetDossierMetadataQuery(workspace.id);
  const pagination = dossiersQuery.data?.pagination;

  useEffect(() => {
    if (pagination?.totalPages && page > pagination.totalPages) {
      setPage(pagination.totalPages);
    }
  }, [pagination?.totalPages, page]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function submitCreate(payload) {
    await createDossier({ workspaceId: workspace.id, ...payload }).unwrap();
    setCreateOpen(false);
    setPage(1);
    setSearch('');
    setSearchInput('');
    toast({ title: 'Dossier créé', variant: 'success' });
  }

  function retry() {
    dossiersQuery.refetch();
    metadataQuery.refetch();
  }

  return (
    <>
      <DashboardDossiers
        canCreate={can(DOSSIER_PERMISSION.CREATE)}
        dossiers={dossiersQuery.data?.dossiers ?? []}
        isError={dossiersQuery.isError || metadataQuery.isError}
        isLoading={isInitialQueryLoading(dossiersQuery) || isInitialQueryLoading(metadataQuery)}
        isFetching={dossiersQuery.isFetching}
        metadata={metadataQuery.data ?? null}
        onCreate={() => setCreateOpen(true)}
        onPageChange={setPage}
        onRetry={retry}
        onSearch={submitSearch}
        onSearchChange={setSearchInput}
        page={page}
        pageSize={DASHBOARD_DOSSIER_LIMIT}
        search={search}
        searchInput={searchInput}
        total={pagination?.total ?? 0}
        totalPages={pagination?.totalPages ?? 0}
        workspaceId={workspace.id}
      />
      <DossierFormDialog
        dossier={null}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSubmit={submitCreate}
        open={createOpen}
        pending={createState.isLoading}
      />
    </>
  );
}

export { DASHBOARD_DOSSIER_LIMIT, DossiersDashboardWidget };
