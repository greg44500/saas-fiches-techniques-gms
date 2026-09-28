import { useEffect, useRef, useState } from 'react';

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
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateTechnicalSheetMutation,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  getTechnicalSheetApiErrorMessage,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

function TechnicalSheetCreateDialog({
  dossierId,
  onClose,
  onCreated,
  open,
  workspaceId,
}) {
  const cancelRef = useRef(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [createSheet, createState] = useCreateTechnicalSheetMutation();

  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setErrorMessage('');
  }, [open]);

  async function submit() {
    const normalizedName = name.trim();

    if (!normalizedName) {
      setErrorMessage('Renseignez le nom de la Fiche technique.');
      return;
    }

    setErrorMessage('');

    try {
      const result = await createSheet({
        workspaceId,
        dossierId,
        name: normalizedName,
        description: description.trim() || null,
      }).unwrap();

      onCreated(result);
    } catch (error) {
      setErrorMessage(
        getTechnicalSheetApiErrorMessage(
          error,
          'La Fiche technique n’a pas pu être créée.',
        ),
      );
    }
  }

  return (
    <DialogRoot
      disablePointerDismissal
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !createState.isLoading) onClose();
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent initialFocus={cancelRef}>
          <DialogHeader>
            <DialogTitle>Créer une Fiche technique</DialogTitle>
            <DialogDescription>
              La Fiche est créée dans ce Dossier et consomme une unité de capacité du Workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <Field>
              <FieldLabel htmlFor="technical-sheet-name">
                Nom
              </FieldLabel>
              <Input
                disabled={createState.isLoading}
                id="technical-sheet-name"
                maxLength={160}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex. Bœuf bourguignon"
                value={name}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="technical-sheet-description">
                Description
              </FieldLabel>
              <Textarea
                disabled={createState.isLoading}
                id="technical-sheet-description"
                maxLength={2000}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Informations utiles sur la préparation…"
                value={description}
              />
            </Field>

            {errorMessage && (
              <p className="text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose
              disabled={createState.isLoading}
              ref={cancelRef}
              render={<Button type="button" variant="outline" />}
            >
              Annuler
            </DialogClose>
            <Button
              disabled={createState.isLoading || !name.trim()}
              onClick={submit}
              type="button"
            >
              {createState.isLoading ? 'Création…' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { TechnicalSheetCreateDialog };
