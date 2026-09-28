import { useEffect, useState } from 'react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  useGetWorkspaceBusinessSettingsQuery,
  useUpdateWorkspaceTrashRetentionMutation,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  getTechnicalSheetApiErrorMessage,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

function TechnicalSheetTrashSettingsDialog({
  onClose,
  open,
  workspaceId,
}) {
  const { toast } = useToast();
  const settingsQuery = useGetWorkspaceBusinessSettingsQuery(
    workspaceId,
    { skip: !open },
  );
  const [updateRetention, updateRetentionState] =
    useUpdateWorkspaceTrashRetentionMutation();
  const [retentionDays, setRetentionDays] = useState('');

  useEffect(() => {
    if (!open || !settingsQuery.data) return;
    setRetentionDays(String(settingsQuery.data.trashRetentionDays));
  }, [open, settingsQuery.data]);

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
        workspaceId,
        trashRetentionDays: parsed,
      }).unwrap();

      toast({
        title: 'Durée de conservation mise à jour',
        description: 'Les dates déjà programmées restent inchangées.',
        variant: 'success',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Modification impossible',
        description: getTechnicalSheetApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  return (
    <DialogRoot
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !updateRetentionState.isLoading) onClose();
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>Paramètres de la Corbeille</DialogTitle>
              <InfoTooltip
                content="La durée choisie s’applique aux futures mises en Corbeille. Les Fiches restent restaurables jusqu’à leur date de suppression définitive."
                label="À propos de la conservation"
              />
            </div>
          </DialogHeader>

          {settingsQuery.isLoading && !settingsQuery.data ? (
            <p className="mt-5 text-sm text-muted-foreground">
              Chargement des paramètres…
            </p>
          ) : settingsQuery.isError ? (
            <div className="mt-5 space-y-3" role="alert">
              <p className="text-sm text-destructive">
                Les paramètres de la Corbeille n’ont pas pu être chargés.
              </p>
              <Button
                onClick={settingsQuery.refetch}
                size="sm"
                type="button"
                variant="outline"
              >
                Réessayer
              </Button>
            </div>
          ) : (
            <Field className="mt-5">
              <FieldLabel htmlFor="technical-sheet-trash-retention">
                Durée de conservation (jours)
              </FieldLabel>
              <Input
                disabled={updateRetentionState.isLoading}
                id="technical-sheet-trash-retention"
                max={90}
                min={1}
                onChange={(event) => setRetentionDays(event.target.value)}
                type="number"
                value={retentionDays}
              />
            </Field>
          )}

          <DialogFooter>
            <DialogClose
              disabled={updateRetentionState.isLoading}
              render={<Button type="button" variant="outline" />}
            >
              Annuler
            </DialogClose>
            <Button
              disabled={
                updateRetentionState.isLoading
                || settingsQuery.isLoading
                || settingsQuery.isError
              }
              onClick={saveRetention}
              type="button"
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { TechnicalSheetTrashSettingsDialog };
