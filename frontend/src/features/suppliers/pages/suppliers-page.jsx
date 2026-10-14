import { Archive, Eye, FileUp, Pencil, Plus, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { DataPagination } from '@/components/data-display/data-pagination';
import {
  DataTable,
  DataTableActions,
} from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { EmptyState } from '@/components/shared/empty-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { ErrorState } from '@/components/shared/error-state';
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
  PRODUCT_PERMISSION,
} from '@/features/products/constants/product-permissions';
import {
  useListSupplierArticlesQuery,
  useListSupplierCatalogsQuery,
  useListSuppliersQuery,
  useUpdateSupplierArticleStatusMutation,
  useUpdateSupplierCatalogStatusMutation,
  useUpdateSupplierStatusMutation,
} from '@/features/suppliers/api/supplier-api';
import {
  SupplierArticleAssociationDialog,
} from '@/features/suppliers/components/supplier-article-association-dialog';
import { SupplierArticleDetailsDrawer } from '@/features/suppliers/components/supplier-article-details-drawer';
import { SupplierArticleEditDialog } from '@/features/suppliers/components/supplier-article-edit-dialog';
import { SupplierArticlePriceCorrectionDialog } from '@/features/suppliers/components/supplier-article-price-correction-dialog';
import { SupplierArticlePeriodCorrectionDialog } from '@/features/suppliers/components/supplier-article-period-correction-dialog';
import { SupplierArticleSupplierFilter } from '@/features/suppliers/components/supplier-article-supplier-filter';
import {
  SupplierArticlePackagingPopover,
  SupplierArticlePricePopover,
} from '@/features/suppliers/components/supplier-article-table-popovers';
import {
  SupplierArticleImportDialog,
} from '@/features/suppliers/components/supplier-article-import-dialog';
import {
  SupplierArticleFormDialog,
} from '@/features/suppliers/components/supplier-article-form-dialog';
import {
  SupplierCatalogImportDialog,
} from '@/features/suppliers/components/supplier-catalog-import-dialog';
import {
  SupplierDetailsDrawer,
} from '@/features/suppliers/components/supplier-details-drawer';
import {
  SupplierFormDialog,
} from '@/features/suppliers/components/supplier-form-dialog';
import {
  SUPPLIER_CAPABILITY,
  SUPPLIER_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  getApiErrorMessage,
  getSupplierOriginLabel,
  getSupplierStatusLabel,
  getSupplierStatusTone,
} from '@/features/suppliers/lib/supplier-presentation';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';
import { useDataPagination } from '@/hooks/use-data-pagination';

const ALL_SUPPLIER_STATUSES = 'ALL';

