import {
  InfoTooltip,
} from '@/components/shared/info-tooltip';
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

const VALIDATION_HELP =
  'La validation crée un état historique immuable. Le commentaire, s’il est renseigné, est conservé dans l’historique.';

function TechnicalSheetValidationDialog({
  comment,
  onClose,
  onCommentChange,
  onConfirm,
  open,
  pending,
}) {
  const hasComment =
    Boolean(comment.trim());

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
            <div className="flex items-center gap-2">
              <DialogTitle>
                Valider la Fiche technique
              </DialogTitle>
              <InfoTooltip
                content={VALIDATION_HELP}
                label="À propos de la validation"
              />
            </div>
            <DialogDescription className="sr-only">
              {VALIDATION_HELP}
            </DialogDescription>
          </DialogHeader>

          <Field className="mt-5">
            <FieldLabel htmlFor="technical-sheet-validation-comment">
              Commentaire de validation (facultatif)
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
              {pending
                ? 'Validation…'
                : hasComment
                  ? 'Valider'
                  : 'Valider sans commentaire'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export {
  TechnicalSheetValidationDialog,
  VALIDATION_HELP,
};
