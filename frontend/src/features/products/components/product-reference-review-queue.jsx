import { CircleCheck, Eye } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DataPagination } from '@/components/data-display/data-pagination';
import {
  DataTable,
  DataTableActions,
} from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useListProductReferenceReviewQueueQuery,
  useReviewProductReferenceContributionMutation,
  useReviewProductReferenceDimensionMutation,
} from '@/features/products/api/product-reference-api';
import {
  getApiErrorMessage,
} from '@/features/products/lib/product-presentation';

const ALL_REVIEW_TYPES = '__ALL_REVIEW_TYPES__';
const ALL_REVIEW_ORIGINS = '__ALL_REVIEW_ORIGINS__';

function ProductReferenceReviewQueue({
  canManage,
  metadata,
  onOpenProduct,
  page,
  pageSize,
  setPage,
  setPageSize,
}) {
  const { toast } = useToast();
  const [type, setType] = useState(ALL_REVIEW_TYPES);
  const [workspaceId, setWorkspaceId] = useState(ALL_REVIEW_ORIGINS);

  const query = useListProductReferenceReviewQueueQuery({
    type: type === ALL_REVIEW_TYPES ? undefined : type,
    workspaceId:
      workspaceId === ALL_REVIEW_ORIGINS ? undefined : workspaceId,
    page,
    limit: pageSize,
  });
  const [reviewContribution, reviewContributionState] =
    useReviewProductReferenceContributionMutation();
  const [reviewDimension, reviewDimensionState] =
    useReviewProductReferenceDimensionMutation();

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

  const typeItems = useMemo(() => [
    { value: ALL_REVIEW_TYPES, label: 'Tous les types' },
    ...(metadata?.productReviewQueueTypes ?? []),
  ], [metadata?.productReviewQueueTypes]);

  const originItems = useMemo(() => [
    { value: ALL_REVIEW_ORIGINS, label: 'Tous les espaces de travail' },
    ...(query.data?.origins ?? []).map((origin) => ({
      value: origin.id,
      label: origin.name + ' (' + origin.count + ')',
    })),
  ], [query.data?.origins]);

  const contributionTypeLabel = (value) => (
    (metadata?.productContributionTypes ?? [])
      .find((item) => item.value === value)?.label
    ?? value
  );

  const characteristicKindLabel = (value) => (
    (metadata?.productCharacteristicKinds ?? [])
      .find((item) => item.value === value)?.label
    ?? value
  );

  const queueTypeLabel = (value) => (
    (metadata?.productReviewQueueTypes ?? [])
      .find((item) => item.value === value)?.label
    ?? value
  );

  const itemDetailLabel = (item) => {
    if (item.type === 'CONTRIBUTION') {
      const base = contributionTypeLabel(item.contributionType);
      return item.characteristicKind
        ? base + ' · ' + characteristicKindLabel(item.characteristicKind)
        : base;
    }

    if (item.dimensionType === 'VARIETY') return 'Variété';
    if (item.characteristicKind) {
      return 'Caractéristique · '
        + characteristicKindLabel(item.characteristicKind);
    }
    return 'Caractéristique';
  };

  const authorLabel = (item) => (
    [
      item.author?.firstName,
      item.author?.lastName,
    ].filter(Boolean).join(' ')
    || item.author?.email
    || 'Auteur non disponible'
  );

  const productTarget = (item) => {
    const opensDimensions = (
      item.type === 'DIMENSION_REVIEW'
      || (
        item.type === 'CONTRIBUTION'
        && ['VARIETY', 'CHARACTERISTIC'].includes(
          item.contributionType,
        )
      )
    );

    return {
      tab: opensDimensions ? 'dimensions' : 'product',
      dimensionFilter: opensDimensions ? 'pending' : 'active',
    };
  };

  const openRelatedProduct = (item) => {
    if (!item.product?.id) return;
    const target = productTarget(item);
    onOpenProduct(
      item.product.id,
      target.tab,
      target.dimensionFilter,
    );
  };

  async function decideContribution(
    item,
    decision,
    targetReferenceId = null,
  ) {
    try {
      await reviewContribution({
        contributionId: item.sourceId,
        decision,
        ...(targetReferenceId ? { targetReferenceId } : {}),
      }).unwrap();
      toast({
        title: decision === 'APPROVE'
          ? 'Contribution approuvée'
          : decision === 'MERGE'
            ? 'Contribution fusionnée'
            : 'Contribution refusée',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Décision impossible',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  async function markDimensionReviewed(item) {
    try {
      await reviewDimension({
        productId: item.productId,
        dimensionType: item.dimensionType,
        dimensionId: item.sourceId,
      }).unwrap();
      toast({
        title: 'Valeur marquée comme vérifiée',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Revue impossible',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  const columns = [
    {
      id: 'value',
      header: 'Élément',
      cell: (item) => (
        <div>
          <p className="font-medium">{item.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {queueTypeLabel(item.type)}
            {' · '}
            {itemDetailLabel(item)}
          </p>
        </div>
      ),
    },
    {
      id: 'product',
      header: 'Produit',
      cell: (item) => (
        item.product ? (
          <button
            className="rounded-sm text-left font-medium underline underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => openRelatedProduct(item)}
            type="button"
          >
            {item.product.name}
          </button>
        ) : 'Produit indisponible'
      ),
    },
    {
      id: 'origin',
      header: 'Origine',
      cell: (item) => (
        <div>
          <p>{item.workspace?.name ?? 'Espace de travail indisponible'}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {authorLabel(item)}
          </p>
        </div>
      ),
    },
    {
      id: 'since',
      header: 'Depuis',
      cell: (item) => (
        item.createdAt
          ? new Date(item.createdAt).toLocaleDateString('fr-FR')
          : 'Date indisponible'
      ),
    },
    {
      id: 'reason',
      header: 'Motif',
      cell: (item) => (
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            {item.type === 'CONTRIBUTION'
              ? item.reasons?.[0]?.message ?? 'Revue de contribution requise.'
              : 'Nouvelle valeur à vérifier.'}
          </p>
          {item.type === 'CONTRIBUTION'
            && (item.candidates ?? []).length > 0 && (
            <p className="text-xs">
              Valeurs proches : {(item.candidates ?? [])
                .map((candidate) => candidate.name)
                .join(', ')}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (item) => (
        <DataTableActions>
          {canManage && item.type === 'CONTRIBUTION' && (
            <>
              <Button
                disabled={reviewContributionState.isLoading}
                onClick={() => decideContribution(item, 'APPROVE')}
                size="sm"
                type="button"
              >
                Approuver
              </Button>
              {(item.candidates ?? []).map((candidate) => (
                <Button
                  disabled={reviewContributionState.isLoading}
                  key={candidate.id}
                  onClick={() => decideContribution(
                    item,
                    'MERGE',
                    candidate.id,
                  )}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Fusionner avec {candidate.name}
                </Button>
              ))}
              <Button
                disabled={reviewContributionState.isLoading}
                onClick={() => decideContribution(item, 'REJECT')}
                size="sm"
                type="button"
                variant="outline"
              >
                Refuser
              </Button>
            </>
          )}

          {canManage && item.type === 'DIMENSION_REVIEW' && (
            <ActionIconButton
              disabled={reviewDimensionState.isLoading}
              Icon={CircleCheck}
              label={'Marquer ' + item.value + ' comme vérifiée'}
              onClick={() => markDimensionReviewed(item)}
              tooltipLabel="Marquer comme vérifiée"
              variant="outline"
            />
          )}

          {item.product && (
            <ActionIconButton
              Icon={Eye}
              label={'Examiner ' + item.value}
              onClick={() => openRelatedProduct(item)}
              tooltipLabel="Examiner"
              variant="outline"
            />
          )}
        </DataTableActions>
      ),
    },
  ];

  const summary = query.data?.summary ?? {
    total: 0,
    contributionCount: 0,
    dimensionReviewCount: 0,
  };

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="space-y-4 border-b border-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
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
              Éléments du référentiel qui nécessitent encore une intervention.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {summary.contributionCount} contribution(s)
            {' · '}
            {summary.dimensionReviewCount} valeur(s) à vérifier
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Select
            items={typeItems}
            onValueChange={(value) => {
              setType(value);
              setWorkspaceId(ALL_REVIEW_ORIGINS);
              setPage(1);
            }}
            value={type}
          >
            <SelectTrigger aria-label="Filtrer les éléments à contrôler par type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={originItems}
            onValueChange={(value) => {
              setWorkspaceId(value);
              setPage(1);
            }}
            value={workspaceId}
          >
            <SelectTrigger aria-label="Filtrer les éléments à contrôler par origine">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {originItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isLoading && query.data === undefined ? (
        <p className="p-5 text-sm text-muted-foreground">
          Chargement des éléments à contrôler…
        </p>
      ) : query.isError ? (
        <ErrorState
          description="La file des éléments à contrôler n’a pas pu être chargée."
          onRetry={query.refetch}
          title="File indisponible"
        />
      ) : (
        <>
          <DataTable
            caption="Éléments Produit à contrôler"
            columns={columns}
            data={query.data?.items ?? []}
            emptyContent={(
              <EmptyState
                className="p-0"
                description="Aucune intervention n’est nécessaire avec ces filtres."
                title="Rien à contrôler"
              />
            )}
            getRowKey={(item) => item.id}
            rowClassName="transition-colors hover:bg-muted/50"
          />
          <div className="px-5 pb-5">
            <DataPagination
              ariaLabel="Pagination des éléments à contrôler"
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

export {
  ALL_REVIEW_ORIGINS,
  ALL_REVIEW_TYPES,
  ProductReferenceReviewQueue,
};
