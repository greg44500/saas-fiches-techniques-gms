import { ArrowLeft, Eye, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { DataPagination } from '@/components/data-display/data-pagination';
import {
  DataTable,
  DataTableActions,
} from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { StatusBadge } from '@/components/shared/status-badge';
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
  useListSupplierCatalogLinesQuery,
} from '@/features/suppliers/api/supplier-api';
import {
  formatPackaging,
  getSupplierStatusLabel,
  getSupplierStatusTone,
} from '@/features/suppliers/lib/supplier-presentation';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';
import { useDataPagination } from '@/hooks/use-data-pagination';

const ALL_MATCH_STATUSES = 'ALL';

function formatDate(value, fallback = 'Non renseignée') {
  return value
    ? new Date(value).toLocaleDateString('fr-FR')
    : fallback;
}

function formatCatalogLinePrice(sourcePrice, packaging) {
  if (sourcePrice?.amount == null) return 'Non communiqué';

  const amount = Number(sourcePrice.amount).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
  const basisLabels = {
    PACKAGE: packaging?.containerType || 'conditionnement',
    KG: 'kg',
    L: 'L',
    UNIT: 'pièce',
  };

  return amount
    + ' '
    + (sourcePrice.currency ?? 'EUR')
    + ' / '
    + (basisLabels[sourcePrice.basis] ?? sourcePrice.basis ?? '—');
}

function getAssociationLabel(status) {
  const labels = {
    MATCHED: 'Associé',
    UNMATCHED: 'À associer',
    AMBIGUOUS: 'À vérifier',
    IGNORED: 'Ignoré',
  };

  return labels[status] ?? 'Non renseigné';
}

function getMatchStatusTone(status) {
  if (status === 'MATCHED') return 'success';
  if (status === 'IGNORED') return 'neutral';
  return 'warning';
}

