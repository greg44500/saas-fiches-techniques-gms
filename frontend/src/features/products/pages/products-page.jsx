import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Eye, FileUp, Minus, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
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
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useGetProductReferenceAccessQuery } from '@/features/products/api/product-reference-api';
import {
  useArchiveProductVariantMutation,
  useAttachProductVariantMutation,
  useGetProductMetadataQuery,
  useSearchProductsQuery,
} from '@/features/products/api/product-catalog-api';
import { ProductCreateDialog } from '@/features/products/components/product-create-dialog';
import { ProductDetailsDrawer } from '@/features/products/components/product-details-drawer';
import { ProductImportDialog } from '@/features/products/components/product-import-dialog';
import { ProductSearchAutocomplete } from '@/features/products/components/product-search-autocomplete';
import {
  PRODUCT_CAPABILITY,
  PRODUCT_PERMISSION,
  PRODUCT_REFERENCE_PERMISSION,
} from '@/features/products/constants/product-permissions';
import {
  formatYield,
  getApiErrorMessage,
  getProductStatusLabel,
  getProductStatusTone,
  getReferenceUnitLabel,
  getVariantLabel,
  getWorkspaceProductStatusLabel,
} from '@/features/products/lib/product-presentation';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { useDataPagination } from '@/hooks/use-data-pagination';

const ALL_CATEGORIES = '__ALL__';
const ALL_WORKSPACE_STATUSES = '__ALL__';

