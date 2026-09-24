import { useEffect, useMemo, useState } from 'react';
import { Eye, FileUp, Pencil, Plus } from 'lucide-react';

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
import { Input } from '@/components/ui/input';
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
  useReviewProductReferenceContributionMutation,
  useUpdateProductReferenceCategoryStatusMutation,
} from '@/features/products/api/product-reference-api';
import { ProductCreateDialog } from '@/features/products/components/product-create-dialog';
import { ProductImportDialog } from '@/features/products/components/product-import-dialog';
import { ProductReferenceCategoryDialog } from '@/features/products/components/product-reference-category-dialog';
import { ProductReferenceDetailsDrawer } from '@/features/products/components/product-reference-details-drawer';
import {
  getApiErrorMessage,
  getCategoryStatusLabel,
  getFoodRangeLabel,
  getFoodRangeName,
  getProductStatusLabel,
  getProductStatusTone,
  getUsageTypeLabel,
  getVariantLabel,
} from '@/features/products/lib/product-presentation';
import { useDataPagination } from '@/hooks/use-data-pagination';

const ALL_REFERENCE_CATEGORIES = '__ALL__';

function ProductReferencePage({ canManage }) {
  const { toast } = useToast();
  const { page, pageSize, setPage, setPageSize } = useDataPagination();
  const [section, setSection] = useState('reference');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState(ALL_REFERENCE_CATEGORIES);
  const [referenceStatus, setReferenceStatus] = useState('ACTIVE');
  const [contributionStatus, setContributionStatus] =
    useState('PENDING_REVIEW');
  const [drawerState, setDrawerState] = useState({ open: false, productId: null });
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
      page,
      limit: pageSize,
    },
    { skip: section !== 'reference' },
  );
  const contributionsQuery = useListProductReferenceContributionsQuery(
    {
      status: contributionStatus,
      page,
      limit: pageSize,
    },
    { skip: section !== 'contributions' },
  );
  const [reviewContribution, reviewContributionState] =
    useReviewProductReferenceContributionMutation();
  const [updateCategoryStatus, categoryStatusState] =
    useUpdateProductReferenceCategoryStatusMutation();

  useEffect(() => {
    const totalPages = section === 'contributions'
      ? contributionsQuery.data?.pagination?.totalPages
      : productsQuery.data?.pagination?.totalPages;
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

  function changeSection(nextSection) {
    setSection(nextSection);
    setPage(1);
    setSearch('');
    setSearchInput('');
    setCategoryId(ALL_REFERENCE_CATEGORIES);
    setReferenceStatus('ACTIVE');
    setContributionStatus('PENDING_REVIEW');
  }

  function applySearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function openProduct(productId) {
    setDrawerState({ open: true, productId });
  }

  async function decideContribution(contribution, decision) {
    try {
      await reviewContribution({
        contributionId: contribution.id,
        decision,
      }).unwrap();
      toast({
        title: decision === 'APPROVE'
          ? 'Contribution approuvée'
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
      cell: (product) => (
        <div>
          <p className="font-medium">{product.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {product.aliases?.length ? product.aliases.join(', ') : 'Aucun synonyme métier'}
          </p>
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Catégorie',
      cell: (product) => product.category?.name ?? 'Catégorie non renseignée',
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (product) => (
        <StatusBadge tone={getProductStatusTone(product.status)}>
          {getProductStatusLabel(metadata, product.status)}
        </StatusBadge>
      ),
    },
    {
      id: 'variants',
      header: 'Déclinaisons',
      cell: (product) => {
        if (!product.variants?.length) {
          return (
            <p className="text-sm text-muted-foreground">
              Aucune déclinaison exploitable
            </p>
          );
        }

        return (
          <div className="space-y-2">
            {product.variants.map((variant) => (
              <div
                className="rounded-md border border-border/70 p-3"
                key={variant.id}
              >
                <p className="font-medium">{getVariantLabel(variant)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[
                    getFoodRangeLabel(metadata, variant.foodRange),
                    getFoodRangeName(metadata, variant.foodRange),
                    variant.usageType
                      ? 'Usage ' + getUsageTypeLabel(metadata, variant.usageType)
                      : null,
                    variant.status === 'ARCHIVED' ? 'Archivée' : null,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
            ))}
          </div>
        );
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
  const characteristicKindLabel = (kind) => (
    (metadata?.productCharacteristicKinds ?? [])
      .find(({ value }) => value === kind)?.label
    ?? kind
  );

  const contributionColumns = [
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
      id: 'status',
      header: 'Statut',
      cell: (contribution) => (
        <StatusBadge
          tone={contribution.status === 'PENDING_REVIEW' ? 'warning' : 'neutral'}
        >
          {contributionStatusLabel(contribution.status)}
        </StatusBadge>
      ),
    },
    {
      id: 'reason',
      header: 'Motif',
      cell: (contribution) => (
        <span className="text-sm text-muted-foreground">
          {contribution.reasons?.[0]?.message ?? 'Aucun motif'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (contribution) => (
        contribution.status === 'PENDING_REVIEW' && canManage ? (
          <DataTableActions>
            <Button
              disabled={reviewContributionState.isLoading}
              onClick={() => decideContribution(contribution, 'APPROVE')}
              size="sm"
              type="button"
            >
              Approuver
            </Button>
            <Button
              disabled={reviewContributionState.isLoading}
              onClick={() => decideContribution(contribution, 'REJECT')}
              size="sm"
              type="button"
              variant="outline"
            >
              Refuser
            </Button>
          </DataTableActions>
        ) : null
      ),
    },
  ];

  const categoryColumns = [
    {
      id: 'name',
      header: 'Catégorie',
      cell: (category) => <span className="font-medium">{category.name}</span>,
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (category) => (
        <StatusBadge tone={category.status === 'ACTIVE' ? 'success' : 'neutral'}>
          {getCategoryStatusLabel(metadata, category.status)}
        </StatusBadge>
      ),
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
            <Button
              onClick={() => setCategoryLifecycle(category)}
              type="button"
              variant="outline"
            >
              {category.status === 'ACTIVE' ? 'Archiver' : 'Réactiver'}
            </Button>
          </DataTableActions>
        ) : null
      ),
    },
  ];

  const initialLoading = (
    metadataQuery.isLoading
    || (
      section === 'reference'
      && productsQuery.isLoading
      && productsQuery.data === undefined
    )
    || (
      section === 'contributions'
      && contributionsQuery.isLoading
      && contributionsQuery.data === undefined
    )
  );
  const hasError = metadataQuery.isError
    || (section === 'reference' && productsQuery.isError)
    || (section === 'contributions' && contributionsQuery.isError);

  function retry() {
    metadataQuery.refetch();
    if (section === 'reference') productsQuery.refetch();
    if (section === 'contributions') contributionsQuery.refetch();
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
          <TabsTrigger value="reference" variant="section">Référentiel</TabsTrigger>
          <TabsTrigger value="contributions" variant="section">Contributions</TabsTrigger>
          <TabsTrigger value="categories" variant="section">Catégories</TabsTrigger>
        </TabsList>
      </Tabs>

      {section === 'reference' && (
        <section className="rounded-xl border border-border bg-card">
          <div className="grid gap-3 border-b border-border p-5 xl:grid-cols-[minmax(260px,1fr)_240px_220px]">
            <form className="flex gap-2" onSubmit={applySearch}>
              <Input
                aria-label="Rechercher un Produit global"
                maxLength={120}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Rechercher un produit…"
                value={searchInput}
              />
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
                caption="Référentiel global"
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

      {section === 'contributions' && (
        <section className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="font-semibold">Contributions au référentiel</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Examinez les propositions qui ne peuvent pas être publiées automatiquement.
              </p>
            </div>
            <Select
              items={metadata?.productContributionStatuses ?? []}
              onValueChange={(value) => {
                setContributionStatus(value);
                setPage(1);
              }}
              value={contributionStatus}
            >
              <SelectTrigger aria-label="Filtrer les contributions par statut">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(metadata?.productContributionStatuses ?? []).map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {initialLoading ? (
            <p className="p-5 text-sm text-muted-foreground">
              Chargement des contributions…
            </p>
          ) : hasError ? (
            <ErrorState
              description="Les contributions n’ont pas pu être chargées."
              onRetry={retry}
              title="Contributions indisponibles"
            />
          ) : (
            <>
              <DataTable
                caption="Contributions au référentiel Produits"
                columns={contributionColumns}
                data={contributionsQuery.data?.contributions ?? []}
                emptyContent={(
                  <EmptyState
                    className="p-0"
                    description="Aucune contribution ne correspond à ce statut."
                    title="Aucune contribution"
                  />
                )}
                getRowKey={(contribution) => contribution.id}
                rowClassName="transition-colors hover:bg-muted/50"
              />
              <div className="px-5 pb-5">
                <DataPagination
                  ariaLabel="Pagination des contributions"
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
        onClose={() => setDrawerState((current) => ({ ...current, open: false }))}
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
