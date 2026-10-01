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
  useGetDossierTechnicalSheetSettingsQuery,
  useUpdateDossierTechnicalSheetSettingsMutation,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  basisPointsToInput,
  getTechnicalSheetApiErrorMessage,
  percentInputToBasisPoints,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

function DossierTechnicalSheetMarginDialog({
  dossierId,
  onClose,
  open,
  workspaceId,
}) {
  const { toast } = useToast();
  const query = useGetDossierTechnicalSheetSettingsQuery(
    {
      workspaceId,
      dossierId,
    },
    { skip: !open },
  );
  const [updateSettings, updateState] =
    useUpdateDossierTechnicalSheetSettingsMutation();
  const [margin, setMargin] = useState('');

  useEffect(() => {
    if (!open || !query.data) return;
    setMargin(
      basisPointsToInput(
        query.data.defaultTargetMarginBasisPoints,
      ),
    );
  }, [open, query.data]);

  async function saveMargin() {
    const basisPoints =
      percentInputToBasisPoints(margin);

    if (
      !margin.trim()
      || basisPoints === null
      || basisPoints < 0
      || basisPoints >= 10000
    ) {
      toast({
        title: 'Marge invalide',
        description: 'Renseignez une marge comprise entre 0 et moins de 100 %.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateSettings({
        workspaceId,
        dossierId,
        defaultTargetMarginBasisPoints: basisPoints,
      }).unwrap();

      toast({
        title: 'Marge par défaut mise à jour',
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
        if (!nextOpen && !updateState.isLoading) onClose();
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>Marge par défaut du Dossier</DialogTitle>
              <InfoTooltip
                content="Cette marge préremplit les nouvelles Fiches techniques et les copies reçues dans ce Dossier. Elle ne modifie pas les Fiches existantes."
                label="À propos de la marge par défaut"
              />
            </div>
          </DialogHeader>

          {query.isLoading && !query.data ? (
            <p className="mt-5 text-sm text-muted-foreground">
              Chargement de la marge…
            </p>
          ) : query.isError ? (
            <div className="mt-5 space-y-3" role="alert">
              <p className="text-sm text-destructive">
                La marge par défaut n’a pas pu être chargée.
              </p>
              <Button
                onClick={query.refetch}
                size="sm"
                type="button"
                variant="outline"
              >
                Réessayer
              </Button>
            </div>
          ) : (
            <Field className="mt-5">
              <FieldLabel htmlFor="dossier-default-target-margin">
                Marge cible (%)
              </FieldLabel>
              <Input
                disabled={updateState.isLoading}
                id="dossier-default-target-margin"
                inputMode="decimal"
                onChange={(event) => setMargin(event.target.value)}
                placeholder="Ex. 70"
                value={margin}
              />
            </Field>
          )}

          <DialogFooter>
            <DialogClose
              disabled={updateState.isLoading}
              render={<Button type="button" variant="outline" />}
            >
              Annuler
            </DialogClose>
            <Button
              disabled={
                updateState.isLoading
                || query.isLoading
                || query.isError
                || !margin.trim()
              }
              onClick={saveMargin}
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

export { DossierTechnicalSheetMarginDialog };
