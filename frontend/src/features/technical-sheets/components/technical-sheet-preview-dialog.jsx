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
import { Button } from '@/components/ui/button';
import {
  useGetTechnicalSheetValidationQuery,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  TechnicalSheetValidatedContent,
} from '@/features/technical-sheets/components/technical-sheet-validated-content';

function TechnicalSheetPreviewDialog({
  dossierId,
  onClose,
  open,
  sheet,
  workspaceId,
}) {
  const validationId =
    sheet?.currentValidatedStateId
    ?? null;
  const validationQuery =
    useGetTechnicalSheetValidationQuery(
      {
        workspaceId,
        dossierId,
        technicalSheetId:
          sheet?.id,
        validationId,
      },
      {
        skip:
          !open
          || !sheet?.id
          || !validationId,
      },
    );
  const validation =
    validationQuery.data;

  return (
    <DialogRoot
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Prévisualisation de la Fiche technique
            </DialogTitle>
            <DialogDescription>
              Consultation de la version officielle. Les éventuelles modifications en cours ne sont pas affichées ici.
            </DialogDescription>
          </DialogHeader>

          {validationQuery.isLoading && !validation ? (
            <p
              aria-live="polite"
              className="mt-5 text-sm text-muted-foreground"
              role="status"
            >
              Chargement de la version…
            </p>
          ) : validationQuery.isError || !validation ? (
            <div
              className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
              role="alert"
            >
              <p className="text-sm">
                La version n’a pas pu être chargée.
              </p>
              <Button
                className="mt-3"
                onClick={() => validationQuery.refetch()}
                size="sm"
                type="button"
                variant="outline"
              >
                Réessayer
              </Button>
            </div>
          ) : (
            <div className="mt-5">
              <TechnicalSheetValidatedContent
                fallbackName={
                  sheet?.name
                }
                validation={validation}
              />
            </div>
          )}

          <DialogFooter>
            <DialogClose
              render={(
                <Button
                  type="button"
                  variant="outline"
                />
              )}
            >
              Fermer
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export {
  TechnicalSheetPreviewDialog,
};
