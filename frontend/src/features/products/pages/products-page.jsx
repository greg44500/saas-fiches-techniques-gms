import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Eye, FileUp, Minus, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
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
  getApiErrorMessage,
  getConservationTypeLabel,
  getReferenceLabel,
} from '@/features/products/lib/product-presentation';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { useDataPagination } from '@/hooks/use-data-pagination';

const ALL_CATEGORIES = '__ALL__';
const ALL_CONSERVATION_TYPES = '__ALL_CONSERVATION_TYPES__';
const ALL_FOOD_RANGES = '__ALL_RANGES__';
const PRODUCT_SORT_NAME = 'NAME';
const PRODUCT_SORT_FOOD_RANGE = 'FOOD_RANGE';

function ProductsPage() {
  const { can, hasFeature, workspace } = useWorkspaceContext();
  const canReferenceAccess = hasFeature(PRODUCT_CAPABILITY.REFERENCE_ACCESS);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { page, pageSize, setPage, setPageSize } = useDataPagination();
  const [scope, setScope] = useState(
    () => (canReferenceAccess ? 'REFERENCE' : 'WORKSPACE'),
  );
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState(ALL_CATEGORIES);
  const [conservationType, setConservationType] = useState(ALL_CONSERVATION_TYPES);
  const [foodRange, setFoodRange] = useState(ALL_FOOD_RANGES);
  const [sort, setSort] = useState(PRODUCT_SORT_NAME);
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
    conservationType: conservationType === ALL_CONSERVATION_TYPES
      ? undefined
      : conservationType,
    foodRange: foodRange === ALL_FOOD_RANGES ? undefined : foodRange,
    sort,
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
    }
  }, [canReferenceAccess, scope, setPage]);

  const categoryItems = useMemo(() => [
    { value: ALL_CATEGORIES, label: 'Toutes les catégories' },
    ...(metadata?.categories ?? []).map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ], [metadata?.categories]);

  const conservationItems = useMemo(() => [
    { value: ALL_CONSERVATION_TYPES, label: 'Toutes les conservations' },
    ...(metadata?.conservationTypes ?? []).map((item) => ({
      value: item.value,
      label: item.label,
    })),
  ], [metadata?.conservationTypes]);

  const foodRangeItems = useMemo(() => [
    { value: ALL_FOOD_RANGES, label: 'Toutes les gammes' },
    ...(metadata?.foodRanges ?? []).map((range) => ({
      value: String(range.value),
      label: range.label + (range.name ? ' — ' + range.name : ''),
    })),
  ], [metadata?.foodRanges]);

  const sortItems = [
    { value: PRODUCT_SORT_NAME, label: 'Nom A → Z' },
    { value: PRODUCT_SORT_FOOD_RANGE, label: 'Gamme 1 → 6' },
  ];

  function runSearch(nextSearch) {
    setPage(1);
    setSearch(nextSearch.trim());
  }

  function applySearch(event) {
    event.preventDefault();
    runSearch(searchInput);
  }

  function selectPredictiveResult(result) {
    const nextSearch = getReferenceLabel(
      metadata,
      result.product,
      result.variant,
    );

    setSearchInput(nextSearch);
    setPage(1);
    setSearch(nextSearch);

    if (
      canReferenceAccess
      && scope === 'WORKSPACE'
      && !result.workspaceEntry
    ) {
      setScope('REFERENCE');
    }
  }

  function changeScope(nextScope) {
    setScope(nextScope);
    setPage(1);
  }

  async function changeCatalog(result, shouldAttach) {
    if (!result.variant) return;

    const referenceLabel = getReferenceLabel(
      metadata,
      result.product,
      result.variant,
    );

    try {
      if (shouldAttach) {
        await attachVariant({
          workspaceId: workspace.id,
          variantId: result.variant.id,
        }).unwrap();
        toast({
          title: 'Référence ajoutée aux favoris',
          description: referenceLabel,
          variant: 'success',
        });
      } else {
        await archiveVariant({
          workspaceId: workspace.id,
          variantId: result.variant.id,
        }).unwrap();
        toast({
          title: 'Référence retirée des favoris',
          description: referenceLabel,
          variant: 'success',
        });
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
        <p className="font-medium">
          {getReferenceLabel(metadata, result.product, result.variant)}
        </p>
      ),
    },
    {
      id: 'conservation',
      header: 'Conservation',
      cell: (result) => (
        result.variant
          ? getConservationTypeLabel(metadata, result.variant.conservationType)
          : '—'
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (result) => {
        const referenceLabel = getReferenceLabel(
          metadata,
          result.product,
          result.variant,
        );
        const inFavorites = result.workspaceEntry?.status === 'ACTIVE';
        const canAttach = (
          result.variant
          && result.product.status === 'ACTIVE'
          && result.variant.status === 'ACTIVE'
        );

        return (
          <DataTableActions>
            {can(PRODUCT_PERMISSION.CATALOG_MANAGE) && result.variant && (
              inFavorites ? (
                <ActionIconButton
                  Icon={Minus}
                  disabled={mutationPending}
                  label={'Retirer ' + referenceLabel + ' des favoris'}
                  onClick={() => changeCatalog(result, false)}
                  tooltipLabel="Retirer des favoris"
                  variant="outline"
                />
              ) : canAttach ? (
                <ActionIconButton
                  Icon={Plus}
                  disabled={mutationPending}
                  label={'Ajouter ' + referenceLabel + ' aux favoris'}
                  onClick={() => changeCatalog(result, true)}
                  tooltipLabel="Ajouter aux favoris"
                />
              ) : null
            )}
            <ActionIconButton
              Icon={Eye}
              label={'Voir ' + referenceLabel}
              onClick={() => openProduct(result.product.id)}
              tooltipLabel="Voir"
              variant="outline"
            />
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
            content="Consultez les références de votre Workspace, recherchez le référentiel global et créez une nouvelle référence seulement lorsqu’aucun équivalent n’existe."
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
              Gérer le référentiel global
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
        <TabsList aria-label="Portée du référentiel Produit" variant="section">
          {canReferenceAccess && (
            <TabsTrigger value="REFERENCE" variant="section">
              Tous les produits
            </TabsTrigger>
          )}
          <TabsTrigger value="WORKSPACE" variant="section">Favoris</TabsTrigger>
        </TabsList>
      </Tabs>

      <section className="rounded-xl border border-border bg-card">
        <div className="grid gap-3 border-b border-border p-5 xl:grid-cols-[minmax(300px,1fr)_210px_200px_200px_180px]">
          <form className="flex min-w-0 gap-2" onSubmit={applySearch}>
            <div className="min-w-0 flex-1">
              <ProductSearchAutocomplete
                categoryId={
                  categoryId === ALL_CATEGORIES
                    ? undefined
                    : categoryId
                }
                conservationType={
                  conservationType === ALL_CONSERVATION_TYPES
                    ? undefined
                    : conservationType
                }
                foodRange={
                  foodRange === ALL_FOOD_RANGES
                    ? undefined
                    : foodRange
                }
                metadata={metadata}
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

          <Select
            items={conservationItems}
            onValueChange={(value) => {
              setConservationType(value);
              setPage(1);
            }}
            value={conservationType}
          >
            <SelectTrigger aria-label="Filtrer par conservation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {conservationItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={foodRangeItems}
            onValueChange={(value) => {
              setFoodRange(value);
              setPage(1);
            }}
            value={foodRange}
          >
            <SelectTrigger aria-label="Filtrer par gamme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {foodRangeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={sortItems}
            onValueChange={(value) => {
              setSort(value);
              setPage(1);
            }}
            value={sort}
          >
            <SelectTrigger aria-label="Trier les références">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {initialLoading ? (
          <p className="p-5 text-sm text-muted-foreground">Chargement des Produits…</p>
        ) : hasError ? (
          <ErrorState
            description="Les références Produit ou leurs métadonnées n’ont pas pu être chargées."
            onRetry={retry}
            title="Produits indisponibles"
          />
        ) : (
          <>
            <DataTable
              caption={scope === 'WORKSPACE' ? 'Favoris Produits' : 'Tous les Produits'}
              columns={columns}
              data={results}
              emptyContent={(
                <EmptyState
                  className="p-0"
                  description={
                    search
                    || categoryId !== ALL_CATEGORIES
                    || conservationType !== ALL_CONSERVATION_TYPES
                    || foodRange !== ALL_FOOD_RANGES
                      ? 'Modifiez la recherche ou les filtres pour élargir les résultats.'
                      : scope === 'WORKSPACE'
                        ? 'Ajoutez des Produits depuis l’onglet Tous les produits.'
                        : 'Aucune référence n’est disponible avec ces critères.'
                  }
                  title="Aucune référence à afficher"
                />
              )}
              getRowKey={(result) => result.variant?.id ?? result.product.id + '-root'}
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
          if (result?.classification === 'REVIEW_REQUIRED') {
            toast({
              title: 'Proposition envoyée en revue',
              description:
                'Le Produit sera disponible après validation du référentiel global.',
              variant: 'success',
            });
            return;
          }
          if (result?.classification === 'EXISTING') {
            toast({
              title: 'Une référence existante a été retrouvée',
              description: result?.existingReference?.name,
            });
            if (result?.existingReference?.id) {
              openProduct(result.existingReference.id);
            }
            return;
          }
          toast({
            title: 'Contribution traitée',
            description: result?.publishedReference?.name,
            variant: 'success',
          });
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
  ProductsPage,
};
