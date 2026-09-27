import { Archive, FileUp, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  DataTable,
  DataTableActions,
} from '@/components/data-display/data-table';
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
  useListGlobalSupplierArticlesQuery,
  useListGlobalSupplierCatalogsQuery,
  useListGlobalSuppliersQuery,
  useUpdateGlobalSupplierArticleStatusMutation,
  useUpdateGlobalSupplierCatalogStatusMutation,
  useUpdateGlobalSupplierStatusMutation,
} from '@/features/suppliers/api/supplier-api';
import {
  SupplierCatalogImportDialog,
} from '@/features/suppliers/components/supplier-catalog-import-dialog';
import {
  SupplierFormDialog,
} from '@/features/suppliers/components/supplier-form-dialog';
import {
  formatPackaging,
  getApiErrorMessage,
  getSupplierStatusLabel,
  getSupplierStatusTone,
} from '@/features/suppliers/lib/supplier-presentation';

function SupplierReferencePage({ canManage }) {
  const { toast } = useToast();
  const [section, setSection] = useState('suppliers');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [supplierDialog, setSupplierDialog] = useState({
    open: false,
    supplier: null,
  });
  const [importOpen, setImportOpen] = useState(false);

  const supplierQuery = useListGlobalSuppliersQuery({
    limit: 100,
    search: search || undefined,
    status,
  });
  const activeSupplierQuery = useListGlobalSuppliersQuery({
    limit: 100,
    status: 'ACTIVE',
  });
  const articleQuery = useListGlobalSupplierArticlesQuery({
    limit: 100,
    search: search || undefined,
    status,
  });
  const catalogQuery = useListGlobalSupplierCatalogsQuery({
    limit: 100,
    status,
  });

  const [updateSupplierStatus, supplierStatusState] =
    useUpdateGlobalSupplierStatusMutation();
  const [updateArticleStatus, articleStatusState] =
    useUpdateGlobalSupplierArticleStatusMutation();
  const [updateCatalogStatus, catalogStatusState] =
    useUpdateGlobalSupplierCatalogStatusMutation();

  const suppliers = supplierQuery.data?.suppliers ?? [];
  const activeSuppliers = useMemo(
    () => activeSupplierQuery.data?.suppliers ?? [],
    [activeSupplierQuery.data?.suppliers],
  );

  function applySearch(event) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  async function toggleStatus(mutation, item, key) {
    try {
      await mutation({
        [key]: item.id,
        status: item.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE',
      }).unwrap();
      toast({
        title: item.status === 'ACTIVE' ? 'Élément archivé' : 'Élément réactivé',
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
            {supplier.legalName || supplier.supplierCode || 'Identité partagée'}
          </p>
        </div>
      ),
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
      cell: (supplier) => canManage ? (
        <DataTableActions>
          <Button
            onClick={() => setSupplierDialog({ open: true, supplier })}
            size="sm"
            type="button"
            variant="outline"
          >
            <Pencil aria-hidden="true" className="size-4" />
            Modifier
          </Button>
          <Button
            disabled={supplierStatusState.isLoading}
            onClick={() => toggleStatus(
              updateSupplierStatus,
              supplier,
              'supplierId',
            )}
            size="sm"
            type="button"
            variant="outline"
          >
            <Archive aria-hidden="true" className="size-4" />
            {supplier.status === 'ACTIVE' ? 'Archiver' : 'Réactiver'}
          </Button>
        </DataTableActions>
      ) : null,
    },
  ];

  const articleColumns = [
    {
      id: 'reference',
      header: 'Article',
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
      id: 'status',
      header: 'Statut',
      cell: (article) => (
        <StatusBadge tone={getSupplierStatusTone(article.status)}>
          {getSupplierStatusLabel(article.status)}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (article) => canManage ? (
        <Button
          disabled={articleStatusState.isLoading}
          onClick={() => toggleStatus(
            updateArticleStatus,
            article,
            'articleId',
          )}
          size="sm"
          type="button"
          variant="outline"
        >
          <Archive aria-hidden="true" className="size-4" />
          {article.status === 'ACTIVE' ? 'Archiver' : 'Réactiver'}
        </Button>
      ) : null,
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
            {catalog.supplierName || 'Fournisseur global'}
          </p>
        </div>
      ),
    },
    {
      id: 'period',
      header: 'Période',
      cell: (catalog) => (
        <span>
          {catalog.validFrom
            ? new Date(catalog.validFrom).toLocaleDateString('fr-FR')
            : '—'}
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
      cell: (catalog) => canManage ? (
        <Button
          disabled={catalogStatusState.isLoading}
          onClick={() => toggleStatus(
            updateCatalogStatus,
            catalog,
            'catalogId',
          )}
          size="sm"
          type="button"
          variant="outline"
        >
          <Archive aria-hidden="true" className="size-4" />
          {catalog.status === 'ACTIVE' ? 'Archiver' : 'Réactiver'}
        </Button>
      ) : null,
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
            Référentiel Fournisseurs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gouvernance des identités et catalogues partagés, indépendante des rôles Platform.
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap gap-2">
            {section === 'suppliers' && (
              <Button
                onClick={() => setSupplierDialog({ open: true, supplier: null })}
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                Créer un Fournisseur
              </Button>
            )}
            {section === 'catalogs' && (
              <Button onClick={() => setImportOpen(true)} type="button">
                <FileUp aria-hidden="true" className="size-4" />
                Importer un catalogue
              </Button>
            )}
          </div>
        )}
      </header>

      <Tabs onValueChange={setSection} value={section}>
        <TabsList aria-label="Référentiel Fournisseurs" variant="section">
          <TabsTrigger value="suppliers" variant="section">
            Fournisseurs
          </TabsTrigger>
          <TabsTrigger value="articles" variant="section">
            Articles
          </TabsTrigger>
          <TabsTrigger value="catalogs" variant="section">
            Catalogues
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        {(section === 'suppliers' || section === 'articles') && (
        <form className="flex max-w-xl flex-1 gap-2" onSubmit={applySearch}>
          <Input
            aria-label="Rechercher dans le référentiel Fournisseurs"
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

      {currentQuery.isLoading && currentQuery.data === undefined ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : currentQuery.isError ? (
        <ErrorState
          description="Le référentiel Fournisseurs n’a pas pu être chargé."
          onRetry={currentQuery.refetch}
          title="Référentiel indisponible"
        />
      ) : section === 'suppliers' ? (
        <DataTable
          caption="Fournisseurs globaux"
          columns={supplierColumns}
          data={suppliers}
          emptyContent={(
            <EmptyState
              description="Aucun Fournisseur global."
              title="Aucun Fournisseur"
            />
          )}
          getRowKey={(supplier) => supplier.id}
        />
      ) : section === 'articles' ? (
        <DataTable
          caption="Articles fournisseur globaux"
          columns={articleColumns}
          data={articleQuery.data?.articles ?? []}
          emptyContent={(
            <EmptyState
              description="Aucun Article global."
              title="Aucun Article"
            />
          )}
          getRowKey={(article) => article.id}
        />
      ) : (
        <DataTable
          caption="Catalogues fournisseur globaux"
          columns={catalogColumns}
          data={catalogQuery.data?.catalogs ?? []}
          emptyContent={(
            <EmptyState
              description="Aucun catalogue global."
              title="Aucun catalogue"
            />
          )}
          getRowKey={(catalog) => catalog.id}
        />
      )}

      <SupplierFormDialog
        mode="global"
        onClose={() => setSupplierDialog({ open: false, supplier: null })}
        onSaved={(saved) => {
          setSupplierDialog({ open: false, supplier: null });
          toast({
            title: 'Fournisseur global enregistré',
            description: saved.name,
            variant: 'success',
          });
        }}
        open={supplierDialog.open}
        supplier={supplierDialog.supplier}
      />

      <SupplierCatalogImportDialog
        mode="global"
        onClose={() => setImportOpen(false)}
        onCommitted={(result) => {
          setImportOpen(false);
          toast({
            title: 'Import global terminé',
            description:
              String(result.changedLines ?? 0)
              + ' ligne(s) ajoutée(s) ou révisée(s).',
            variant: 'success',
          });
        }}
        open={importOpen}
        suppliers={activeSuppliers}
      />
    </div>
  );
}

export { SupplierReferencePage };
