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

function TechnicalSheetIdentityDialog({
  canEdit,
  description,
  dirty,
  name,
  onClose,
  onDescriptionChange,
  onNameChange,
  onSave,
  open,
  pending,
}) {
  return (
    <DialogRoot
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !pending) onClose();
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la Fiche</DialogTitle>
            <DialogDescription>
              Modifiez le nom et les notes descriptives de la Fiche. Les paramètres économiques restent dans le poste de travail.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <Field>
              <FieldLabel htmlFor="technical-sheet-edit-name">Nom</FieldLabel>
              <Input
                disabled={!canEdit || pending}
                id="technical-sheet-edit-name"
                maxLength={160}
                onChange={(event) => onNameChange(event.target.value)}
                value={name}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="technical-sheet-edit-description">
                Description / notes
              </FieldLabel>
              <Textarea
                className="min-h-32"
                disabled={!canEdit || pending}
                id="technical-sheet-edit-description"
                maxLength={2000}
                onChange={(event) => onDescriptionChange(event.target.value)}
                placeholder="Informations utiles sur la recette ou son usage"
                value={description}
              />
            </Field>
          </div>

          <DialogFooter>
            <DialogClose
              disabled={pending}
              render={<Button type="button" variant="outline" />}
            >
              Annuler
            </DialogClose>
            <Button
              disabled={!canEdit || pending || !dirty || !name.trim()}
              onClick={onSave}
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

export { TechnicalSheetIdentityDialog };