function SuppliersPage() {
  const {
    can,
    hasFeature,
    workspace,
  } = useWorkspaceContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useDataPagination();
  const [section, setSection] = useState(() => {
    const requestedSection = searchParams.get('section');

    if (
      requestedSection === 'articles'
      && can(SUPPLIER_PERMISSION.ARTICLE_READ)
    ) {
      return 'articles';
    }

    if (
      requestedSection === 'catalogs'
      && can(SUPPLIER_PERMISSION.CATALOG_READ)
    ) {
      return 'catalogs';
    }

    return 'suppliers';
  });
  const initialSearch = searchParams.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(
    section === 'suppliers' ? ALL_SUPPLIER_STATUSES : 'ACTIVE',
  );
  const [articleSupplierId, setArticleSupplierId] = useState(null);
  const [articlePeriodToCorrect, setArticlePeriodToCorrect] = useState(null);
  const [supplierDialog, setSupplierDialog] = useState({
    open: false,
    supplier: null,
  });
  const [supplierDetails, setSupplierDetails] = useState({
    open: false,
    supplier: null,
  });
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [articleImportOpen, setArticleImportOpen] = useState(false);
  const [articleToAssociate, setArticleToAssociate] = useState(null);
  const [articleDetails, setArticleDetails] = useState(null);
  const [articleToEdit, setArticleToEdit] = useState(null);
  const [articlePriceToCorrect, setArticlePriceToCorrect] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const supplierQuery = useListSuppliersQuery({
    workspaceId: workspace.id,
    search: search || undefined,
    status,
    page,
    limit: pageSize,
  });
  const activeSupplierQuery = useListSuppliersQuery({
    workspaceId: workspace.id,
    status: 'ACTIVE',
    limit: 100,
  });
  const activeArticleCountQuery = useListSupplierArticlesQuery(
    { workspaceId: workspace.id, status: 'ACTIVE', limit: 1 },
    { skip: !can(SUPPLIER_PERMISSION.ARTICLE_READ) },
  );
  const articleQuery = useListSupplierArticlesQuery(
    {
      workspaceId: workspace.id,
      search: search || undefined,
      status: status === ALL_SUPPLIER_STATUSES ? 'ACTIVE' : status,
      supplierId: articleSupplierId || undefined,
      page,
      limit: pageSize,
    },
    {
      skip: !can(SUPPLIER_PERMISSION.ARTICLE_READ),
    },
  );
  const catalogQuery = useListSupplierCatalogsQuery(
    {
      workspaceId: workspace.id,
      status: status === ALL_SUPPLIER_STATUSES ? 'ACTIVE' : status,
      page,
      limit: pageSize,
    },
    {
      skip: !can(SUPPLIER_PERMISSION.CATALOG_READ),
    },
  );

  const [updateSupplierStatus, supplierStatusState] =
    useUpdateSupplierStatusMutation();
  const [updateArticleStatus, articleStatusState] =
    useUpdateSupplierArticleStatusMutation();
  const [updateCatalogStatus, catalogStatusState] =
    useUpdateSupplierCatalogStatusMutation();

  const suppliers = supplierQuery.data?.suppliers ?? [];
  const activeSuppliers = useMemo(
    () => activeSupplierQuery.data?.suppliers ?? [],
    [activeSupplierQuery.data?.suppliers],
  );

  const canManageSuppliers = can(SUPPLIER_PERMISSION.SUPPLIER_MANAGE);
  const canManageArticles = can(SUPPLIER_PERMISSION.ARTICLE_MANAGE);
  const canReadTariffs = can(SUPPLIER_PERMISSION.CATALOG_READ);
  const canCorrectTariffs = canManageArticles && can(SUPPLIER_PERMISSION.CATALOG_MANAGE);
  const canReadProducts = can(PRODUCT_PERMISSION.READ);
  const canImport = (
    can(SUPPLIER_PERMISSION.CATALOG_IMPORT)
    && hasFeature(SUPPLIER_CAPABILITY.CATALOG_IMPORT)
  );

  // La recherche interroge le serveur plutôt que la seule page affichée.
  useEffect(() => {
    const nextSearch = searchInput.trim();
    if (nextSearch === search) return undefined;

    const timeoutId = window.setTimeout(() => {
      setPage(1);
      setSearch(nextSearch);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput, search, setPage]);

  function changeSection(nextSection) {
    setPage(1);
    if (nextSection !== 'articles') setArticleSupplierId(null);

    if (
      nextSection !== 'suppliers'
      && status === ALL_SUPPLIER_STATUSES
    ) {
      setStatus('ACTIVE');
    }

    setSection(nextSection);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('section', nextSection);
    setSearchParams(nextSearchParams, { replace: true });
  }

  function changeStatus(nextStatus) {
    setPage(1);
    setStatus(nextStatus);
  }

  async function toggleSupplierStatus(supplier) {
    try {
      await updateSupplierStatus({
        workspaceId: workspace.id,
        supplierId: supplier.id,
        status: supplier.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE',
      }).unwrap();
      toast({
        title: supplier.status === 'ACTIVE'
          ? 'Fournisseur archivé'
          : 'Fournisseur réactivé',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Modification impossible',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  async function toggleArticleStatus(article) {
    try {
      await updateArticleStatus({
        workspaceId: workspace.id,
        articleId: article.id,
        status: article.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE',
      }).unwrap();
      toast({
        title: article.status === 'ACTIVE'
          ? 'Article archivé'
          : 'Article réactivé',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Modification impossible',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  async function toggleCatalogStatus(catalog) {
    try {
      await updateCatalogStatus({
        workspaceId: workspace.id,
        catalogId: catalog.id,
        status: catalog.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE',
      }).unwrap();
      toast({
        title: catalog.status === 'ACTIVE'
          ? 'Catalogue archivé'
          : 'Catalogue réactivé',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Modification impossible',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  const supplierColumns = [
    {
      id: 'name',
      header: 'Fournisseur',
      cell: (supplier) => (
        <div>
          <p className="font-medium">{supplier.name}</p>
          {supplier.supplierCode && (
            <p className="mt-1 text-xs text-muted-foreground">
              {supplier.supplierCode}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'categories',
      header: 'Catégories commercialisées',
      cell: (supplier) => {
        const categories = (supplier.categories ?? [])
          .map(({ name }) => name)
          .filter(Boolean);

        return categories.length > 0
          ? categories.join(', ')
          : 'Non renseignées';
      },
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (supplier) => (
        <StatusBadge tone={getSupplierStatusTone(supplier.status)}>
          {getSupplierStatusLabel(supplier.status)}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (supplier) => (
        <DataTableActions>
          <ActionIconButton
            Icon={Eye}
            label={'Voir ' + supplier.name}
            onClick={() => setSupplierDetails({
              open: true,
              supplier,
            })}
            tooltipLabel="Voir"
            variant="outline"
          />
          {supplier.scope === 'WORKSPACE_PRIVATE' && canManageSuppliers && (
            <>
              <ActionIconButton
                Icon={Pencil}
                label={'Modifier ' + supplier.name}
                onClick={() => setSupplierDialog({ open: true, supplier })}
                tooltipLabel="Modifier"
                variant="outline"
              />
              <ActionIconButton
                Icon={supplier.status === 'ACTIVE' ? Archive : RotateCcw}
                disabled={supplierStatusState.isLoading}
                label={
                  (supplier.status === 'ACTIVE' ? 'Archiver ' : 'Réactiver ')
                  + supplier.name
                }
                onClick={() => toggleSupplierStatus(supplier)}
                tooltipLabel={
                  supplier.status === 'ACTIVE' ? 'Archiver' : 'Réactiver'
                }
                variant="outline"
              />
            </>
          )}
        </DataTableActions>
      ),
    },
  ];

  const articleColumns = [
    {
      id: 'reference',
      header: 'Article fournisseur',
      cell: (article) => (
        <div>
          <p className="font-medium">
            {article.supplierDesignation || 'Sans désignation'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Réf. fournisseur : {article.supplierReference}
          </p>
        </div>
      ),
    },
    {
      id: 'supplier',
      header: 'Fournisseur',
      cell: (article) => (
        <div>
          <p>{article.supplier?.name ?? '—'}</p>

        </div>
      ),
    },
    {
      id: 'product',
      header: 'Produit associé',
      cell: (article) => article.associationStatus === 'PENDING'
        ? <StatusBadge tone="warning">Non associé</StatusBadge>
        : article.productVariant?.name ?? '—',
    },
    {
      id: 'packaging',
      header: 'Conditionnement',
      cell: (article) => (
        <div className="inline-flex max-w-full items-center gap-1">
          <span>
            {article.packagingPresentation?.mainLabel
              || article.packagingLabel || 'Non renseigné'}
          </span>
          <SupplierArticlePackagingPopover
            presentation={article.packagingPresentation}
            supplierReference={article.supplierReference}
          />
        </div>
      ),
    },
    {
      id: 'supplier-tariff',
      header: 'Tarif fournisseur HT',
      cell: (article) => {
        if (article.supplierTariffStatus === 'RESTRICTED') {
          return 'Tarif non accessible';
        }
        if (article.supplierTariffStatus === 'AMBIGUOUS') {
          return <StatusBadge tone="warning">Tarifs à vérifier</StatusBadge>;
        }
        const price = article.supplierTariff;
        if (!price) return 'Aucun tarif renseigné';
        return (
          <div className="inline-flex max-w-full items-center gap-1">
            <span className="font-medium">
              {price.packagePriceLabel || price.sourcePriceLabel}
            </span>
            <SupplierArticlePricePopover
              price={price}
              supplierReference={article.supplierReference}
            />
            {article.supplierTariffStatus === 'EXPIRED' && (
              <StatusBadge tone="warning">Expiré</StatusBadge>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (article) => (
        <DataTableActions>
          <ActionIconButton
            Icon={Eye}
            label={'Détails de ' + article.supplierReference}
            onClick={() => setArticleDetails(article)}
            tooltipLabel="Consulter l’Article"
            variant="outline"
          />
          {article.scope === 'WORKSPACE_PRIVATE' && canManageArticles && (
            <ActionIconButton
              Icon={article.status === 'ACTIVE' ? Archive : RotateCcw}
              disabled={articleStatusState.isLoading}
              label={
                (article.status === 'ACTIVE' ? 'Archiver ' : 'Réactiver ')
                + article.supplierReference
              }
              onClick={() => toggleArticleStatus(article)}
              tooltipLabel={article.status === 'ACTIVE' ? 'Archiver' : 'Réactiver'}
              variant="outline"
            />
          )}
        </DataTableActions>
      ),
    },
  ];

  const catalogColumns = [
    {
      id: 'name',
      header: 'Catalogue',
      cell: (catalog) => (
        <div>
          <p className="font-medium">{catalog.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(catalog.supplierName || 'Fournisseur non disponible')
              + ' · '
              + getSupplierOriginLabel(catalog.scope)}
          </p>
        </div>
      ),
    },
    {
      id: 'period',
      header: 'Période',
      cell: (catalog) => (
        <span className="text-sm">
          {catalog.validFrom
            ? new Date(catalog.validFrom).toLocaleDateString('fr-FR')
            : 'Début non renseigné'}
          {' → '}
          {catalog.validTo
            ? new Date(catalog.validTo).toLocaleDateString('fr-FR')
            : 'sans fin'}
        </span>
      ),
    },
    {
      id: 'references',
      header: 'Références',
      cell: (catalog) => (
        <span className="tabular-nums">
          {catalog.lineCount ?? 0}
        </span>
      ),
    },
    {
      id: 'source',
      header: 'Provenance',
      cell: (catalog) => catalog.source || 'Non renseignée',
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (catalog) => (
        <StatusBadge tone={getSupplierStatusTone(catalog.status)}>
          {getSupplierStatusLabel(catalog.status)}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (catalog) => (
        <DataTableActions>
          <ActionIconButton
            Icon={Eye}
            label={'Voir ' + catalog.name}
            onClick={() => navigate(
              '/workspaces/'
              + workspace.id
              + '/suppliers/catalogs/'
              + catalog.id,
            )}
            tooltipLabel="Voir"
            variant="outline"
          />
          {catalog.scope === 'WORKSPACE_PRIVATE'
            && can(SUPPLIER_PERMISSION.CATALOG_MANAGE) && (
            <ActionIconButton
              Icon={catalog.status === 'ACTIVE' ? Archive : RotateCcw}
              disabled={catalogStatusState.isLoading}
              label={
                (catalog.status === 'ACTIVE' ? 'Archiver ' : 'Réactiver ')
                + catalog.name
              }
              onClick={() => toggleCatalogStatus(catalog)}
              tooltipLabel={
                catalog.status === 'ACTIVE' ? 'Archiver' : 'Réactiver'
              }
              variant="outline"
            />
          )}
        </DataTableActions>
      ),
    },
  ];

  const currentQuery = section === 'suppliers'
    ? supplierQuery
    : section === 'articles'
      ? articleQuery
      : catalogQuery;

  useEffect(() => {
    const totalPages = currentQuery.data?.pagination?.totalPages;

    if (totalPages && page > totalPages) {
      setPage(totalPages);
    }
  }, [currentQuery.data?.pagination?.totalPages, page, setPage]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Fournisseurs
          </h1>
          <InfoTooltip
            content="Consultez le référentiel partagé et gérez les Fournisseurs, Articles et catalogues propres à cet espace de travail."
            label="À propos de la page Fournisseurs"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {section === 'suppliers' && canManageSuppliers && (
            <Button
              onClick={() => setSupplierDialog({ open: true, supplier: null })}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              Créer un Fournisseur
            </Button>
          )}
          {section === 'articles' && canManageArticles && canReadProducts && (
            <Button onClick={() => setArticleDialogOpen(true)} type="button">
              <Plus aria-hidden="true" className="size-4" />
              Créer un Article
            </Button>
          )}
          {section === 'articles' && canManageArticles && canImport && (
            <Button onClick={() => setArticleImportOpen(true)} type="button" variant="outline">
              <FileUp aria-hidden="true" className="size-4" />
              Importer des Articles
            </Button>
          )}
          {section === 'catalogs' && canImport && (
            <Button onClick={() => setImportOpen(true)} type="button">
              <FileUp aria-hidden="true" className="size-4" />
              Importer un catalogue
            </Button>
          )}
        </div>
      </header>

      <Tabs onValueChange={changeSection} value={section}>
        <TabsList aria-label="Gestion Fournisseurs" variant="section">
          <TabsTrigger value="suppliers" variant="section">
            Fournisseurs ({activeSupplierQuery.data?.pagination?.total ?? '…'})
          </TabsTrigger>
          {can(SUPPLIER_PERMISSION.ARTICLE_READ) && (
            <TabsTrigger value="articles" variant="section">
              Articles ({activeArticleCountQuery.data?.pagination?.total ?? '…'})
            </TabsTrigger>
          )}
          {can(SUPPLIER_PERMISSION.CATALOG_READ) && (
            <TabsTrigger value="catalogs" variant="section">
              Catalogues
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      <section className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center">
          {(section === 'suppliers' || section === 'articles') && (
            <div className="w-full min-w-0 md:flex-1">
              <Input
                aria-label="Rechercher"
                autoComplete="off"
                id="supplier-search"
                maxLength={120}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={section === 'articles'
                  ? 'Rechercher un article…'
                  : 'Rechercher un fournisseur…'}
                type="search"
                value={searchInput}
              />
            </div>
          )}
          {section === 'articles' && (
            <div className="w-full md:w-64 md:shrink-0">
              <SupplierArticleSupplierFilter
                onChange={(supplierId) => {
                  setPage(1);
                  setArticleSupplierId(supplierId);
                }}
                value={articleSupplierId}
                workspaceId={workspace.id}
              />
            </div>
          )}
          <div className="w-full md:w-44 md:shrink-0">
            <Select
              items={[
                ...(section === 'suppliers'
                  ? [{ value: ALL_SUPPLIER_STATUSES, label: 'Tous' }]
                  : []),
                { value: 'ACTIVE', label: 'Actifs' },
                { value: 'ARCHIVED', label: 'Archivés' },
              ]}
              onValueChange={changeStatus}
              value={status}
            >
              <SelectTrigger aria-label="Filtrer par statut">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {section === 'suppliers' && <SelectItem value={ALL_SUPPLIER_STATUSES}>Tous</SelectItem>}
                <SelectItem value="ACTIVE">Actifs</SelectItem>
                <SelectItem value="ARCHIVED">Archivés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {section === 'articles' && canManageArticles && !canReadProducts && (
          <div className="border-b border-border p-5">
            <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              La création manuelle d’un Article nécessite aussi l’accès au catalogue Produits pour sélectionner sa Référence Produit. Les Articles existants restent consultables selon votre rôle.
            </p>
          </div>
        )}

        {currentQuery.isLoading && currentQuery.data === undefined ? (
          <p className="p-5 text-sm text-muted-foreground">
            Chargement…
          </p>
        ) : currentQuery.isError ? (
          <ErrorState
            description="Les données Fournisseurs n’ont pas pu être chargées."
            onRetry={currentQuery.refetch}
            title="Données indisponibles"
          />
        ) : (
          <>
            {section === 'suppliers' ? (
              <DataTable
                caption="Fournisseurs de l’espace de travail"
                columns={supplierColumns}
                data={suppliers}
                emptyContent={(
                  <EmptyState
                    className="p-0"
                    description="Aucun Fournisseur ne correspond aux critères."
                    title="Aucun Fournisseur"
                  />
                )}
                getRowKey={(supplier) => supplier.id}
                rowClassName="transition-colors hover:bg-muted/50"
              />
            ) : section === 'articles' ? (
              <DataTable
                caption="Articles fournisseur"
                columns={articleColumns}
                data={articleQuery.data?.articles ?? []}
                emptyContent={(
                  <EmptyState
                    className="p-0"
                    description="Aucun Article fournisseur ne correspond aux critères."
                    title="Aucun Article"
                  />
                )}
                getRowKey={(article) => article.id}
                rowClassName="transition-colors hover:bg-muted/50"
              />
            ) : (
              <DataTable
                caption="Catalogues fournisseurs"
                columns={catalogColumns}
                data={catalogQuery.data?.catalogs ?? []}
                emptyContent={(
                  <EmptyState
                    className="p-0"
                    description="Aucun catalogue fournisseur n’est disponible."
                    title="Aucun catalogue"
                  />
                )}
                getRowKey={(catalog) => catalog.id}
                rowClassName="transition-colors hover:bg-muted/50"
              />
            )}

            <div className="px-5 pb-5">
              <DataPagination
                ariaLabel={
                  section === 'suppliers'
                    ? 'Pagination des Fournisseurs'
                    : section === 'articles'
                      ? 'Pagination des Articles fournisseur'
                      : 'Pagination des catalogues fournisseurs'
                }
                disabled={currentQuery.isFetching}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                page={page}
                pageSize={pageSize}
                pagination={currentQuery.data?.pagination}
              />
            </div>
          </>
        )}
      </section>

      <SupplierDetailsDrawer
        canManage={canManageSuppliers}
        canReadArticles={can(SUPPLIER_PERMISSION.ARTICLE_READ)}
        canReadCatalogs={can(SUPPLIER_PERMISSION.CATALOG_READ)}
        mode="workspace"
        onClose={() => setSupplierDetails((current) => ({
          ...current,
          open: false,
        }))}
        onEdit={(supplier) => {
          setSupplierDetails((current) => ({
            ...current,
            open: false,
          }));
          setSupplierDialog({ open: true, supplier });
        }}
        onViewCatalog={(catalog) => {
          setSupplierDetails((current) => ({
            ...current,
            open: false,
          }));
          navigate(
            '/workspaces/'
            + workspace.id
            + '/suppliers/catalogs/'
            + catalog.id,
          );
        }}
        open={supplierDetails.open}
        supplier={supplierDetails.supplier}
        workspaceId={workspace.id}
      />

      <SupplierFormDialog
        onClose={() => setSupplierDialog({ open: false, supplier: null })}
        onSaved={(saved) => {
          setSupplierDialog({ open: false, supplier: null });
          toast({
            title: 'Fournisseur enregistré',
            description: saved.name,
            variant: 'success',
          });
        }}
        open={supplierDialog.open}
        supplier={supplierDialog.supplier}
        workspaceId={workspace.id}
      />

      <SupplierArticleFormDialog
        onClose={() => setArticleDialogOpen(false)}
        onSaved={(saved) => {
          setArticleDialogOpen(false);
          toast({
            title: 'Article fournisseur créé',
            description: saved.supplierReference,
            variant: 'success',
          });
        }}
        open={articleDialogOpen}
        suppliers={activeSuppliers}
        workspaceId={workspace.id}
      />

      <SupplierArticleDetailsDrawer
        article={articleDetails}
        canManage={Boolean(articleDetails?.scope === 'WORKSPACE_PRIVATE'
          && canManageArticles)}
        canAssociate={Boolean(articleDetails?.scope === 'WORKSPACE_PRIVATE'
          && canManageArticles && canReadProducts)}
        canReadTariffs={canReadTariffs}
        canCorrectTariffs={canCorrectTariffs && Boolean(
          articleDetails?.supplierTariff?.sourceKind === 'PRICE_LIST'
          && ['AVAILABLE', 'EXPIRED'].includes(articleDetails?.supplierTariffStatus)
        )}
        onAssociate={(article) => {
          setArticleDetails(null);
          setArticleToAssociate(article);
        }}
        onClose={() => setArticleDetails(null)}
        onCorrectPrice={(article) => {
          setArticleDetails(null);
          setArticlePriceToCorrect(article);
        }}
        onCorrectPeriod={(article) => {
          setArticleDetails(null);
          setArticlePeriodToCorrect(article);
        }}
        onEdit={(article) => {
          setArticleDetails(null);
          setArticleToEdit(article);
        }}
        open={Boolean(articleDetails)}
        workspaceId={workspace.id}
      />

      <SupplierArticleEditDialog
        article={articleToEdit}
        onClose={() => setArticleToEdit(null)}
        onSaved={() => {
          setArticleToEdit(null);
          toast({ title: 'Article fournisseur modifié', variant: 'success' });
        }}
        open={Boolean(articleToEdit)}
        workspaceId={workspace.id}
      />

      <SupplierArticlePeriodCorrectionDialog
        article={articlePeriodToCorrect}
        onClose={() => setArticlePeriodToCorrect(null)}
        onSaved={() => {
          setArticlePeriodToCorrect(null);
          toast({ title: 'Période corrigée et historisée', variant: 'success' });
        }}
        open={Boolean(articlePeriodToCorrect)}
        workspaceId={workspace.id}
      />

      <SupplierArticlePriceCorrectionDialog
        article={articlePriceToCorrect}
        onClose={() => setArticlePriceToCorrect(null)}
        onSaved={() => {
          setArticlePriceToCorrect(null);
          toast({ title: 'Tarif corrigé et historisé', variant: 'success' });
        }}
        open={Boolean(articlePriceToCorrect)}
        workspaceId={workspace.id}
      />

      <SupplierArticleAssociationDialog
        article={articleToAssociate}
        onClose={() => setArticleToAssociate(null)}
        onSaved={() => {
          setArticleToAssociate(null);
          toast({ title: 'Association Produit mise à jour', variant: 'success' });
        }}
        open={Boolean(articleToAssociate)}
        workspaceId={workspace.id}
      />

      <SupplierArticleImportDialog
        canCreateSupplier={canManageSuppliers}
        onClose={() => setArticleImportOpen(false)}
        onCommitted={(result) => {
          toast({
            title: 'Import des Articles terminé',
            description: String(result.created) + ' créé(s), '
              + String(result.updated) + ' actualisé(s).',
            variant: 'success',
          });
        }}
        open={articleImportOpen}
        suppliers={activeSuppliers}
        workspaceId={workspace.id}
      />

      <SupplierCatalogImportDialog
        canCreateSupplier={canManageSuppliers}
        onClose={() => setImportOpen(false)}
        onCommitted={(result) => {
          toast({
            title: 'Import catalogue terminé',
            description:
              String(result.changedLines ?? 0)
              + ' ligne(s) ajoutée(s) ou révisée(s).',
            variant: 'success',
          });
        }}
        open={importOpen}
        suppliers={activeSuppliers}
        workspaceId={workspace.id}
      />
    </div>
  );
}

export {
  ALL_SUPPLIER_STATUSES,
  SuppliersPage,
};
