import { Archive, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { DataTable } from '@/components/data-display/data-table';
import { DataPagination } from '@/components/data-display/data-pagination';
import { TableRowActionsMenu } from '@/components/data-display/table-row-actions-menu';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useChangeTechnicalSheetRangeStatusMutation,
  useDeleteTechnicalSheetRangeMutation,
  useListTechnicalSheetRangesQuery,
} from '@/features/technical-sheets/api/technical-sheets-api';
import { TECHNICAL_SHEET_PERMISSION } from '@/features/technical-sheets/constants/technical-sheet-permissions';
import {
  getTechnicalSheetApiErrorMessage,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { useDataPagination } from '@/hooks/use-data-pagination';
import { TechnicalSheetRangeSearch } from '@/features/technical-sheets/components/technical-sheet-range-search';
import { TechnicalSheetRangeFormDialog } from '@/features/technical-sheets/components/technical-sheet-range-form-dialog';

function TechnicalSheetRangesPage() {
  const { workspace, can } = useWorkspaceContext();
  const { toast } = useToast();
  const canRead = can(TECHNICAL_SHEET_PERMISSION.READ);
  const canManage = can(TECHNICAL_SHEET_PERMISSION.RANGE_MANAGE);
  const { page, pageSize, setPage, setPageSize } = useDataPagination();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const query = useListTechnicalSheetRangesQuery({
    workspaceId: workspace.id,
    page, limit: pageSize,
    search: search.trim() || undefined,
    status: status || undefined,
  }, { skip: !canRead });
  const [transitionRange, transitionState] = useChangeTechnicalSheetRangeStatusMutation();
  const [deleteRange, deleteState] = useDeleteTechnicalSheetRangeMutation();
  const busy = transitionState.isLoading || deleteState.isLoading;
  const handleSearchChange = useCallback((nextSearch) => {
    setSearch(nextSearch);
    setPage(1);
  }, [setPage]);

  function savedRange() {
    toast({ title: editing ? 'Gamme renommée' : 'Gamme créée', variant: 'success' });
    setEditing(null);
    setFormOpen(false);
  }

  async function changeStatus(range) {
    try {
      await transitionRange({
        workspaceId: workspace.id, rangeId: range.id,
        expectedRevision: range.revision,
        action: range.status === 'ACTIVE' ? 'archive' : 'reactivate',
      }).unwrap();
      toast({
        title: range.status === 'ACTIVE' ? 'Gamme archivée' : 'Gamme réactivée',
        variant: 'success',
      });
    } catch (failure) {
      toast({
        title: 'Action impossible',
        description: getTechnicalSheetApiErrorMessage(failure),
        variant: 'destructive',
      });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteRange({
        workspaceId: workspace.id,
        rangeId: deleting.id,
        expectedRevision: deleting.revision,
      }).unwrap();
      toast({ title: 'Gamme supprimée définitivement', variant: 'success' });
      setDeleting(null);
    } catch (failure) {
      toast({
        title: 'Suppression impossible',
        description: getTechnicalSheetApiErrorMessage(failure,
          'La Gamme ne peut être supprimée tant que des Fiches y sont classées.'),
        variant: 'destructive',
      });
    }
  }

  if (!canRead) {
    return <p role="alert">Vous ne disposez pas des droits de consultation des Gammes.</p>;
  }

  const columns = [
    {
      id: 'name', header: 'Gamme',
      cell: (range) => <span className="font-medium">{range.name}</span>,
    },
    {
      id: 'status', header: 'Statut',
      cell: (range) => range.status === 'ACTIVE' ? 'Active' : 'Archivée',
    },
    ...(canManage ? [{
      id: 'actions', header: 'Actions',
      cell: (range) => (
        <TableRowActionsMenu
          label={range.name}
          actions={[
            ...(range.status === 'ACTIVE' ? [{
              key: 'rename', Icon: Pencil, label: 'Renommer',
              disabled: busy, onClick: () => {
                setEditing(range);
                setFormOpen(true);
              },
            }] : []),
            {
              key: 'status',
              Icon: range.status === 'ACTIVE' ? Archive : RotateCcw,
              label: range.status === 'ACTIVE' ? 'Archiver' : 'Réactiver',
              disabled: busy, onClick: () => changeStatus(range),
            },
            {
              key: 'delete', Icon: Trash2, label: 'Supprimer définitivement',
              destructive: true, disabled: busy,
              onClick: () => setDeleting(range),
            },
          ]}
        />
      ),
    }] : []),
  ];

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Gamme de produits finis</h1>
          <InfoTooltip
            label="À propos des gammes de produits finis"
            content="Regroupez vos fiches par activité (snacking, traiteur, pâtisserie…). Les mêmes noms de gammes sont disponibles dans vos différents magasins, mais chaque magasin conserve ses propres fiches."
          />
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            size="sm"
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Créer une gamme
          </Button>
        )}
      </header>

      {!canManage && (
        <p className="text-sm text-muted-foreground">
          Vous pouvez consulter les gammes. Leur création et leur gestion nécessitent une autorisation.
        </p>
      )}
      {canManage && formOpen && (
        <TechnicalSheetRangeFormDialog
          key={editing?.id ?? 'create'}
          onClose={() => {
            setEditing(null);
            setFormOpen(false);
          }}
          onSaved={savedRange}
          range={editing}
          workspaceId={workspace.id}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <TechnicalSheetRangeSearch
          workspaceId={workspace.id}
          status={status}
          onSearchChange={handleSearchChange}
        />
        <Select
          items={[
            { value: 'all', label: 'Toutes' },
            { value: 'ACTIVE', label: 'Actives' },
            { value: 'ARCHIVED', label: 'Archivées' },
          ]}
          onValueChange={(next) => {
            setStatus(next === 'all' ? '' : next);
            setPage(1);
          }}
          value={status || 'all'}
        >
          <SelectTrigger aria-label="Filtrer les gammes par statut" className="w-40 sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="ACTIVE">Actives</SelectItem>
            <SelectItem value="ARCHIVED">Archivées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {query.isError && <p role="alert">Impossible de charger les Gammes.</p>}
      {!query.isError && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <DataTable
            aria-label="Gammes de Fiches techniques"
            columns={columns}
            data={query.data?.ranges ?? []}
            emptyContent={query.isFetching
              ? 'Chargement des gammes…'
              : search.trim()
                ? 'Aucune gamme ne correspond à la recherche.'
                : 'Aucune gamme enregistrée.'}
            getRowKey={(range) => range.id}
          />
          <div className="p-4">
            <DataPagination
              disabled={query.isFetching}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              page={page}
              pageSize={pageSize}
              pagination={query.data?.pagination}
            />
          </div>
        </div>
      )}
      {deleting && (
        <ConfirmationDialog
          confirmLabel="Supprimer définitivement"
          description="Cette opération est irréversible. La suppression sera refusée si une Fiche du Workspace, y compris archivée ou en corbeille, utilise encore cette Gamme."
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
          pending={deleteState.isLoading}
          title={`Supprimer « ${deleting.name} » ?`}
        />
      )}
    </section>
  );
}

export { TechnicalSheetRangesPage };
