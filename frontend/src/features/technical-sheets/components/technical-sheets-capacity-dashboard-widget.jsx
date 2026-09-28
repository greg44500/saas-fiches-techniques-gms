import { Link } from 'react-router';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useGetTechnicalSheetCapacityQuery,
  useListTechnicalSheetTrashQuery,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

function TechnicalSheetsCapacityDashboardWidget() {
  const { membership, workspace } = useWorkspaceContext();
  const isOwner = membership?.role?.key === 'owner';
  const capacityQuery = useGetTechnicalSheetCapacityQuery(workspace.id);
  const trashQuery = useListTechnicalSheetTrashQuery(
    {
      workspaceId: workspace.id,
      page: 1,
      limit: 1,
    },
    { skip: !isOwner },
  );

  const capacity = capacityQuery.data;
  const trashCount = isOwner
    ? (trashQuery.data?.pagination?.total ?? null)
    : null;
  const inDossiers = capacity && trashCount !== null
    ? Math.max(capacity.current - trashCount, 0)
    : null;
  const percentage = capacity && !capacity.unlimited
    ? (
      capacity.limit === 0
        ? (capacity.current > 0 ? 100 : 0)
        : Math.min((capacity.current / capacity.limit) * 100, 100)
    )
    : null;

  return (
    <Card className="h-full shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-1">
          <CardTitle as="h2">Fiches techniques</CardTitle>
          <InfoTooltip
            content="La capacité inclut les Fiches présentes dans les Dossiers et celles encore conservées dans la Corbeille avant leur suppression définitive."
            label="À propos de la capacité des Fiches techniques"
          />
        </div>
      </CardHeader>
      <CardContent>
        {capacityQuery.isLoading && !capacity ? (
          <div aria-live="polite" className="space-y-4" role="status">
            <span className="sr-only">
              Chargement de la capacité des Fiches techniques…
            </span>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-2.5 w-full rounded-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : capacityQuery.isError ? (
          <p className="text-sm text-destructive" role="alert">
            Capacité indisponible.
          </p>
        ) : capacity ? (
          <div className="space-y-4">
            <div>
              <p className="text-2xl font-semibold tracking-tight">
                {capacity.current}
                {' / '}
                {capacity.unlimited ? 'illimité' : capacity.limit}
              </p>
              {!capacity.unlimited && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {capacity.remaining} disponible{capacity.remaining === 1 ? '' : 's'}
                </p>
              )}
            </div>

            {!capacity.unlimited && (
              <Progress
                aria-valuetext={Math.round(percentage) + ' % de la capacité utilisée'}
                value={percentage}
              />
            )}

            {isOwner && trashCount !== null && !trashQuery.isError && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-muted-foreground">Dans les Dossiers</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {inDossiers}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-muted-foreground">Dans la Corbeille</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {trashCount}
                  </p>
                </div>
              </div>
            )}

            {isOwner && trashQuery.isError && (
              <p className="text-xs text-muted-foreground">
                La répartition avec la Corbeille n’est pas disponible.
              </p>
            )}

            {isOwner && trashCount > 0 && (
              <Button asChild size="sm" variant="outline">
                <Link to={'/workspaces/' + workspace.id + '/technical-sheets/trash'}>
                  Voir la Corbeille
                </Link>
              </Button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { TechnicalSheetsCapacityDashboardWidget };
