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
  useListProductReferenceProductsQuery,
  useUpdateProductReferenceCategoryStatusMutation,
} from '@/features/products/api/product-reference-api';
import { ProductCreateDialog } from '@/features/products/components/product-create-dialog';
import { ProductImportDialog } from '@/features/products/components/product-import-dialog';
import { ProductReferenceCategoryDialog } from '@/features/products/components/product-reference-category-dialog';
import { ProductReferenceDetailsDrawer } from '@/features/products/components/product-reference-details-drawer';
import {
  getApiErrorMessage,
  getCategoryStatusLabel,
  getProductStatusLabel,
  getProductStatusTone,
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
    { skip: section === 'categories' },
  );
  const [updateCategoryStatus, categoryStatusState] =
    useUpdateProductReferenceCategoryStatusMutation();

  useEffect(() => {
    const totalPages = productsQuery.data?.pagination?.totalPages;
    if (totalPages && page > totalPages) setPage(totalPages);
  }, [page, productsQuery.data?.pagination?.totalPages, setPage]);

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
  }

  function applySearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function openProduct(productId) {
    setDrawerState({ open: true, productId });
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
            {product.aliases?.length ? product.aliases.join(', ') : 'Aucun alias'}
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
      id: 'updated',
      header: 'Dernière évolution',
      cell: (product) => new Date(product.updatedAt).toLocaleDateString('fr-FR'),
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
    || (section !== 'categories'
      && productsQuery.isLoading
      && productsQuery.data === undefined)
  );
  const hasError = metadataQuery.isError
    || (section !== 'categories' && productsQuery.isError);

  function retry() {
    metadataQuery.refetch();
    if (section !== 'categories') productsQuery.refetch();
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
                placeholder="Nom ou alias"
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
