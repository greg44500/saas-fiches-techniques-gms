import {
  useGetTechnicalSheetCapacityQuery,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  DashboardSummaryCard,
} from '@/features/workspace/components/dashboard-summary-card';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

function TechnicalSheetsCapacityDashboardWidget() {
  const { workspace } = useWorkspaceContext();
  const query = useGetTechnicalSheetCapacityQuery(workspace.id);
  const capacity = query.data;

  return (
    <DashboardSummaryCard
      description="Nombre de Fiches techniques conservées dans le Workspace, corbeille comprise."
      isError={query.isError}
      isLoading={query.isLoading && !capacity}
      label="Fiches techniques"
      value={
        capacity
          ? capacity.current + ' / ' + (capacity.unlimited ? 'illimité' : capacity.limit)
          : '—'
      }
    />
  );
}

export { TechnicalSheetsCapacityDashboardWidget };
