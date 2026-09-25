import { Link } from 'react-router';

import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetProductSummaryQuery } from '@/features/products/api/product-catalog-api';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function ProductsDashboardWidget() {
  const { workspace } = useWorkspaceContext();
  const summaryQuery = useGetProductSummaryQuery(workspace.id);
  const summary = summaryQuery.data;

  return (
    <Card>
      <CardHeader className="border-b border-border pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-start gap-2">
              <h2 className="text-lg font-semibold">Favoris Produits</h2>
              <InfoTooltip
                content="Références Produit favorites de votre espace de travail."
                label="À propos des favoris Produits"
              />
            </div>
            {!summaryQuery.isLoading && !summaryQuery.isError && (
              <p className="mt-1 text-sm text-muted-foreground">
                {summary?.activeCatalogEntries ?? 0} référence
                {(summary?.activeCatalogEntries ?? 0) === 1 ? '' : 's'} active
                {(summary?.activeCatalogEntries ?? 0) === 1 ? '' : 's'}
              </p>
            )}
          </div>

          {!summaryQuery.isLoading && !summaryQuery.isError && (
            <Link
              className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              to={'/workspaces/' + workspace.id + '/products'}
            >
              Ouvrir les Produits
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {summaryQuery.isLoading ? (
          <div aria-live="polite" className="space-y-3" role="status">
            <span className="sr-only">Chargement des favoris Produits…</span>
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-56" />
          </div>
        ) : summaryQuery.isError ? (
          <ErrorState
            className="p-0"
            description="Les indicateurs des favoris Produits n’ont pas pu être chargés."
            onRetry={summaryQuery.refetch}
            title="Référentiel indisponible"
          />
        ) : (
          <div className="rounded-lg border border-border p-4">
            <p className="text-2xl font-semibold">
              {summary?.activeCatalogEntries ?? 0}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Références actives
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { ProductsDashboardWidget };
