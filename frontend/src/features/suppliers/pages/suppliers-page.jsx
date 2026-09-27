import { Archive, Eye, FileUp, Pencil, Plus, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';

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
  formatPackaging,
  getApiErrorMessage,
  getSupplierScopeLabel,
  getSupplierStatusLabel,
  getSupplierStatusTone,
} from '@/features/suppliers/lib/supplier-presentation';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

function SuppliersPage() {
  const {
    can,
    hasFeature,
    workspace,
  } = useWorkspaceContext();
  const { toast } = useToast();
  const [section, setSection] = useState('suppliers');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [supplierDialog, setSupplierDialog] = useState({
    open: false,
    supplier: null,
  });
  const [supplierDetails, setSupplierDetails] = useState({
    open: false,
    supplier: null,
  });
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const supplierQuery = useListSuppliersQuery({
    workspaceId: workspace.id,
    search: search || undefined,
    status,
    limit: 100,
  });
  const activeSupplierQuery = useListSuppliersQuery({
    workspaceId: workspace.id,
    status: 'ACTIVE',
    limit: 100,
  });
  const articleQuery = useListSupplierArticlesQuery(
    {
      workspaceId: workspace.id,
      search: search || undefined,
      status,
      limit: 100,
    },
    {
      skip: !can(SUPPLIER_PERMISSION.ARTICLE_READ),
    },
  );
  const catalogQuery = useListSupplierCatalogsQuery(
    {
      workspaceId: workspace.id,
      status,
      limit: 100,
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
  const canReadProducts = can(PRODUCT_PERMISSION.READ);
  const canImport = (
    can(SUPPLIER_PERMISSION.CATALOG_IMPORT)
    && hasFeature(SUPPLIER_CAPABILITY.CATALOG_IMPORT)
  );

  function applySearch(event) {
    event.preventDefault();
    setSearch(searchInput.trim());
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
          <p className="mt-1 text-xs text-muted-foreground">
            {supplier.supplierCode || 'Aucun code'}
          </p>
        </div>
      ),
    },
    {
      id: 'scope',
      header: 'Portée',
      cell: (supplier) => getSupplierScopeLabel(supplier.scope),
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
          <p className="font-medium">{article.supplierReference}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {article.supplierDesignation || article.productVariant?.name || 'Sans désignation'}
          </p>
        </div>
      ),
    },
    {
      id: 'supplier',
      header: 'Fournisseur',
      cell: (article) => article.supplier?.name ?? '—',
    },
    {
      id: 'product',
      header: 'Référence Produit',
      cell: (article) => article.productVariant?.name ?? '—',
    },
    {
      id: 'packaging',
      header: 'Conditionnement',
      cell: (article) => formatPackaging(article.packaging),
    },
    {
      id: 'scope',
      header: 'Portée',
      cell: (article) => getSupplierScopeLabel(article.scope),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (article) => (
        article.scope === 'WORKSPACE_PRIVATE' && canManageArticles ? (
          <DataTableActions>
            <ActionIconButton
              Icon={article.status === 'ACTIVE' ? Archive : RotateCcw}
              disabled={articleStatusState.isLoading}
              label={
                (article.status === 'ACTIVE' ? 'Archiver ' : 'Réactiver ')
                + article.supplierReference
              }
              onClick={() => toggleArticleStatus(article)}
              tooltipLabel={
                article.status === 'ACTIVE' ? 'Archiver' : 'Réactiver'
              }
              variant="outline"
            />
          </DataTableActions>
        ) : null
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
            {catalog.supplierName || 'Fournisseur non disponible'}
          </p>
        </div>
      ),
    },
    {
      id: 'scope',
      header: 'Portée',
      cell: (catalog) => getSupplierScopeLabel(catalog.scope),
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
        catalog.scope === 'WORKSPACE_PRIVATE'
        && can(SUPPLIER_PERMISSION.CATALOG_MANAGE) ? (
          <DataTableActions>
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
          </DataTableActions>
        ) : null
      ),
    },
  ];

  const currentQuery = section === 'suppliers'
    ? supplierQuery
    : section === 'articles'
      ? articleQuery
      : catalogQuery;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Fournisseurs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consultez le référentiel partagé et gérez les Fournisseurs, Articles et catalogues privés du Workspace.
          </p>
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
          {section === 'catalogs' && canImport && (
            <Button onClick={() => setImportOpen(true)} type="button">
              <FileUp aria-hidden="true" className="size-4" />
              Importer un catalogue
            </Button>
          )}
        </div>
      </header>

      <Tabs onValueChange={setSection} value={section}>
        <TabsList aria-label="Gestion Fournisseurs" variant="section">
          <TabsTrigger value="suppliers" variant="section">
            Fournisseurs
          </TabsTrigger>
          {can(SUPPLIER_PERMISSION.ARTICLE_READ) && (
            <TabsTrigger value="articles" variant="section">
              Articles
            </TabsTrigger>
          )}
          {can(SUPPLIER_PERMISSION.CATALOG_READ) && (
            <TabsTrigger value="catalogs" variant="section">
              Catalogues
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        {(section === 'suppliers' || section === 'articles') && (
        <form className="flex max-w-xl flex-1 gap-2" onSubmit={applySearch}>
          <Input
            aria-label="Rechercher"
            maxLength={120}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Rechercher…"
            value={searchInput}
          />
          <Button type="submit" variant="outline">
            Rechercher
          </Button>
        </form>
        )}
        <div className="w-full lg:w-52">
          <p className="mb-2 text-sm font-medium">Statut</p>
          <Select
            items={[
              { value: 'ACTIVE', label: 'Actifs' },
              { value: 'ARCHIVED', label: 'Archivés' },
            ]}
            onValueChange={setStatus}
            value={status}
          >
            <SelectTrigger aria-label="Filtrer par statut">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Actifs</SelectItem>
              <SelectItem value="ARCHIVED">Archivés</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {section === 'articles' && canManageArticles && !canReadProducts && (
        <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          La création manuelle d’un Article nécessite aussi l’accès au catalogue Produits pour sélectionner sa Référence Produit. Les Articles existants restent consultables selon votre rôle.
        </p>
      )}

      {currentQuery.isLoading && currentQuery.data === undefined ? (
        <p className="text-sm text-muted-foreground">
          Chargement…
        </p>
      ) : currentQuery.isError ? (
        <ErrorState
          description="Les données Fournisseurs n’ont pas pu être chargées."
          onRetry={currentQuery.refetch}
          title="Données indisponibles"
        />
      ) : section === 'suppliers' ? (
        <DataTable
          caption="Fournisseurs du Workspace"
          columns={supplierColumns}
          data={suppliers}
          emptyContent={(
            <EmptyState
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
              description="Aucun catalogue fournisseur n’est disponible."
              title="Aucun catalogue"
            />
          )}
          getRowKey={(catalog) => catalog.id}
          rowClassName="transition-colors hover:bg-muted/50"
        />
      )}

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

      <SupplierCatalogImportDialog
        onClose={() => setImportOpen(false)}
        onCommitted={(result) => {
          setImportOpen(false);
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

export { SuppliersPage };
