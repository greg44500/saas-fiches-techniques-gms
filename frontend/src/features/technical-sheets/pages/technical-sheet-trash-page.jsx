import { RotateCcw, Settings2, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  DataTable,
  DataTableActions,
} from '@/components/data-display/data-table';
import { DataPagination } from '@/components/data-display/data-pagination';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  useListTechnicalSheetTrashQuery,
  usePurgeExpiredTechnicalSheetTrashMutation,
  usePurgeTechnicalSheetMutation,
  useRestoreTechnicalSheetMutation,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  TechnicalSheetTrashSettingsDialog,
} from '@/features/technical-sheets/components/technical-sheet-trash-settings-dialog';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';
import {
  getTechnicalSheetApiErrorMessage,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';
import { useDataPagination } from '@/hooks/use-data-pagination';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

function TechnicalSheetTrashPage() {
  const { can, membership, workspace } = useWorkspaceContext();
  const { toast } = useToast();
  const { page, pageSize, setPage, setPageSize } = useDataPagination();
  const isOwner = membership?.role?.key === 'owner';

  const trashQuery = useListTechnicalSheetTrashQuery(
    {
      workspaceId: workspace.id,
      page,
      limit: pageSize,
    },
    { skip: !isOwner },
  );
  const [restoreSheet, restoreState] = useRestoreTechnicalSheetMutation();
  const [purgeSheet, purgeState] = usePurgeTechnicalSheetMutation();
  const [purgeExpired, purgeExpiredState] =
    usePurgeExpiredTechnicalSheetTrashMutation();
  const [confirmation, setConfirmation] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!isOwner) {
    return (
      <section className="space-y-2 rounded-xl border border-border bg-card p-6">
        <h1 className="text-2xl font-semibold">Accès refusé</h1>
        <p className="text-sm text-muted-foreground">
          La corbeille globale des Fiches techniques est réservée au propriétaire du Workspace.
        </p>
      </section>
    );
  }

  if (trashQuery.isLoading && !trashQuery.data) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement de la corbeille…
      </p>
    );
  }

  if (trashQuery.isError) {
    return (
      <ErrorState
        description="La corbeille des Fiches techniques n’a pas pu être chargée."
        onRetry={trashQuery.refetch}
        title="Corbeille indisponible"
      />
    );
  }

  const sheets = trashQuery.data?.sheets ?? [];
  const pagination = trashQuery.data?.pagination;
  const canRestore = can(TECHNICAL_SHEET_PERMISSION.RESTORE);
  const canPurge = can(TECHNICAL_SHEET_PERMISSION.PURGE);
  const canManageSettings = can(TECHNICAL_SHEET_PERMISSION.SETTINGS_MANAGE);

  async function restore(sheet) {
    try {
      await restoreSheet({
        workspaceId: workspace.id,
        dossierId: sheet.dossierId,
        technicalSheetId: sheet.id,
        expectedRevision: sheet.revision,
      }).unwrap();
      toast({
        title: 'Fiche technique restaurée',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Restauration impossible',
        description: getTechnicalSheetApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  async function confirmPurge() {
    if (!confirmation) return;

    try {
      await purgeSheet({
        workspaceId: workspace.id,
        dossierId: confirmation.sheet.dossierId,
        technicalSheetId: confirmation.sheet.id,
        expectedRevision: confirmation.sheet.revision,
      }).unwrap();
      setConfirmation(null);
      toast({
        title: 'Fiche technique supprimée définitivement',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Suppression définitive impossible',
        description: getTechnicalSheetApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  async function purgeExpiredItems() {
    try {
      const result = await purgeExpired({
        workspaceId: workspace.id,
      }).unwrap();
      toast({
        title: 'Suppression des échéances terminée',
        description: result.purged + ' Fiche(s) supprimée(s) définitivement.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Suppression définitive impossible',
        description: getTechnicalSheetApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  const columns = [
    {
      id: 'name',
      header: 'Fiche technique',
      cell: (sheet) => (
        <div>
          <p className="font-medium">{sheet.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Dossier : {sheet.dossierId}
          </p>
        </div>
      ),
    },
    {
      id: 'deletedAt',
      header: 'Suppression',
      cell: (sheet) => new Date(sheet.deletedAt).toLocaleString('fr-FR'),
    },
    {
      id: 'purgeScheduledAt',
      header: 'Suppression définitive prévue',
      cell: (sheet) => new Date(sheet.purgeScheduledAt).toLocaleString('fr-FR'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (sheet) => (
        <DataTableActions>
          {canRestore && (
            <Button
              disabled={restoreState.isLoading}
              onClick={() => restore(sheet)}
              size="sm"
              type="button"
              variant="outline"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Restaurer
            </Button>
          )}
          {canPurge && (
            <Button
              disabled={purgeState.isLoading}
              onClick={() => setConfirmation({ sheet })}
              size="sm"
              type="button"
              variant="destructive"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Supprimer définitivement
            </Button>
          )}
        </DataTableActions>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Corbeille des Fiches techniques
          </h1>
          <InfoTooltip
            content="Les Fiches restent restaurables jusqu’à leur date de suppression définitive et continuent de compter dans la capacité pendant cette période."
            label="À propos de la corbeille"
          />
        </div>

        <div className="flex items-center gap-2">
          {canPurge && (
            <ActionIconButton
              Icon={Trash2}
              disabled={purgeExpiredState.isLoading}
              label="Supprimer les éléments arrivés à échéance"
              onClick={purgeExpiredItems}
              tooltipLabel="Supprimer les éléments arrivés à échéance"
              variant="outline"
            />
          )}
          {canManageSettings && (
            <ActionIconButton
              Icon={Settings2}
              label="Régler la durée de conservation de la Corbeille"
              onClick={() => setSettingsOpen(true)}
              tooltipLabel="Paramètres de la Corbeille"
              variant="outline"
            />
          )}
        </div>
      </header>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <DataTable
          aria-label="Corbeille des Fiches techniques"
          columns={columns}
          data={sheets}
          emptyContent={(
            <EmptyState
              className="p-0"
              description="Aucune Fiche technique n’attend une restauration ou une suppression définitive."
              title="Corbeille vide"
            />
          )}
          getRowKey={(sheet) => sheet.id}
          rowClassName="transition-colors hover:bg-muted/50"
        />
        <div className="px-5 pb-5">
          <DataPagination
            disabled={trashQuery.isFetching}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            page={page}
            pageSize={pageSize}
            pagination={pagination}
          />
        </div>
      </section>

      {settingsOpen && (
        <TechnicalSheetTrashSettingsDialog
          onClose={() => setSettingsOpen(false)}
          open={settingsOpen}
          workspaceId={workspace.id}
        />
      )}

      {confirmation && (
        <ConfirmationDialog
          confirmLabel="Supprimer définitivement"
          description="Cette opération supprime définitivement la Fiche, son brouillon éventuel et tout son historique validé. Elle libère une unité de capacité."
          onCancel={() => setConfirmation(null)}
          onConfirm={confirmPurge}
          pending={purgeState.isLoading}
          title="Supprimer définitivement cette Fiche ?"
        />
      )}
    </div>
  );
}

export { TechnicalSheetTrashPage };
