import { useEffect, useMemo, useState } from 'react';
import { Archive, Eye, FileUp, Pencil, Plus, RotateCcw } from 'lucide-react';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { StatusBadge } from '@/components/shared/status-badge';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  useGetProductReferenceMetadataQuery,
  useListProductReferenceContributionsQuery,
  useListProductReferenceProductsQuery,
  useListProductReferenceReviewQueueQuery,
  useUpdateProductReferenceCategoryStatusMutation,
} from '@/features/products/api/product-reference-api';
import { ProductCreateDialog } from '@/features/products/components/product-create-dialog';
import { ProductImportDialog } from '@/features/products/components/product-import-dialog';
import { ProductReferenceCategoryDialog } from '@/features/products/components/product-reference-category-dialog';
import { ProductReferenceDetailsDrawer } from '@/features/products/components/product-reference-details-drawer';
import {
  ProductReferenceReviewQueue,
} from '@/features/products/components/product-reference-review-queue';
import {
  ProductReferenceSearchAutocomplete,
} from '@/features/products/components/product-reference-search-autocomplete';
import {
  getApiErrorMessage,
  getCategoryStatusLabel,
  getConservationTypeLabel,
  getVariantLabel,
} from '@/features/products/lib/product-presentation';
import {
  useListGlobalIndicativePricesQuery,
} from '@/features/suppliers/api/supplier-api';
import {
  formatPrice,
} from '@/features/suppliers/lib/supplier-presentation';
import { useDataPagination } from '@/hooks/use-data-pagination';

const ALL_REFERENCE_CATEGORIES = '__ALL__';
const ALL_REVIEWED_CONTRIBUTIONS = '__ALL_REVIEWED__';