function ProductsPage() {
  const { can, hasFeature, workspace } = useWorkspaceContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { page, pageSize, setPage, setPageSize } = useDataPagination();
  const [scope, setScope] = useState('WORKSPACE');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState(ALL_CATEGORIES);
  const [status, setStatus] = useState(ALL_WORKSPACE_STATUSES);
  const [drawerState, setDrawerState] = useState({ open: false, productId: null });
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const productReferenceAccessQuery = useGetProductReferenceAccessQuery();
  const metadataQuery = useGetProductMetadataQuery(workspace.id);
  const productsQuery = useSearchProductsQuery({
    workspaceId: workspace.id,
    scope,
    q: search || undefined,
    categoryId: categoryId === ALL_CATEGORIES ? undefined : categoryId,
    status: (
      scope === 'WORKSPACE' && status !== ALL_WORKSPACE_STATUSES
        ? status
        : undefined
    ),
    page,
    limit: pageSize,
  });
  const [attachVariant, attachState] = useAttachProductVariantMutation();
  const [archiveVariant, archiveState] = useArchiveProductVariantMutation();

  const metadata = metadataQuery.data;
  const results = productsQuery.data?.results ?? [];
  const mutationPending = attachState.isLoading || archiveState.isLoading;
  const globalPermissions = new Set(
    productReferenceAccessQuery.data?.permissions ?? [],
  );
  const canGovernReference = globalPermissions.has(
    PRODUCT_REFERENCE_PERMISSION.READ,
  );
  const canReferenceAccess = hasFeature(PRODUCT_CAPABILITY.REFERENCE_ACCESS);
  const canCreate = (
    can(PRODUCT_PERMISSION.CONTRIBUTE)
    && hasFeature(PRODUCT_CAPABILITY.CONTRIBUTION)
  );
  const canImport = hasFeature(PRODUCT_CAPABILITY.CATALOG_IMPORT);

  useEffect(() => {
    const totalPages = productsQuery.data?.pagination?.totalPages;
    if (totalPages && page > totalPages) setPage(totalPages);
  }, [page, productsQuery.data?.pagination?.totalPages, setPage]);

  useEffect(() => {
    if (!canReferenceAccess && scope === 'REFERENCE') {
      setScope('WORKSPACE');
      setPage(1);
      setStatus(ALL_WORKSPACE_STATUSES);
    }
  }, [canReferenceAccess, scope, setPage]);

  const categoryItems = useMemo(() => [
    { value: ALL_CATEGORIES, label: 'Toutes les catégories' },
    ...(metadata?.categories ?? []).map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ], [metadata?.categories]);

  const workspaceStatusItems = useMemo(() => [
    { value: ALL_WORKSPACE_STATUSES, label: 'Tous les états du catalogue' },
    ...(metadata?.workspaceProductStatuses ?? []),
  ], [metadata?.workspaceProductStatuses]);

  function runSearch(nextSearch) {
    setPage(1);
    setSearch(nextSearch.trim());
  }

  function applySearch(event) {
    event.preventDefault();
    runSearch(searchInput);
  }

  function selectPredictiveResult(result) {
    const nextSearch = result.product.name;

    setSearchInput(nextSearch);
    setPage(1);
    setSearch(nextSearch);

    if (
      canReferenceAccess
      && scope === 'WORKSPACE'
      && !result.workspaceEntry
    ) {
      setScope('REFERENCE');
      setStatus(ALL_WORKSPACE_STATUSES);
    }
  }

  function changeScope(nextScope) {
    setScope(nextScope);
    setPage(1);
    setStatus(ALL_WORKSPACE_STATUSES);
  }

  async function changeCatalog(result, shouldAttach) {
    try {
      if (shouldAttach) {
        await attachVariant({
          workspaceId: workspace.id,
          variantId: result.variant.id,
        }).unwrap();
        toast({ title: 'Référence ajoutée au catalogue', variant: 'success' });
      } else {
        await archiveVariant({
          workspaceId: workspace.id,
          variantId: result.variant.id,
        }).unwrap();
        toast({ title: 'Référence retirée du catalogue', variant: 'success' });
      }
    } catch (error) {
      toast({
        title: 'Action impossible',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  function openProduct(productId) {
    setDrawerState({ open: true, productId });
  }

  const columns = [
    {
      id: 'product',
      header: 'Produit',
      cell: (result) => (
        <div>
          <p className="font-medium">{result.product.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {result.product.category?.name ?? 'Catégorie non renseignée'}
          </p>
        </div>
      ),
    },
    {
      id: 'variant',
      header: 'Déclinaison',
      cell: (result) => (
        <div>
          <p>{getVariantLabel(result.variant)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {getReferenceUnitLabel(metadata, result.variant.referenceUnit)}
            {' · '}Rendement {formatYield(result.variant.yieldPercent)}
          </p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (result) => (
        <StatusBadge tone={getProductStatusTone(result.variant.status)}>
          {getProductStatusLabel(metadata, result.variant.status)}
        </StatusBadge>
      ),
    },
    {
      id: 'catalog',
      header: 'Mon catalogue',
      cell: (result) => (
        result.workspaceEntry ? (
          <StatusBadge tone={result.workspaceEntry.status === 'ACTIVE' ? 'success' : 'neutral'}>
            {getWorkspaceProductStatusLabel(metadata, result.workspaceEntry.status)}
          </StatusBadge>
        ) : (
          <span className="text-sm text-muted-foreground">Non ajoutée</span>
        )
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (result) => {
        const inCatalog = result.workspaceEntry?.status === 'ACTIVE';
        const canAttach = (
          result.product.status === 'ACTIVE'
          && result.variant.status === 'ACTIVE'
        );

        return (
          <DataTableActions>
            <ActionIconButton
              Icon={Eye}
              label={'Voir ' + result.product.name}
              onClick={() => openProduct(result.product.id)}
              tooltipLabel="Voir"
              variant="outline"
            />
            {can(PRODUCT_PERMISSION.CATALOG_MANAGE) && (
              inCatalog ? (
                <ActionIconButton
                  Icon={Minus}
                  disabled={mutationPending}
                  label={'Retirer ' + result.product.name + ' du catalogue'}
                  onClick={() => changeCatalog(result, false)}
                  tooltipLabel="Retirer du catalogue"
                  variant="outline"
                />
              ) : canAttach ? (
                <ActionIconButton
                  Icon={Plus}
                  disabled={mutationPending}
                  label={'Ajouter ' + result.product.name + ' au catalogue'}
                  onClick={() => changeCatalog(result, true)}
                  tooltipLabel="Ajouter au catalogue"
                />
              ) : null
            )}
          </DataTableActions>
        );
      },
    },
  ];

  const initialLoading = (
    (metadataQuery.isLoading && metadata === undefined)
    || (productsQuery.isLoading && productsQuery.data === undefined)
  );
  const hasError = metadataQuery.isError || productsQuery.isError;

  function retry() {
    metadataQuery.refetch();
    productsQuery.refetch();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Produits</h1>
          <InfoTooltip
            content="Consultez votre catalogue, recherchez le référentiel commun et créez une nouvelle référence seulement lorsqu’aucun équivalent n’existe."
            label="À propos des Produits"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {canGovernReference && (
            <Button
              onClick={() => navigate('/product-reference')}
              type="button"
              variant="outline"
            >
              <BookOpenCheck aria-hidden="true" className="size-4" />
              Gérer le référentiel
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)} type="button">
              <Plus aria-hidden="true" className="size-4" />
              Créer un Produit
            </Button>
          )}
          {canImport && (
            <Button onClick={() => setImportOpen(true)} type="button" variant="outline">
              <FileUp aria-hidden="true" className="size-4" />
              Importer
            </Button>
          )}
        </div>
      </header>

      <Tabs onValueChange={changeScope} value={scope}>
        <TabsList aria-label="Portée du catalogue" variant="section">
          <TabsTrigger value="WORKSPACE" variant="section">Mon catalogue</TabsTrigger>
          {canReferenceAccess && (
            <TabsTrigger value="REFERENCE" variant="section">
              Tout le référentiel
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      <section className="rounded-xl border border-border bg-card">
        <div className="grid gap-3 border-b border-border p-5 xl:grid-cols-[minmax(260px,1fr)_240px_240px]">
          <form className="flex min-w-0 gap-2" onSubmit={applySearch}>
            <div className="min-w-0 flex-1">
              <ProductSearchAutocomplete
                categoryId={
                  categoryId === ALL_CATEGORIES
                    ? undefined
                    : categoryId
                }
                onSelect={selectPredictiveResult}
                onValueChange={setSearchInput}
                scope={canReferenceAccess ? 'REFERENCE' : scope}
                status={undefined}
                value={searchInput}
                workspaceId={workspace.id}
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

          {scope === 'WORKSPACE' ? (
            <Select
              items={workspaceStatusItems}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              value={status}
            >
              <SelectTrigger aria-label="Filtrer par état du catalogue">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workspaceStatusItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center text-sm text-muted-foreground">
              Références actives du référentiel commun
            </div>
          )}
        </div>

        {initialLoading ? (
          <p className="p-5 text-sm text-muted-foreground">Chargement des Produits…</p>
        ) : hasError ? (
          <ErrorState
            description="Le catalogue Produit ou ses métadonnées n’ont pas pu être chargés."
            onRetry={retry}
            title="Produits indisponibles"
          />
        ) : (
          <>
            <DataTable
              caption={scope === 'WORKSPACE' ? 'Mon catalogue Produits' : 'Référentiel Produits'}
              columns={columns}
              data={results}
              emptyContent={(
                <EmptyState
                  className="p-0"
                  description={
                    search || categoryId !== ALL_CATEGORIES
                      ? 'Modifiez la recherche ou les filtres pour élargir les résultats.'
                      : scope === 'WORKSPACE'
                        ? 'Recherchez le référentiel ou créez votre premier Produit.'
                        : 'Aucune référence n’est disponible avec ces critères.'
                  }
                  title="Aucun Produit à afficher"
                />
              )}
              getRowKey={(result) => result.variant.id}
              rowClassName="transition-colors hover:bg-muted/50"
            />
            <div className="px-5 pb-5">
              <DataPagination
                ariaLabel="Pagination des Produits"
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

      <ProductDetailsDrawer
        metadata={metadata}
        onClose={() => setDrawerState((current) => ({ ...current, open: false }))}
        open={drawerState.open}
        productId={drawerState.productId}
        workspaceId={workspace.id}
      />

      <ProductCreateDialog
        metadata={metadata}
        onClose={() => setCreateOpen(false)}
        onCreated={(result) => {
          setCreateOpen(false);
          toast({
            title: 'Produit créé et ajouté au catalogue',
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
        workspaceId={workspace.id}
      />

      <ProductImportDialog
        metadata={metadata}
        onClose={() => setImportOpen(false)}
        onCommitted={(result) => {
          toast({
            title: 'Import Produits terminé',
            description: String(result?.succeeded ?? 0) + ' ligne(s) traitée(s).',
            variant: 'success',
          });
        }}
        open={importOpen}
        workspaceId={workspace.id}
      />
    </div>
  );
}

export {
  ALL_CATEGORIES,
  ALL_WORKSPACE_STATUSES,
  ProductsPage,
};
