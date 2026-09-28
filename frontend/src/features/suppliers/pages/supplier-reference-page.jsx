import { Archive, Eye, FileUp, Pencil, Plus, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';

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
  SupplierDetailsDrawer,
} from '@/features/suppliers/components/supplier-details-drawer';
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
  const [supplierDetails, setSupplierDetails] = useState({
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
          {canManage && (
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
                onClick={() => toggleStatus(
                  updateSupplierStatus,
                  supplier,
                  'supplierId',
                )}
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
        <DataTableActions>
          <ActionIconButton
            Icon={article.status === 'ACTIVE' ? Archive : RotateCcw}
            disabled={articleStatusState.isLoading}
            label={
              (article.status === 'ACTIVE' ? 'Archiver ' : 'Réactiver ')
              + article.supplierReference
            }
            onClick={() => toggleStatus(
              updateArticleStatus,
              article,
              'articleId',
            )}
            tooltipLabel={
              article.status === 'ACTIVE' ? 'Archiver' : 'Réactiver'
            }
            variant="outline"
          />
        </DataTableActions>
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
        <DataTableActions>
          <ActionIconButton
            Icon={catalog.status === 'ACTIVE' ? Archive : RotateCcw}
            disabled={catalogStatusState.isLoading}
            label={
              (catalog.status === 'ACTIVE' ? 'Archiver ' : 'Réactiver ')
              + catalog.name
            }
            onClick={() => toggleStatus(
              updateCatalogStatus,
              catalog,
              'catalogId',
            )}
            tooltipLabel={
              catalog.status === 'ACTIVE' ? 'Archiver' : 'Réactiver'
            }
            variant="outline"
          />
        </DataTableActions>
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
        <div className="flex items-start gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Référentiel Fournisseurs
          </h1>
          <InfoTooltip
            content="Gouvernance des identités et catalogues partagés, indépendante des rôles d’administration de la plateforme."
            label="À propos du référentiel Fournisseurs"
          />
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
          emptyCellClassName="border-b border-border text-muted-foreground"
          headerClassName="border-b border-border bg-muted/50 text-muted-foreground"
          rowClassName="border-b border-border transition-colors hover:bg-muted/50"
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
          emptyCellClassName="border-b border-border text-muted-foreground"
          headerClassName="border-b border-border bg-muted/50 text-muted-foreground"
          rowClassName="border-b border-border transition-colors hover:bg-muted/50"
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
          emptyCellClassName="border-b border-border text-muted-foreground"
          headerClassName="border-b border-border bg-muted/50 text-muted-foreground"
          rowClassName="border-b border-border transition-colors hover:bg-muted/50"
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

      <SupplierDetailsDrawer
        canManage={canManage}
        canReadArticles
        canReadCatalogs
        mode="global"
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
      />

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