function ProductReferencePage({ canManage }) {
  const { toast } = useToast();
  const { page, pageSize, setPage, setPageSize } = useDataPagination();
  const [section, setSection] = useState('reference');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState(ALL_REFERENCE_CATEGORIES);
  const [referenceStatus, setReferenceStatus] = useState('ACTIVE');
  const [contributionStatus, setContributionStatus] =
    useState(ALL_REVIEWED_CONTRIBUTIONS);
  const [drawerState, setDrawerState] = useState({
    open: false,
    productId: null,
    initialTab: 'product',
    initialDimensionFilter: 'active',
    initialReferenceFilter: 'all',
    reviewContext: null,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [categoryDialog, setCategoryDialog] = useState({ open: false, category: null });
  const [categoryLifecycle, setCategoryLifecycle] = useState(null);

  const metadataQuery = useGetProductReferenceMetadataQuery();
  const metadata = metadataQuery.data;
  const productsQuery = useListProductReferenceProductsQuery(
    {
      status: referenceStatus,
      categoryId: categoryId === ALL_REFERENCE_CATEGORIES ? undefined : categoryId,
      q: search || undefined,
      page: section === 'reference' ? page : 1,
      limit: section === 'reference' ? pageSize : 1,
    },
    { skip: false },
  );
  const globalPricesQuery = useListGlobalIndicativePricesQuery(
    {
      status: 'ACTIVE',
    },
    {
      skip: section !== 'reference',
    },
  );
  const globalPriceByVariantId = useMemo(
    () => new Map(
      (globalPricesQuery.data ?? []).map((price) => [
        price.productVariant.id,
        price,
      ]),
    ),
    [globalPricesQuery.data],
  );

  const reviewQueueCountQuery = useListProductReferenceReviewQueueQuery(
    {
      origins: 'omit',
      page: 1,
      limit: 1,
    },
    { skip: false },
  );

  const contributionsQuery = useListProductReferenceContributionsQuery(
    {
      status: contributionStatus === ALL_REVIEWED_CONTRIBUTIONS
        ? undefined
        : contributionStatus,
      reviewedOnly:
        contributionStatus === ALL_REVIEWED_CONTRIBUTIONS,
      page: section === 'history' ? page : 1,
      limit: section === 'history' ? pageSize : 1,
    },
    { skip: section !== 'history' },
  );
  const [updateCategoryStatus, categoryStatusState] =
    useUpdateProductReferenceCategoryStatusMutation();

  useEffect(() => {
    const totalPages = section === 'reference'
      ? productsQuery.data?.pagination?.totalPages
      : section === 'history'
        ? contributionsQuery.data?.pagination?.totalPages
        : null;

    if (totalPages === 0 && page !== 1) {
      setPage(1);
      return;
    }

    if (totalPages && page > totalPages) setPage(totalPages);
  }, [
    contributionsQuery.data?.pagination?.totalPages,
    page,
    productsQuery.data?.pagination?.totalPages,
    section,
    setPage,
  ]);

  const categoryItems = useMemo(() => [
    { value: ALL_REFERENCE_CATEGORIES, label: 'Toutes les catégories' },
    ...(metadata?.categories ?? [])
      .filter((category) => category.status === 'ACTIVE')
      .map((category) => ({
        value: category.id,
        label: category.name,
      })),
  ], [metadata?.categories]);

  const referenceStatusItems = useMemo(
    () => (metadata?.productStatuses ?? []).filter(({ value }) =>
      ['ACTIVE', 'ARCHIVED'].includes(value)),
    [metadata?.productStatuses],
  );

  const historyStatusItems = useMemo(() => [
    {
      value: ALL_REVIEWED_CONTRIBUTIONS,
      label: 'Toutes les décisions',
    },
    ...(metadata?.productContributionStatuses ?? [])
      .filter(({ value }) => value !== 'PENDING_REVIEW')
      .map((item) => (
        item.value === 'APPROVED'
          ? {
              ...item,
              label: 'Approuvées ou fusionnées',
            }
          : item
      )),
  ], [metadata?.productContributionStatuses]);

  const referenceCount = productsQuery.data?.pagination?.total ?? 0;
  const reviewCount = reviewQueueCountQuery.data?.summary?.total ?? 0;
  const categoryCount = metadata?.categories?.length ?? 0;

  function changeSection(nextSection) {
    setSection(nextSection);
    setPage(1);
    setSearch('');
    setSearchInput('');
    setCategoryId(ALL_REFERENCE_CATEGORIES);
    setReferenceStatus('ACTIVE');
    setContributionStatus(ALL_REVIEWED_CONTRIBUTIONS);
  }

  function applySearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function selectSearchSuggestion(_result, nextSearch) {
    setSearchInput(nextSearch);
    setSearch(nextSearch);
    setPage(1);
  }

  function openProduct(
    productId,
    initialTab = 'product',
    initialDimensionFilter = 'active',
    initialReferenceFilter = 'all',
    reviewContext = null,
  ) {
    setDrawerState({
      open: true,
      productId,
      initialTab,
      initialDimensionFilter,
      initialReferenceFilter,
      reviewContext,
    });
  }

  function examineReviewItem(item) {
    if (!item.productId) return;

    if (item.dataType === 'REFERENCE') {
      openProduct(
        item.productId,
        'variants',
        'active',
        'pending',
        item,
      );
      return;
    }

    if (item.dataType === 'DIMENSION') {
      openProduct(
        item.productId,
        'dimensions',
        'pending',
        'all',
        item,
      );
      return;
    }

    openProduct(
      item.productId,
      'product',
      'active',
      'all',
      item,
    );
  }

  function openCategoryProducts(category) {
    setSection('reference');
    setSearch('');
    setSearchInput('');
    setCategoryId(category.id);
    setReferenceStatus('ACTIVE');
    setContributionStatus(ALL_REVIEWED_CONTRIBUTIONS);
    setPage(1);
  }


  async function confirmCategoryLifecycle() {
    const category = categoryLifecycle;
    if (!category) return;

    const nextStatus = category.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    try {
      await updateCategoryStatus({
        categoryId: category.id,
        status: nextStatus,
      }).unwrap();
      setCategoryLifecycle(null);
      toast({
        title: nextStatus === 'ARCHIVED'
          ? 'Catégorie archivée'
          : 'Catégorie réactivée',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Action impossible',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  const productColumns = [
    {
      id: 'name',
      header: 'Produit',
      cell: (product) => {
        const pendingDimensionCount =
          product.dimensionReview?.pendingCount ?? 0;

        return (
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={(
                  <button
                    aria-label={'Références Produit de ' + product.name}
                    className="rounded-sm text-left font-medium underline decoration-dotted underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    type="button"
                  />
                )}
              >
                {product.name}
              </TooltipTrigger>
              <TooltipContent align="start" className="max-w-80">
                <div className="space-y-2">
                  <p className="font-medium">Références Produit</p>
                  {product.variants?.length ? (
                    <ul className="space-y-1.5">
                      {product.variants.map((variant) => {
                        const details = [
                          variant.conservationType
                            ? getConservationTypeLabel(
                              metadata,
                              variant.conservationType,
                            )
                            : null,
                          variant.status === 'ARCHIVED' ? 'Archivée' : null,
                        ].filter(Boolean);

                        return (
                          <li key={variant.id}>
                            <span className="font-medium">
                              {getVariantLabel(variant)}
                            </span>
                            {details.length > 0 && (
                              <span className="opacity-80">
                                {' · ' + details.join(' · ')}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p>Aucune Référence Produit exploitable</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>

            {pendingDimensionCount > 0 && (
              <Tooltip>
                <TooltipTrigger
                  render={(
                    <button
                      aria-label={
                        'Vérifier '
                        + pendingDimensionCount
                        + ' nouvelles valeurs de '
                        + product.name
                      }
                      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => openProduct(product.id, 'dimensions', 'pending')}
                      type="button"
                    />
                  )}
                >
                  <StatusBadge
                    className="min-w-6 justify-center px-1.5 py-0.5"
                    tone="warning"
                  >
                    {pendingDimensionCount}
                  </StatusBadge>
                </TooltipTrigger>
                <TooltipContent>
                  {pendingDimensionCount}{' '}
                  {pendingDimensionCount > 1
                    ? 'nouvelles valeurs à vérifier'
                    : 'nouvelle valeur à vérifier'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      id: 'category',
      header: 'Catégorie',
      cell: (product) => product.category?.name ?? 'Catégorie non renseignée',
    },
    {
      id: 'referencePrice',
      header: 'Prix repère',
      cell: (product) => {
        const activeVariants = (product.variants ?? []).filter(
          (variant) => variant.status === 'ACTIVE',
        );

        if (activeVariants.length === 0) return '—';

        if (activeVariants.length === 1) {
          const price = globalPriceByVariantId.get(activeVariants[0].id);
          return price
            ? formatPrice(price, { hideDefaultCurrency: true })
            : 'Non renseigné';
        }

        const pricedCount = activeVariants.filter(
          (variant) => globalPriceByVariantId.has(variant.id),
        ).length;

        return pricedCount
          + ' / '
          + activeVariants.length
          + ' avec prix repère';
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (product) => (
        <DataTableActions>
          <ActionIconButton
            Icon={Eye}
            label={'Voir ' + product.name}
            onClick={() => openProduct(product.id)}
            tooltipLabel="Voir"
            variant="outline"
          />
        </DataTableActions>
      ),
    },
  ];

  const contributionTypeLabel = (type) => (
    (metadata?.productContributionTypes ?? [])
      .find(({ value }) => value === type)?.label
    ?? type
  );
  const contributionStatusLabel = (status) => (
    (metadata?.productContributionStatuses ?? [])
      .find(({ value }) => value === status)?.label
    ?? status
  );
  const contributionDecisionLabel = (contribution) => {
    if (contribution.decision === 'MERGE') return 'Fusionnée';
    if (contribution.decision === 'REJECT') return 'Refusée';
    if (contribution.decision === 'APPROVE') return 'Approuvée';
    return contributionStatusLabel(contribution.status);
  };
  const characteristicKindLabel = (kind) => (
    (metadata?.productCharacteristicKinds ?? [])
      .find(({ value }) => value === kind)?.label
    ?? kind
  );

  const historyContributionColumns = [
    {
      id: 'value',
      header: 'Proposition',
      cell: (contribution) => (
        <div>
          <p className="font-medium">{contribution.proposedValue}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {contributionTypeLabel(contribution.type)}
            {contribution.characteristicKind
              ? ' · ' + characteristicKindLabel(contribution.characteristicKind)
              : ''}
          </p>
        </div>
      ),
    },
    {
      id: 'origin',
      header: 'Origine',
      cell: (contribution) => (
        <div>
          <p>{contribution.workspace?.name ?? 'Workspace'}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {[
              contribution.author?.firstName,
              contribution.author?.lastName,
            ].filter(Boolean).join(' ')
              || contribution.author?.email
              || 'Auteur non disponible'}
          </p>
        </div>
      ),
    },
    {
      id: 'decision',
      header: 'Décision',
      cell: (contribution) => (
        <StatusBadge tone="neutral">
          {contributionDecisionLabel(contribution)}
        </StatusBadge>
      ),
    },
    {
      id: 'reviewedAt',
      header: 'Traitée le',
      cell: (contribution) => (
        <div>
          <p>
            {contribution.reviewedAt
              ? new Date(contribution.reviewedAt)
                .toLocaleDateString('fr-FR')
              : 'Date indisponible'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {[
              contribution.reviewer?.firstName,
              contribution.reviewer?.lastName,
            ].filter(Boolean).join(' ')
              || contribution.reviewer?.email
              || 'Gestionnaire non disponible'}
          </p>
        </div>
      ),
    },
    {
      id: 'reason',
      header: 'Motif',
      cell: (contribution) => (
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{contribution.reasons?.[0]?.message ?? 'Aucun motif'}</p>
          {(contribution.candidates ?? []).length > 0 && (
            <p className="text-xs">
              Valeurs proches : {(contribution.candidates ?? [])
                .map((candidate) => candidate.name)
                .join(', ')}
            </p>
          )}
        </div>
      ),
    },
  ];

  const categoryColumns = [
    {
      id: 'name',
      header: 'Catégorie',
      cell: (category) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{category.name}</span>
          {category.status === 'ARCHIVED' && (
            <StatusBadge tone="neutral">
              {getCategoryStatusLabel(metadata, category.status)}
            </StatusBadge>
          )}
        </div>
      ),
    },
    {
      id: 'activeProducts',
      header: 'Produits actifs',
      cell: (category) => {
        const activeProductCount = category.activeProductCount ?? 0;

        if (activeProductCount === 0) {
          return <span>0</span>;
        }

        return (
          <button
            aria-label={'Voir les Produits actifs de ' + category.name}
            className="rounded-sm font-medium underline underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => openCategoryProducts(category)}
            type="button"
          >
            {activeProductCount}
          </button>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (category) => (
        canManage ? (
          <DataTableActions>
            <ActionIconButton
              Icon={Pencil}
              label={'Renommer ' + category.name}
              onClick={() => setCategoryDialog({ open: true, category })}
              tooltipLabel="Renommer"
              variant="outline"
            />
            <ActionIconButton
              Icon={category.status === 'ACTIVE' ? Archive : RotateCcw}
              label={
                (category.status === 'ACTIVE' ? 'Archiver ' : 'Réactiver ')
                + category.name
              }
              onClick={() => setCategoryLifecycle(category)}
              tooltipLabel={
                category.status === 'ACTIVE' ? 'Archiver' : 'Réactiver'
              }
              variant="outline"
            />
          </DataTableActions>
        ) : null
      ),
    },
  ];

  const initialLoading = (
    metadataQuery.isLoading
    || (
      section === 'reference'
      && (
        (
          globalPricesQuery.isLoading
          && globalPricesQuery.data === undefined
        )
        || (
          productsQuery.isLoading
          && productsQuery.data === undefined
        )
      )
    )
    || (
      section === 'history'
      && contributionsQuery.isLoading
      && contributionsQuery.data === undefined
    )
  );
  const hasError = metadataQuery.isError
    || (
      section === 'reference'
      && (
        globalPricesQuery.isError
        || productsQuery.isError
      )
    )
    || (section === 'history' && contributionsQuery.isError);

  function retry() {
    metadataQuery.refetch();
    if (section === 'reference') {
      globalPricesQuery.refetch();
      productsQuery.refetch();
    }
    if (section === 'history') contributionsQuery.refetch();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Référentiel Produits</h1>
          <InfoTooltip
            content="Alimentez et maintenez le référentiel Produit commun. Cette autorité métier est indépendante des rôles Platform."
            label="À propos du référentiel Produits"
          />
        </div>

        {canManage && (
          <div className="flex flex-wrap gap-2">
            {section === 'reference' && (
              <>
                <Button onClick={() => setCreateOpen(true)} type="button">
                  <Plus aria-hidden="true" className="size-4" />
                  Créer un Produit
                </Button>
                <Button
                  onClick={() => setImportOpen(true)}
                  type="button"
                  variant="outline"
                >
                  <FileUp aria-hidden="true" className="size-4" />
                  Importer
                </Button>
              </>
            )}
            {section === 'categories' && (
              <Button
                onClick={() => setCategoryDialog({ open: true, category: null })}
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                Créer une catégorie
              </Button>
            )}
          </div>
        )}
      </header>

      <Tabs onValueChange={changeSection} value={section}>
        <TabsList aria-label="Administration du référentiel Produits" variant="section">
          <TabsTrigger value="reference" variant="section">
            Référentiel ({referenceCount})
          </TabsTrigger>
          <TabsTrigger value="review" variant="section">
            À contrôler ({reviewCount})
          </TabsTrigger>
          <TabsTrigger value="history" variant="section">
            Historique
          </TabsTrigger>
          <TabsTrigger value="categories" variant="section">
            Catégories ({categoryCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {section === 'reference' && (
        <section className="rounded-xl border border-border bg-card">
          <div className="grid gap-3 border-b border-border p-5 xl:grid-cols-[minmax(260px,1fr)_240px_220px]">
            <form className="flex gap-2" onSubmit={applySearch}>
              <div className="min-w-0 flex-1">
                <ProductReferenceSearchAutocomplete
                  categoryId={
                    categoryId === ALL_REFERENCE_CATEGORIES
                      ? undefined
                      : categoryId
                  }
                  metadata={metadata}
                  onSelect={selectSearchSuggestion}
                  onValueChange={setSearchInput}
                  status={referenceStatus}
                  value={searchInput}
                />
              </div>
              <Button type="submit" variant="outline">Rechercher</Button>
            </form>

            <Select
              items={categoryItems}
              onValueChange={(value) => {
                setCategoryId(value);
                setPage(1);
              }}
              value={categoryId}
            >
              <SelectTrigger aria-label="Filtrer par catégorie">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              items={referenceStatusItems}
              onValueChange={(value) => {
                setReferenceStatus(value);
                setPage(1);
              }}
              value={referenceStatus}
            >
              <SelectTrigger aria-label="Filtrer par statut du référentiel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {referenceStatusItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {initialLoading ? (
            <p className="p-5 text-sm text-muted-foreground">Chargement du référentiel…</p>
          ) : hasError ? (
            <ErrorState
              description="Le référentiel Produits n’a pas pu être chargé."
              onRetry={retry}
              title="Produits indisponibles"
            />
          ) : (
            <>
              <DataTable
                caption="Référentiel Produits global"
                columns={productColumns}
                data={productsQuery.data?.products ?? []}
                emptyContent={(
                  <EmptyState
                    className="p-0"
                    description="Aucun Produit ne correspond aux critères."
                    title="Aucun Produit"
                  />
                )}
                getRowKey={(product) => product.id}
                rowClassName="transition-colors hover:bg-muted/50"
              />
              <div className="px-5 pb-5">
                <DataPagination
                  ariaLabel="Pagination du référentiel Produits"
                  disabled={productsQuery.isFetching}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  page={page}
                  pageSize={pageSize}
                  pagination={productsQuery.data?.pagination}
                />
              </div>
            </>
          )}
        </section>
      )}

      {section === 'review' && (
        <ProductReferenceReviewQueue
          metadata={metadata}
          onExamine={examineReviewItem}
          page={page}
          pageSize={pageSize}
          setPage={setPage}
          setPageSize={setPageSize}
        />
      )}

      {section === 'history' && (
        <section className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="font-semibold">Historique des contributions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Consultez les décisions déjà prises sur les contributions Produit.
              </p>
            </div>
            <Select
              items={historyStatusItems}
              onValueChange={(value) => {
                setContributionStatus(value);
                setPage(1);
              }}
              value={contributionStatus}
            >
              <SelectTrigger aria-label="Filtrer l’historique par décision">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {historyStatusItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {initialLoading ? (
            <p className="p-5 text-sm text-muted-foreground">
              Chargement de l’historique…
            </p>
          ) : hasError ? (
            <ErrorState
              description="L’historique des contributions n’a pas pu être chargé."
              onRetry={retry}
              title="Historique indisponible"
            />
          ) : (
            <>
              <DataTable
                caption="Historique des contributions Produit"
                columns={historyContributionColumns}
                data={contributionsQuery.data?.contributions ?? []}
                emptyContent={(
                  <EmptyState
                    className="p-0"
                    description="Aucune contribution ne correspond à cette décision."
                    title="Aucun historique"
                  />
                )}
                getRowKey={(contribution) => contribution.id}
                rowClassName="transition-colors hover:bg-muted/50"
              />
              <div className="px-5 pb-5">
                <DataPagination
                  ariaLabel="Pagination de l’historique des contributions"
                  disabled={contributionsQuery.isFetching}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  page={page}
                  pageSize={pageSize}
                  pagination={contributionsQuery.data?.pagination}
                />
              </div>
            </>
          )}
        </section>
      )}

      {section === 'categories' && (
        <section className="rounded-xl border border-border bg-card">
          {initialLoading ? (
            <p className="p-5 text-sm text-muted-foreground">Chargement des catégories…</p>
          ) : metadataQuery.isError ? (
            <ErrorState
              description="Les catégories Produit n’ont pas pu être chargées."
              onRetry={metadataQuery.refetch}
              title="Catégories indisponibles"
            />
          ) : (
            <DataTable
              caption="Catégories Produit"
              columns={categoryColumns}
              data={metadata?.categories ?? []}
              emptyContent={(
                <EmptyState
                  className="p-0"
                  description="Créez la première catégorie du référentiel Produit."
                  title="Aucune catégorie"
                />
              )}
              getRowKey={(category) => category.id}
              rowClassName="transition-colors hover:bg-muted/50"
            />
          )}
        </section>
      )}

      <ProductReferenceDetailsDrawer
        canManage={canManage}
        metadata={metadata}
        initialDimensionFilter={drawerState.initialDimensionFilter}
        initialReferenceFilter={drawerState.initialReferenceFilter}
        initialTab={drawerState.initialTab}
        reviewContext={drawerState.reviewContext}
        onClose={() => setDrawerState((current) => ({
          ...current,
          open: false,
          reviewContext: null,
        }))}
        open={drawerState.open}
        productId={drawerState.productId}
      />

      <ProductCreateDialog
        metadata={metadata}
        mode="global"
        onClose={() => setCreateOpen(false)}
        onCreated={(result) => {
          setCreateOpen(false);
          toast({
            title: 'Produit créé dans le référentiel',
            description: result?.product?.name,
            variant: 'success',
          });
          if (result?.product?.id) openProduct(result.product.id);
        }}
        onUseExisting={(productId) => {
          setCreateOpen(false);
          openProduct(productId);
        }}
        open={createOpen}
      />

      <ProductImportDialog
        metadata={metadata}
        mode="global"
        onClose={() => setImportOpen(false)}
        onCommitted={(result) => {
          toast({
            title: 'Import du référentiel terminé',
            description: String(result?.succeeded ?? 0) + ' ligne(s) traitée(s).',
            variant: 'success',
          });
        }}
        open={importOpen}
      />

      <ProductReferenceCategoryDialog
        category={categoryDialog.category}
        onClose={() => setCategoryDialog({ open: false, category: null })}
        onSaved={() => {
          setCategoryDialog({ open: false, category: null });
          toast({ title: 'Catégorie enregistrée', variant: 'success' });
        }}
        open={categoryDialog.open}
      />

      {categoryLifecycle && (
        <ConfirmationDialog
          confirmLabel={categoryLifecycle.status === 'ACTIVE' ? 'Archiver' : 'Réactiver'}
          confirmVariant={categoryLifecycle.status === 'ACTIVE' ? 'destructive' : 'default'}
          description={
            categoryLifecycle.status === 'ACTIVE'
              ? 'Une catégorie utilisée par un Produit actif ne peut pas être archivée.'
              : 'La catégorie redeviendra disponible pour les Produits.'
          }
          onCancel={() => setCategoryLifecycle(null)}
          onConfirm={confirmCategoryLifecycle}
          open
          pending={categoryStatusState.isLoading}
          title={
            categoryLifecycle.status === 'ACTIVE'
              ? 'Archiver la catégorie ?'
              : 'Réactiver la catégorie ?'
          }
        />
      )}
    </div>
  );
}

export { ALL_REFERENCE_CATEGORIES, ProductReferencePage };
