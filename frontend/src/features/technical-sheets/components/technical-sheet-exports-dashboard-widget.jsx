import {
  DashboardSummaryCard,
} from '@/features/workspace/components/dashboard-summary-card';
import {
  useGetTechnicalSheetExportUsageQuery,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

function TechnicalSheetExportsDashboardWidget() {
  const { workspace } =
    useWorkspaceContext();
  const query =
    useGetTechnicalSheetExportUsageQuery(
      workspace.id,
    );
  const usage = query.data;

  const value = usage
    ? (
        usage.unlimited
          ? usage.current + ' / illimité'
          : usage.current + ' / ' + usage.limit
      )
    : '—';

  const description = usage
    ? (
        usage.unlimited
          ? 'Exports de Fiches techniques réalisés ce mois, tous formats confondus. Quota illimité.'
          : usage.remaining
            + ' export'
            + (usage.remaining === 1 ? '' : 's')
            + ' restant'
            + (usage.remaining === 1 ? '' : 's')
            + ' ce mois, tous formats confondus.'
      )
    : 'Nombre total d’exports PDF, XLSX et CSV réalisés ce mois dans ce Workspace.';

  return (
    <section aria-label="Exports ce mois">
      <DashboardSummaryCard
        description={description}
        isError={query.isError}
        isLoading={
          query.isLoading
          && !usage
        }
        label="Exports ce mois"
        value={value}
      />
    </section>
  );
}

export {
  TechnicalSheetExportsDashboardWidget,
};
