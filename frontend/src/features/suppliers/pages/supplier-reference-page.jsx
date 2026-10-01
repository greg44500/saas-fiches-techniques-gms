import { Archive, Eye, FileUp, Pencil, Plus, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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
import { useDataPagination } from '@/hooks/use-data-pagination';

function SupplierReferencePage({ canManage, embedded = false }) {
  const { toast } = useToast();
  const {
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useDataPagination();
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
    search: search || undefined,
    status,
    page,
    limit: pageSize,
  });
  const activeSupplierQuery = useListGlobalSuppliersQuery({
    limit: 100,
    status: 'ACTIVE',
  });
  const articleQuery = useListGlobalSupplierArticlesQuery({
    search: search || undefined,
    status,
    page,
    limit: pageSize,
  });
  const catalogQuery = useListGlobalSupplierCatalogsQuery({
    status,
    page,
    limit: pageSize,
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

    const nextSearch = searchInput.trim();
    if (!nextSearch) return;
    setPage(1);
    setSearch(nextSearch);
  }

  function changeSection(nextSection) {
    setPage(1);
    setSection(nextSection);
  }

  function changeStatus(nextStatus) {
    setPage(1);
    setStatus(nextStatus);
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

  useEffect(() => {
    const totalPages = currentQuery.data?.pagination?.totalPages;

    if (totalPages && page > totalPages) {
      setPage(totalPages);
    }
  }, [currentQuery.data?.pagination?.totalPages, page, setPage]);

  const Heading = embedded ? 'h2' : 'h1';

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-2">
          <Heading className="text-2xl font-semibold tracking-tight">
            Référentiel Fournisseurs
          </Heading>
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

      <Tabs onValueChange={changeSection} value={section}>
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

      <section className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-end">
          {(section === 'suppliers' || section === 'articles') && (
            <form className="flex min-w-0 flex-1 gap-2" onSubmit={applySearch}>
              <Input
                aria-label="Rechercher dans le référentiel Fournisseurs"
                maxLength={120}
                onChange={(event) => {
                  const value = event.target.value;
                  setSearchInput(value);

                  if (!value.trim() && search) {
                    setPage(1);
                    setSearch('');
                  }
                }}
                placeholder="Rechercher…"
                value={searchInput}
              />
              <Button
                disabled={!searchInput.trim()}
                type="submit"
                variant="outline"
              >
                Rechercher
              </Button>
            </form>
          )}

          <div className="w-full md:ml-auto md:w-52 md:shrink-0">
            <p className="mb-2 text-sm font-medium">Statut</p>
            <Select
              items={[
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
                <SelectItem value="ACTIVE">Actifs</SelectItem>
                <SelectItem value="ARCHIVED">Archivés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {currentQuery.isLoading && currentQuery.data === undefined ? (
          <p className="p-5 text-sm text-muted-foreground">Chargement…</p>
        ) : currentQuery.isError ? (
          <ErrorState
            description="Le référentiel Fournisseurs n’a pas pu être chargé."
            onRetry={currentQuery.refetch}
            title="Référentiel indisponible"
          />
        ) : (
          <>
            {section === 'suppliers' ? (
              <DataTable
                caption="Fournisseurs globaux"
                columns={supplierColumns}
                data={suppliers}
                emptyContent={(
                  <EmptyState
                    className="p-0"
                    description="Aucun Fournisseur global."
                    title="Aucun Fournisseur"
                  />
                )}
                getRowKey={(supplier) => supplier.id}
                rowClassName="transition-colors hover:bg-muted/50"
              />
            ) : section === 'articles' ? (
              <DataTable
                caption="Articles fournisseur globaux"
                columns={articleColumns}
                data={articleQuery.data?.articles ?? []}
                emptyContent={(
                  <EmptyState
                    className="p-0"
                    description="Aucun Article global."
                    title="Aucun Article"
                  />
                )}
                getRowKey={(article) => article.id}
                rowClassName="transition-colors hover:bg-muted/50"
              />
            ) : (
              <DataTable
                caption="Catalogues fournisseur globaux"
                columns={catalogColumns}
                data={catalogQuery.data?.catalogs ?? []}
                emptyContent={(
                  <EmptyState
                    className="p-0"
                    description="Aucun catalogue global."
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
                    ? 'Pagination du référentiel Fournisseurs'
                    : section === 'articles'
                      ? 'Pagination des Articles fournisseur globaux'
                      : 'Pagination des catalogues fournisseur globaux'
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
