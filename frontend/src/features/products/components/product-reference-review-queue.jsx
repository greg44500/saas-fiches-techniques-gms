import { Eye } from 'lucide-react';
import { useEffect } from 'react';

import { DataPagination } from '@/components/data-display/data-pagination';
import {
  DataTable,
  DataTableActions,
} from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  useListProductReferenceReviewQueueQuery,
} from '@/features/products/api/product-reference-api';

function ProductReferenceReviewQueue({
  metadata,
  onExamine,
  page,
  pageSize,
  setPage,
  setPageSize,
}) {
  const query = useListProductReferenceReviewQueueQuery({
    origins: 'omit',
    page,
    limit: pageSize,
  });

  useEffect(() => {
    const totalPages = query.data?.pagination?.totalPages ?? 0;

    if (totalPages === 0 && page !== 1) {
      setPage(1);
      return;
    }

    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [
    page,
    query.data?.pagination?.totalPages,
    setPage,
  ]);

  const characteristicKindLabel = (value) => (
    (metadata?.productCharacteristicKinds ?? [])
      .find((item) => item.value === value)?.label
    ?? value
  );

  const dataTypeLabel = (item) => {
    if (item.dataType === 'PRODUCT') return 'Produit';
    if (item.dataType === 'REFERENCE') return 'Référence';

    if (item.dimensionType === 'VARIETY') {
      return 'Dimension · Variété';
    }

    if (item.characteristicKind) {
      return 'Dimension · '
        + characteristicKindLabel(item.characteristicKind);
    }

    return 'Dimension';
  };

  const contextLabel = (item) => {
    if (item.dataType === 'PRODUCT') {
      return 'Nouveau Produit';
    }

    return item.product?.name ?? 'Produit indisponible';
  };

  const columns = [
    {
      id: 'type',
      header: 'Type',
      cell: (item) => (
        <span className="font-medium">
          {dataTypeLabel(item)}
        </span>
      ),
    },
    {
      id: 'value',
      header: 'Donnée à valider',
      cell: (item) => (
        <div className="space-y-1.5">
          <p className="font-medium">{item.value}</p>
          <StatusBadge
            tone="warning"
          >
            {(item.candidates ?? []).length > 0
              ? 'Rapprochement à vérifier'
              : 'À contrôler'}
          </StatusBadge>
        </div>
      ),
    },
    {
      id: 'context',
      header: 'Contexte',
      cell: (item) => (
        <span>{contextLabel(item)}</span>
      ),
    },
    {
      id: 'matching',
      header: 'Rapprochement',
      cell: (item) => {
        const candidates = item.candidates ?? [];

        if (candidates.length === 0) {
          return (
            <span className="text-sm text-muted-foreground">
              Aucun rapprochement détecté
            </span>
          );
        }

        return (
          <div className="space-y-1">
            {candidates.slice(0, 3).map((candidate) => (
              <p className="text-sm font-medium" key={candidate.id}>
                {candidate.name}
              </p>
            ))}
            {candidates.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{candidates.length - 3} autre(s)
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Action',
      cell: (item) => (
        <DataTableActions>
          <ActionIconButton
            Icon={Eye}
            label={'Examiner ' + item.value}
            onClick={() => onExamine(item)}
            tooltipLabel="Examiner"
            variant="outline"
          />
        </DataTableActions>
      ),
    },
  ];

  const summary = query.data?.summary ?? {
    total: 0,
    productCount: 0,
    referenceCount: 0,
    dimensionCount: 0,
  };

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">À contrôler</h2>
            {summary.total > 0 && (
              <StatusBadge tone="warning">
                {summary.total}
              </StatusBadge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Données du référentiel qui nécessitent une validation humaine.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          {summary.productCount} Produit(s)
          {' · '}
          {summary.referenceCount} Référence(s)
          {' · '}
          {summary.dimensionCount} Dimension(s)
        </p>
      </div>

      {query.isLoading && query.data === undefined ? (
        <p className="p-5 text-sm text-muted-foreground">
          Chargement des données à contrôler…
        </p>
      ) : query.isError ? (
        <ErrorState
          description="La liste des données à contrôler n’a pas pu être chargée."
          onRetry={query.refetch}
          title="Contrôles indisponibles"
        />
      ) : (
        <>
          <DataTable
            caption="Données Produit à contrôler"
            columns={columns}
            data={query.data?.items ?? []}
            emptyContent={(
              <EmptyState
                className="p-0"
                description="Aucune donnée du référentiel n’attend de validation."
                title="Rien à contrôler"
              />
            )}
            getRowKey={(item) => item.id}
            rowClassName="transition-colors hover:bg-muted/50"
          />
          <div className="px-5 pb-5">
            <DataPagination
              ariaLabel="Pagination des données à contrôler"
              disabled={query.isFetching}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              page={page}
              pageSize={pageSize}
              pagination={query.data?.pagination}
            />
          </div>
        </>
      )}
    </section>
  );
}

export { ProductReferenceReviewQueue };
