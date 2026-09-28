import { useEffect, useState } from 'react';

import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
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
  useGetWorkspaceBusinessSettingsQuery,
  useUpdateWorkspaceTrashRetentionMutation,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';
import {
  getTechnicalSheetApiErrorMessage,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

function TechnicalSheetWorkspaceSettingsPage() {
  const { can, membership, workspace } = useWorkspaceContext();
  const { toast } = useToast();
  const isOwner = membership?.role?.key === 'owner';
  const canManage = can(TECHNICAL_SHEET_PERMISSION.SETTINGS_MANAGE);

  const settingsQuery = useGetWorkspaceBusinessSettingsQuery(
    workspace.id,
    { skip: !isOwner },
  );
  const [updateRetention, updateRetentionState] =
    useUpdateWorkspaceTrashRetentionMutation();
  const [retentionDays, setRetentionDays] = useState('');

  useEffect(() => {
    if (!settingsQuery.data) return;
    setRetentionDays(String(settingsQuery.data.trashRetentionDays));
  }, [settingsQuery.data]);

  if (!isOwner) {
    return (
      <section className="space-y-2 rounded-xl border border-border bg-card p-6">
        <h1 className="text-2xl font-semibold">Accès refusé</h1>
        <p className="text-sm text-muted-foreground">
          Les paramètres communs des Dossiers sont réservés au propriétaire du Workspace.
        </p>
      </section>
    );
  }

  if (settingsQuery.isLoading && !settingsQuery.data) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement des paramètres…
      </p>
    );
  }

  if (settingsQuery.isError) {
    return (
      <ErrorState
        description="Les paramètres communs des Dossiers n’ont pas pu être chargés."
        onRetry={settingsQuery.refetch}
        title="Paramètres indisponibles"
      />
    );
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-start gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Paramètres des Dossiers
        </h1>
        <InfoTooltip
          content="Réglages communs appliqués aux Dossiers et à leurs ressources métier lorsqu’ils relèvent du Workspace."
          label="À propos des paramètres des Dossiers"
        />
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-2">
            <CardTitle>Conservation de la corbeille</CardTitle>
            <InfoTooltip
              content="La durée choisie s’applique uniquement aux futures mises en corbeille des Fiches techniques. Les échéances déjà calculées restent inchangées."
              label="À propos de la conservation de la corbeille"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="technical-sheet-trash-retention">
              Durée de conservation (jours)
            </FieldLabel>
            <Input
              disabled={!canManage || updateRetentionState.isLoading}
              id="technical-sheet-trash-retention"
              max={90}
              min={1}
              onChange={(event) => setRetentionDays(event.target.value)}
              type="number"
              value={retentionDays}
            />
          </Field>
          {canManage && (
            <div className="flex justify-end">
              <Button
                disabled={updateRetentionState.isLoading}
                onClick={saveRetention}
                type="button"
              >
                Enregistrer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export { TechnicalSheetWorkspaceSettingsPage };
