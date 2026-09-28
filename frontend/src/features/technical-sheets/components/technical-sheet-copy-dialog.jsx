import { useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useListDossiersQuery,
} from '@/features/dossiers/api/dossiers-api';
import {
  useCopyTechnicalSheetMutation,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  getTechnicalSheetApiErrorMessage,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

const NONE = '__NONE__';

function TechnicalSheetCopyDialog({
  dossierId,
  onClose,
  onCopied,
  open,
  technicalSheetId,
  workspaceId,
}) {
  const cancelRef = useRef(null);
  const [targetDossierId, setTargetDossierId] = useState(NONE);
  const [errorMessage, setErrorMessage] = useState('');
  const dossiersQuery = useListDossiersQuery({
    workspaceId,
    page: 1,
    limit: 100,
    status: 'ACTIVE',
  });
  const [copySheet, copyState] = useCopyTechnicalSheetMutation();

  const dossiers = useMemo(
    () => (dossiersQuery.data?.dossiers ?? [])
      .filter((dossier) => dossier.id !== dossierId),
    [dossierId, dossiersQuery.data?.dossiers],
  );

  async function submit() {
    if (targetDossierId === NONE) {
      setErrorMessage('Sélectionnez un Dossier cible.');
      return;
    }

    setErrorMessage('');

    try {
      const result = await copySheet({
        workspaceId,
        dossierId,
        technicalSheetId,
        targetDossierId,
      }).unwrap();
      onCopied(result);
    } catch (error) {
      setErrorMessage(
        getTechnicalSheetApiErrorMessage(
          error,
          'La Fiche technique n’a pas pu être copiée.',
        ),
      );
    }
  }

  return (
    <DialogRoot
      disablePointerDismissal
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !copyState.isLoading) onClose();
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent initialFocus={cancelRef}>
          <DialogHeader>
            <DialogTitle>Copier la Fiche technique</DialogTitle>
            <DialogDescription>
              La copie crée une nouvelle Fiche indépendante. Les prix, coûts, marges et historiques financiers du Dossier source ne sont pas copiés.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-3">
            <p className="text-sm font-medium">Dossier cible</p>
            <Select
              disabled={copyState.isLoading || dossiersQuery.isFetching}
              items={[
                { value: NONE, label: 'Sélectionner un Dossier actif' },
                ...dossiers.map((dossier) => ({
                  value: dossier.id,
                  label: dossier.name,
                })),
              ]}
              onValueChange={(value) => setTargetDossierId(value)}
              value={targetDossierId}
            >
              <SelectTrigger aria-label="Dossier cible">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem disabled value={NONE}>
                  Sélectionner un Dossier actif
                </SelectItem>
                {dossiers.map((dossier) => (
                  <SelectItem key={dossier.id} value={dossier.id}>
                    {dossier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {dossiersQuery.isError && (
              <p className="text-sm text-destructive" role="alert">
                Les Dossiers cibles n’ont pas pu être chargés.
              </p>
            )}

            {!dossiersQuery.isError && !dossiersQuery.isFetching && dossiers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun autre Dossier actif et accessible n’est disponible.
              </p>
            )}

            {errorMessage && (
              <p className="text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose
              disabled={copyState.isLoading}
              ref={cancelRef}
              render={<Button type="button" variant="outline" />}
            >
              Annuler
            </DialogClose>
            <Button
              disabled={
                copyState.isLoading
                || targetDossierId === NONE
                || dossiers.length === 0
              }
              onClick={submit}
              type="button"
            >
              {copyState.isLoading ? 'Copie…' : 'Copier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { TechnicalSheetCopyDialog };
