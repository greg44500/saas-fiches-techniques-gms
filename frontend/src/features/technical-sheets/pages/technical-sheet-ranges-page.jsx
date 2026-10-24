import { Archive, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { DataTable } from '@/components/data-display/data-table';
import { DataPagination } from '@/components/data-display/data-pagination';
import { TableRowActionsMenu } from '@/components/data-display/table-row-actions-menu';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useChangeTechnicalSheetRangeStatusMutation,
  useCreateTechnicalSheetRangeMutation,
  useDeleteTechnicalSheetRangeMutation,
  useListTechnicalSheetRangesQuery,
  useUpdateTechnicalSheetRangeMutation,
} from '@/features/technical-sheets/api/technical-sheets-api';
import { TECHNICAL_SHEET_PERMISSION } from '@/features/technical-sheets/constants/technical-sheet-permissions';
import {
  getTechnicalSheetApiErrorMessage,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { useDataPagination } from '@/hooks/use-data-pagination';

function TechnicalSheetRangesPage() {
  const { workspace, can } = useWorkspaceContext();
  const { toast } = useToast();
  const canRead = can(TECHNICAL_SHEET_PERMISSION.READ);
  const canManage = can(TECHNICAL_SHEET_PERMISSION.RANGE_MANAGE);
  const { page, pageSize, setPage, setPageSize } = useDataPagination();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const query = useListTechnicalSheetRangesQuery({
    workspaceId: workspace.id,
    page, limit: pageSize,
    search: search.trim() || undefined,
    status: status || undefined,
  }, { skip: !canRead });
  const [createRange, createState] = useCreateTechnicalSheetRangeMutation();
  const [renameRange, renameState] = useUpdateTechnicalSheetRangeMutation();
  const [transitionRange, transitionState] = useChangeTechnicalSheetRangeStatusMutation();
  const [deleteRange, deleteState] = useDeleteTechnicalSheetRangeMutation();
  const busy = createState.isLoading || renameState.isLoading || transitionState.isLoading || deleteState.isLoading;

  async function submit() {
    if (!name.trim() || busy) return;
    setError('');
    try {
      if (editing) {
        await renameRange({
          workspaceId: workspace.id, rangeId: editing.id,
          expectedRevision: editing.revision, name: name.trim(),
        }).unwrap();
      } else {
        await createRange({ workspaceId: workspace.id, name: name.trim() }).unwrap();
      }
      toast({ title: editing ? 'Gamme renommée' : 'Gamme créée', variant: 'success' });
      setEditing(null);
      setName('');
    } catch (failure) {
      setError(getTechnicalSheetApiErrorMessage(failure, 'La Gamme n’a pas pu être enregistrée.'));
    }
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
              disabled: busy, onClick: () => { setEditing(range); setName(range.name); setError(''); },
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
      <header>
        <h1 className="text-2xl font-semibold">Gammes de Fiches techniques</h1>
        <p className="text-sm text-muted-foreground">
          Référentiel commun au Workspace. Les Fiches restent propres à chaque Dossier.
        </p>
      </header>

      {canManage && (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          <label className="text-sm font-medium" htmlFor="range-name">
            {editing ? 'Renommer la gamme' : 'Nouvelle gamme'}
          </label>
          <div className="flex flex-wrap gap-2">
            <Input
              className="min-w-48 flex-1"
              disabled={busy}
              id="range-name"
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              value={name}
              placeholder="Ex. Snacking"
            />
            {editing && (
              <Button
                disabled={busy}
                onClick={() => { setEditing(null); setName(''); setError(''); }}
                type="button"
                variant="outline"
              >Annuler</Button>
            )}
            <Button
              disabled={!name.trim() || busy}
              onClick={submit}
              type="button"
            >{editing ? 'Enregistrer' : 'Créer la gamme'}</Button>
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Input
          aria-label="Rechercher une gamme"
          className="max-w-sm"
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          placeholder="Rechercher une gamme…"
          value={search}
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
          <SelectTrigger aria-label="Filtrer les gammes par statut">
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
