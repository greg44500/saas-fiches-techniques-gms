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
import { Textarea } from '@/components/ui/textarea';

function TechnicalSheetValidationDialog({
  comment,
  onClose,
  onCommentChange,
  onConfirm,
  open,
  pending,
}) {
  return (
    <DialogRoot
      disablePointerDismissal
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !pending) onClose();
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider la Fiche technique</DialogTitle>
            <DialogDescription>
              La validation crée un état historique immuable. Le commentaire est facultatif et sera conservé dans l’historique.
            </DialogDescription>
          </DialogHeader>

          <Field className="mt-5">
            <FieldLabel htmlFor="technical-sheet-validation-comment">
              Commentaire de validation
            </FieldLabel>
            <Textarea
              className="min-h-28"
              disabled={pending}
              id="technical-sheet-validation-comment"
              maxLength={1000}
              onChange={(event) => onCommentChange(event.target.value)}
              placeholder="Ex. Ajustement du grammage et du prix retenu"
              value={comment}
            />
          </Field>

          <DialogFooter>
            <DialogClose
              disabled={pending}
              render={<Button type="button" variant="outline" />}
            >
              Annuler
            </DialogClose>
            <Button
              disabled={pending}
              onClick={onConfirm}
              type="button"
            >
              {pending ? 'Validation…' : 'Valider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { TechnicalSheetValidationDialog };
