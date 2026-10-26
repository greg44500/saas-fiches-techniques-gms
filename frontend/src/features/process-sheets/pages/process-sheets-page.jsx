import { Search } from 'lucide-react';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable } from '@/components/data-display/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ProcessSheetCompositionPanel,
} from '@/features/process-sheets/components/process-sheet-composition-panel';
import {
  useListTechnicalSheetsQuery,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  getTechnicalSheetEditorialPresentation,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { useDataPagination } from '@/hooks/use-data-pagination';

function ProcessSheetsPage() {
  const { dossierId } = useParams();
  const { workspace } = useWorkspaceContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const { page, pageSize, setPage, setPageSize } = useDataPagination();
  const selectedId = searchParams.get('sheet');
  const listQuery = useListTechnicalSheetsQuery({
    workspaceId: workspace.id,
    dossierId,
    page,
    limit: pageSize,
    status: 'ACTIVE',
    search: search.trim() || undefined,
  });

  function selectSheet(id) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('sheet', id);
      return next;
    });
  }

  const sheets = listQuery.data?.sheets ?? [];
  const columns = [
    {
      id: 'name',
      header: 'Fiche technique',
      cell: (sheet) => <span className="font-medium">{sheet.name}</span>,
    },
    {
      id: 'state',
      header: 'Composition M-004',
      cell: (sheet) => getTechnicalSheetEditorialPresentation({
        currentValidatedStateId: sheet.currentValidatedStateId,
        hasDraft: sheet.hasDraft,
      }).label,
    },
    {
      id: 'action',
      header: 'Consultation',
      cell: (sheet) => (
        <Button
          aria-label={'Consulter les ingrédients de ' + sheet.name}
          aria-pressed={selectedId === sheet.id}
          onClick={() => selectSheet(sheet.id)}
          size="sm"
          type="button"
          variant={selectedId === sheet.id ? 'secondary' : 'outline'}
        >
          {selectedId === sheet.id ? 'Sélectionnée' : 'Consulter'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Fiches process</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Première étape de préparation : consultez les ingrédients de vos
          Fiches techniques. La création, la validation et l'impression des
          Fiches process seront disponibles après l'intégration de leur cycle
          de vie au backend.
        </p>
      </header>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card" aria-label="Sélection de la Fiche technique">
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label="Rechercher une Fiche technique pour le process"
                className="pl-9"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Rechercher une Fiche technique…"
                value={search}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Sélection parmi les Fiches techniques actives du Dossier.
            </p>
          </div>
          {listQuery.isLoading && !listQuery.data ? (
            <p className="p-5 text-sm text-muted-foreground">Chargement des Fiches techniques…</p>
          ) : listQuery.isError ? (
            <ErrorState
              title="Liste des Fiches techniques indisponible"
              description="Impossible de charger les Fiches techniques du Dossier."
              onRetry={listQuery.refetch}
            />
          ) : (
            <>
              <DataTable
                aria-label="Fiches techniques disponibles pour consultation process"
                columns={columns}
                data={sheets}
                getRowKey={(sheet) => sheet.id}
                emptyContent={(
                  <EmptyState
                    className="p-0"
                    title="Aucune Fiche technique active"
                    description={search.trim()
                      ? 'Aucun résultat ne correspond à votre recherche.'
                      : 'Aucune Fiche technique active dans ce Dossier.'}
                  />
                )}
              />
              <div className="px-4 pb-4">
                <DataPagination
                  disabled={listQuery.isFetching}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  page={page}
                  pageSize={pageSize}
                  pagination={listQuery.data?.pagination}
                />
              </div>
            </>
          )}
        </section>
        <section aria-label="Aperçu des ingrédients" className="min-w-0">
          <ProcessSheetCompositionPanel
            dossierId={dossierId}
            technicalSheetId={selectedId}
            workspaceId={workspace.id}
          />
        </section>
      </div>
    </div>
  );
}

export { ProcessSheetsPage };
