import {
  useGetDossierMetadataQuery,
  useListDossiersQuery,
} from '@/features/dossiers/api/dossiers-api';
import { DashboardDossiers } from '@/features/dossiers/components/dashboard-dossiers';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { isInitialQueryLoading } from '@/features/workspace/lib/dashboard-query';

const DASHBOARD_DOSSIER_LIMIT = 5;

function DossiersDashboardWidget() {
  const { workspace } = useWorkspaceContext();
  const dossiersQuery = useListDossiersQuery({
    workspaceId: workspace.id,
    page: 1,
    limit: DASHBOARD_DOSSIER_LIMIT,
  });
  const metadataQuery = useGetDossierMetadataQuery(workspace.id);

  function retry() {
    dossiersQuery.refetch();
    metadataQuery.refetch();
  }

  return (
    <DashboardDossiers
      dossiers={dossiersQuery.data?.dossiers ?? []}
      isError={dossiersQuery.isError || metadataQuery.isError}
      isLoading={
        isInitialQueryLoading(dossiersQuery)
        || isInitialQueryLoading(metadataQuery)
      }
      metadata={metadataQuery.data ?? null}
      onRetry={retry}
      total={dossiersQuery.data?.pagination?.total ?? 0}
      workspaceId={workspace.id}
    />
  );
}

export { DASHBOARD_DOSSIER_LIMIT, DossiersDashboardWidget };
