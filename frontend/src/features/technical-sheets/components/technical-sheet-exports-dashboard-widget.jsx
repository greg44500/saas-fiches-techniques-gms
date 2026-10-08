import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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

  const percentage = usage && !usage.unlimited
    ? (usage.limit === 0
      ? (usage.current > 0 ? 100 : 0)
      : Math.min((usage.current / usage.limit) * 100, 100))
    : null;

  return (
    <section aria-label="Exports ce mois">
      <Card className="shadow-sm">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm text-muted-foreground">Exports ce mois</h2>
            <InfoTooltip content={description} label="À propos de Exports ce mois" />
          </div>
          {query.isLoading && !usage ? (
            <div aria-live="polite" role="status" className="space-y-2">
              <span className="sr-only">Chargement des exports ce mois…</span>
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          ) : query.isError ? (
            <p className="text-sm text-destructive" role="alert">Exports indisponibles.</p>
          ) : usage ? (
            <>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
                {!usage.unlimited && (
                  <p className="text-sm text-muted-foreground">
                    {usage.remaining} disponible{usage.remaining === 1 ? '' : 's'}
                  </p>
                )}
              </div>
              {!usage.unlimited && (
                <Progress
                  indicatorClassName="bg-primary"
                  aria-valuetext={Math.round(percentage) + ' % des exports utilisés'}
                  value={percentage}
                />
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

export {
  TechnicalSheetExportsDashboardWidget,
};
