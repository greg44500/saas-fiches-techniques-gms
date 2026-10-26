import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable } from '@/components/data-display/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ProcessSheetCreateDialog,
} from '@/features/process-sheets/components/process-sheet-create-dialog';
import { useListProcessSheetsQuery } from '@/features/process-sheets/api/process-sheets-api';
import {
  PROCESS_SHEET_PERMISSION,
} from '@/features/process-sheets/constants/process-sheet-permissions';
import { TECHNICAL_SHEET_PERMISSION } from '@/features/technical-sheets/constants/technical-sheet-permissions';
import { useGetDossierByIdQuery } from '@/features/dossiers/api/dossiers-api';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { useDataPagination } from '@/hooks/use-data-pagination';

function ProcessSheetsPage() {
  const { dossierId } = useParams();
  const navigate = useNavigate();
  const { can, workspace } = useWorkspaceContext();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const { page, pageSize, setPage, setPageSize } = useDataPagination();
  const list = useListProcessSheetsQuery({
    workspaceId: workspace.id, dossierId, page, limit: pageSize,
    search: search.trim() || undefined,
  });
  const dossier = useGetDossierByIdQuery({ workspaceId: workspace.id, dossierId });
  const canCreate = can(PROCESS_SHEET_PERMISSION.CREATE)
    && can(TECHNICAL_SHEET_PERMISSION.READ)
    && dossier.data?.status === 'ACTIVE';

  const columns = [
    {
      id: 'title',
      header: 'Fiche process',
      cell: (process) => <span className="font-medium">{process.title}</span>,
    },
    {
      id: 'technicalSheet',
      header: 'Fiche technique associée',
      cell: (process) => process.technicalSheetName ?? 'Fiche technique indisponible',
    },
    {
      id: 'editorialState',
      header: 'État',
      cell: (process) => process.editorialState === 'VALIDATED' ? 'Validée' : 'Brouillon',
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (process) => process.status === 'ARCHIVED' ? 'Archivée' : 'Active',
    },
    {
      id: 'updatedAt',
      header: 'Dernière modification',
      cell: (process) => new Date(process.updatedAt).toLocaleString('fr-FR'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (process) => (
        <Button
          aria-label={'Ouvrir la Fiche process ' + process.title}
          onClick={() => navigate(
            '/workspaces/' + workspace.id + '/dossiers/' + dossierId
              + '/process-sheets/' + process.id,
          )}
          size="sm"
          type="button"
          variant="outline"
        >
          Ouvrir
        </Button>
      ),
    },
  ];

  function onCreated(process) {
    setCreateOpen(false);
    navigate(
      '/workspaces/' + workspace.id + '/dossiers/' + dossierId
        + '/process-sheets/' + process.id,
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight">Fiches process</h2>
          <InfoTooltip
            label="À propos des Fiches process"
            content="Procédures de fabrication associées aux Fiches techniques du Dossier. Chaque Fiche technique peut avoir au maximum une Fiche process."
          />
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} size="sm" type="button">
            <Plus aria-hidden="true" className="size-4" />
            Créer une Fiche process
          </Button>
        )}
      </header>

      <section className="overflow-hidden rounded-xl border border-border bg-card" aria-label="Liste des Fiches process">
        <div className="border-b border-border p-4">
          <div className="relative max-w-xl">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              aria-label="Rechercher une Fiche process"
              className="pl-9"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Rechercher une Fiche process…"
              value={search}
            />
          </div>
        </div>
        {list.isLoading && !list.data ? (
          <p className="p-5 text-sm text-muted-foreground">Chargement des Fiches process…</p>
        ) : list.isError ? (
          <ErrorState
            title="Fiches process indisponibles"
            description="La liste des Fiches process du Dossier n’a pas pu être chargée."
            onRetry={list.refetch}
          />
        ) : (
          <>
            <DataTable
              aria-label="Fiches process du Dossier"
              columns={columns}
              data={list.data?.processes ?? []}
              emptyContent={(
                <EmptyState
                  className="p-0"
                  title="Aucune Fiche process"
                  description={search.trim()
                    ? 'Aucune Fiche process ne correspond à votre recherche.'
                    : 'Créez une Fiche process à partir d’une Fiche technique validée.'}
                />
              )}
              getRowKey={(process) => process.id}
            />
            <div className="px-4 pb-4">
              <DataPagination
                disabled={list.isFetching}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                page={page}
                pageSize={pageSize}
                pagination={list.data?.pagination}
              />
            </div>
          </>
        )}
      </section>

      {createOpen && (
        <ProcessSheetCreateDialog
          dossierId={dossierId}
          onClose={() => setCreateOpen(false)}
          onCreated={onCreated}
          open={createOpen}
          workspaceId={workspace.id}
        />
      )}
    </div>
  );
}

export { ProcessSheetsPage };