function SupplierCatalogPage() {
  const navigate = useNavigate();
  const { catalogId } = useParams();
  const { workspace } = useWorkspaceContext();
  const {
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useDataPagination();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [matchStatus, setMatchStatus] = useState(ALL_MATCH_STATUSES);

  const catalogQuery = useListSupplierCatalogLinesQuery({
    workspaceId: workspace.id,
    catalogId,
    page,
    limit: pageSize,
    search: search || undefined,
    matchStatus:
      matchStatus === ALL_MATCH_STATUSES
        ? undefined
        : matchStatus,
  });

  const catalog = catalogQuery.data?.catalog;
  const lines = catalogQuery.data?.lines ?? [];
  const totalReferences = catalog?.lineCount ?? 0;
  const filteredTotal = catalogQuery.data?.pagination?.total ?? 0;

  useEffect(() => {
    const totalPages = catalogQuery.data?.pagination?.totalPages;

    if (totalPages && page > totalPages) {
      setPage(totalPages);
    }
  }, [catalogQuery.data?.pagination?.totalPages, page, setPage]);

  function applySearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function openArticle(line) {
    if (!line.supplierArticleId) return;

    const params = new URLSearchParams({
      section: 'articles',
    });

    if (line.supplierReference) {
      params.set('search', line.supplierReference);
    }

    navigate(
      '/workspaces/'
      + workspace.id
      + '/suppliers?'
      + params.toString(),
    );
  }

  const columns = [
    {
      id: 'reference',
      header: 'Référence',
      cell: (line) => (
        <div>
          <p className="font-medium">
            {line.supplierReference || 'Sans référence'}
          </p>

        </div>
      ),
    },
    {
      id: 'designation',
      header: 'Désignation',
      cell: (line) => (
        <div>
          <p>{line.designation || 'Non renseignée'}</p>
          {line.brand && line.brand.toLocaleLowerCase('fr-FR') !== catalog?.supplierName?.toLocaleLowerCase('fr-FR') && (
            <p className="mt-1 text-xs text-muted-foreground">
              {line.brand}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'packaging',
      header: 'Conditionnement',
      cell: (line) => formatPackaging(line.packaging),
    },
    {
      id: 'price',
      header: 'Tarif source',
      cell: (line) => formatCatalogLinePrice(
        line.sourcePrice,
        line.packaging,
      ),
    },
    {
      id: 'match',
      header: 'Association produit',
      cell: (line) => (
        <StatusBadge tone={getMatchStatusTone(line.matchStatus)}>
          {getAssociationLabel(line.matchStatus)}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (line) => line.supplierArticleId ? (
        <DataTableActions>
          <ActionIconButton
            Icon={Eye}
            label={
              'Voir l’Article '
              + (line.supplierReference || line.designation || '')
            }
            onClick={() => openArticle(line)}
            tooltipLabel="Voir dans les Articles"
            variant="outline"
          />
        </DataTableActions>
      ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Button
            onClick={() => navigate(
              '/workspaces/'
              + workspace.id
              + '/suppliers?section=catalogs',
            )}
            type="button"
            variant="ghost"
            title="Retour aux catalogues"
            aria-label="Retour aux catalogues"
            size="icon"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            <span className="sr-only">Retour aux catalogues</span>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {catalog?.supplierName ? catalog.supplierName + ' | ' : ''}{catalog?.name ?? 'Catalogue fournisseur'}
              </h1>
              <InfoTooltip
                content="Consultez les références importées, leur tarif source et leur état de rapprochement avec le référentiel Produit."
                label="À propos du catalogue fournisseur"
              />
            </div>

          </div>

          {catalog && (
            <StatusBadge tone={getSupplierStatusTone(catalog.status)}>
              {getSupplierStatusLabel(catalog.status)}
            </StatusBadge>
          )}
        </div>
      </header>

      {catalogQuery.isLoading && catalogQuery.data === undefined ? (
        <p className="text-sm text-muted-foreground">
          Chargement du catalogue…
        </p>
      ) : catalogQuery.isError ? (
        <ErrorState
          description="Le catalogue fournisseur n’a pas pu être chargé."
          onRetry={catalogQuery.refetch}
          title="Catalogue indisponible"
        />
      ) : (
        <>
          <section
            aria-label="Informations du catalogue"
            className="flex flex-wrap gap-x-8 gap-y-3 rounded-xl border border-border bg-card px-4 py-3"
          >
            <div>
              <p className="text-xs text-muted-foreground">Date d’édition</p>
              <p className="mt-1 text-sm font-medium">
                {catalog?.editionDate
                  ? formatDate(catalog.editionDate)
                  : catalog?.integratedAt
                    ? 'Importé le ' + formatDate(catalog.integratedAt)
                    : 'Non renseignée'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Période</p>
              <p className="mt-1 text-sm font-medium">
                {catalog?.validFrom && catalog?.validTo
                  ? formatDate(catalog.validFrom) + ' – ' + formatDate(catalog.validTo)
                  : catalog?.validFrom
                    ? 'Depuis le ' + formatDate(catalog.validFrom)
                    : catalog?.validTo
                      ? 'Jusqu’au ' + formatDate(catalog.validTo)
                      : 'Non renseignée'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lignes du catalogue</p>
              <p className="mt-1 text-sm font-medium tabular-nums">
                {totalReferences}
              </p>
            </div>
            {catalog?.source && (
              <div>
                <p className="text-xs text-muted-foreground">Provenance</p>
                <p className="mt-1 text-sm font-medium">{catalog.source}</p>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card">
            <div className="flex flex-col gap-3 border-b border-border p-5 lg:flex-row lg:items-end">
              <form
                className="flex min-w-0 flex-1 gap-2"
                onSubmit={applySearch}
              >
                <Input
                  aria-label="Rechercher dans le catalogue"
                  maxLength={120}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSearchInput(value);

                    if (!value.trim() && search) {
                      setPage(1);
                      setSearch('');
                    }
                  }}
                  placeholder="Référence, désignation ou marque…"
                  value={searchInput}
                />
                <Button type="submit" variant="outline">
                  <Search aria-hidden="true" className="size-4" />
                  Rechercher
                </Button>
              </form>

              <div className="w-full lg:w-60">
                <p className="mb-2 text-sm font-medium">
                  Association produit
                </p>
                <Select
                  items={[
                    { value: ALL_MATCH_STATUSES, label: 'Tous' },
                    { value: 'MATCHED', label: 'Associés' },
                    { value: 'UNMATCHED', label: 'À associer' },
                    { value: 'AMBIGUOUS', label: 'À vérifier' },
                    { value: 'IGNORED', label: 'Ignorés' },
                  ]}
                  onValueChange={(value) => {
                    setPage(1);
                    setMatchStatus(value);
                  }}
                  value={matchStatus}
                >
                  <SelectTrigger aria-label="Filtrer par rapprochement">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_MATCH_STATUSES}>Tous</SelectItem>
                    <SelectItem value="MATCHED">Associés</SelectItem>
                    <SelectItem value="UNMATCHED">À associer</SelectItem>
                    <SelectItem value="AMBIGUOUS">À vérifier</SelectItem>
                    <SelectItem value="IGNORED">Ignorés</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {search || matchStatus !== ALL_MATCH_STATUSES ? (
              <p className="px-5 pt-4 text-sm text-muted-foreground">
                {filteredTotal} résultat(s) sur {totalReferences} référence(s).
              </p>
            ) : null}

            <DataTable
              caption="Références du catalogue fournisseur"
              columns={columns}
              data={lines}
              emptyContent={(
                <EmptyState
                  className="p-0"
                  description="Aucune référence ne correspond aux critères."
                  title="Aucune référence"
                />
              )}
              getRowKey={(line) => line.id}
              rowClassName="transition-colors hover:bg-muted/50"
            />

            <div className="px-5 pb-5">
              <DataPagination
                ariaLabel="Pagination des références du catalogue"
                disabled={catalogQuery.isFetching}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                page={page}
                pageSize={pageSize}
                pagination={catalogQuery.data?.pagination}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export {
  ALL_MATCH_STATUSES,
  SupplierCatalogPage,
  formatCatalogLinePrice,
  getMatchStatusTone,
};
