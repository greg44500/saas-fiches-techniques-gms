import { Link } from 'react-router';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { ArrowUpRight } from 'lucide-react';
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
    <Card
      aria-label="Capacité des Fiches techniques"
      className="shadow-sm"
      role="region"
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-1">
          <CardTitle as="h2">Fiches techniques</CardTitle>
          <InfoTooltip
            content="La capacité inclut les Fiches présentes dans les Dossiers et celles encore conservées dans la Corbeille avant leur suppression définitive."
            label="À propos de la capacité des Fiches techniques"
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
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
          <div className="space-y-3">
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
                indicatorClassName="bg-primary"
                aria-valuetext={Math.round(percentage) + ' % de la capacité utilisée'}
                value={percentage}
              />
            )}

            {isOwner && trashCount !== null && !trashQuery.isError && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Link
                  className="group rounded-lg border border-border p-2.5 transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  to={`/workspaces/${workspace.id}/dossiers`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">Dans les Dossiers</span>
                    <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{inDossiers}</p>
                  <span className="text-xs text-muted-foreground">Accéder aux Dossiers</span>
                </Link>
                <Link
                  className="group rounded-lg border border-border p-2.5 transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  to={`/workspaces/${workspace.id}/technical-sheets/trash`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">Dans la Corbeille</span>
                    <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{trashCount}</p>
                  <span className="text-xs text-muted-foreground">Accéder à la Corbeille</span>
                </Link>
              </div>
            )}

            {isOwner && trashQuery.isError && (
              <p className="text-xs text-muted-foreground">
                La répartition avec la Corbeille n’est pas disponible.
              </p>
            )}

          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { TechnicalSheetsCapacityDashboardWidget };
