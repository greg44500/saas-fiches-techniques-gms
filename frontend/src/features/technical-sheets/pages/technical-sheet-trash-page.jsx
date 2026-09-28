import { RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import {
  DataTable,
  DataTableActions,
} from '@/components/data-display/data-table';
import { DataPagination } from '@/components/data-display/data-pagination';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  useGetTechnicalSheetCapacityQuery,
  useGetWorkspaceBusinessSettingsQuery,
  useListTechnicalSheetTrashQuery,
  usePurgeExpiredTechnicalSheetTrashMutation,
  usePurgeTechnicalSheetMutation,
  useRestoreTechnicalSheetMutation,
  useUpdateWorkspaceTrashRetentionMutation,
} from '@/features/technical-sheets/api/technical-sheets-api';
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
  const settingsQuery = useGetWorkspaceBusinessSettingsQuery(
    workspace.id,
    { skip: !isOwner },
  );
  const capacityQuery = useGetTechnicalSheetCapacityQuery(workspace.id);
  const [restoreSheet, restoreState] = useRestoreTechnicalSheetMutation();
  const [purgeSheet, purgeState] = usePurgeTechnicalSheetMutation();
  const [purgeExpired, purgeExpiredState] =
    usePurgeExpiredTechnicalSheetTrashMutation();
  const [updateRetention, updateRetentionState] =
    useUpdateWorkspaceTrashRetentionMutation();

  const [retentionDays, setRetentionDays] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    if (!settingsQuery.data) return;
    setRetentionDays(String(settingsQuery.data.trashRetentionDays));
  }, [settingsQuery.data]);

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
  const capacity = capacityQuery.data;
  const canRestore = can(TECHNICAL_SHEET_PERMISSION.RESTORE);
  const canPurge = can(TECHNICAL_SHEET_PERMISSION.PURGE);
  const canSettings = can(TECHNICAL_SHEET_PERMISSION.SETTINGS_MANAGE);

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
        title: 'Fiche technique purgée définitivement',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Purge impossible',
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
        title: 'Purge des échéances terminée',
        description: result.purged + ' Fiche(s) purgée(s).',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Purge impossible',
        description: getTechnicalSheetApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  async function saveRetention() {
    const parsed = Number(retentionDays);

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 90) {
      toast({
        title: 'Durée invalide',
        description: 'La durée doit être comprise entre 1 et 90 jours.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateRetention({
        workspaceId: workspace.id,
        trashRetentionDays: parsed,
      }).unwrap();
      toast({
        title: 'Durée de conservation mise à jour',
        description: 'Les échéances déjà figées ne sont pas recalculées.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Modification impossible',
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
      header: 'Purge prévue',
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
              Purger
            </Button>
          )}
        </DataTableActions>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Button asChild size="sm" variant="ghost">
          <Link to={'/workspaces/' + workspace.id + '/dashboard'}>
            Retour au tableau de bord
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Corbeille des Fiches techniques
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Une Fiche supprimée continue de consommer une unité de capacité jusqu’à sa purge définitive.
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Capacité</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {capacity
                ? capacity.current + ' / ' + (capacity.unlimited ? 'illimité' : capacity.limit)
                : '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conservation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field>
              <FieldLabel htmlFor="technical-sheet-trash-retention">
                Durée de conservation (jours)
              </FieldLabel>
              <Input
                disabled={!canSettings || updateRetentionState.isLoading}
                id="technical-sheet-trash-retention"
                max={90}
                min={1}
                onChange={(event) => setRetentionDays(event.target.value)}
                type="number"
                value={retentionDays}
              />
            </Field>
            <p className="text-sm text-muted-foreground">
              Une modification s’applique uniquement aux futures mises en corbeille.
            </p>
            {canSettings && (
              <Button
                disabled={updateRetentionState.isLoading}
                onClick={saveRetention}
                type="button"
                variant="outline"
              >
                Enregistrer la durée
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {canPurge && (
        <div className="flex justify-end">
          <Button
            disabled={purgeExpiredState.isLoading}
            onClick={purgeExpiredItems}
            type="button"
            variant="outline"
          >
            Purger les échéances atteintes
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <DataTable
            aria-label="Corbeille des Fiches techniques"
            columns={columns}
            data={sheets}
            emptyContent={(
              <EmptyState
                description="Aucune Fiche technique n’attend une restauration ou une purge."
                title="Corbeille vide"
              />
            )}
            getRowKey={(sheet) => sheet.id}
          />
          <DataPagination
            disabled={trashQuery.isFetching}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            page={page}
            pageSize={pageSize}
            pagination={pagination}
          />
        </CardContent>
      </Card>

      {confirmation && (
        <ConfirmationDialog
          confirmLabel="Purger définitivement"
          description="Cette opération supprime définitivement la Fiche, son brouillon éventuel et tout son historique validé. Elle libère une unité de capacité."
          onCancel={() => setConfirmation(null)}
          onConfirm={confirmPurge}
          pending={purgeState.isLoading}
          title="Purger définitivement cette Fiche ?"
        />
      )}
    </div>
  );
}

export { TechnicalSheetTrashPage };
