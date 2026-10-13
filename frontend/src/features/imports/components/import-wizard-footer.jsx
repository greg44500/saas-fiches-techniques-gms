import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';

function ImportWizardFooter({
  cancelRef,
  pending = false,
  primaryAction,
  primaryDisabled = false,
  primaryLabel,
  step,
}) {
  return (
    <DialogFooter>
      <DialogClose
        disabled={pending}
        ref={cancelRef}
        render={<Button type="button" variant="outline" />}
      >
        {step === 'done' ? 'Fermer' : 'Annuler'}
      </DialogClose>
      {primaryAction && (
        <Button
          disabled={pending || primaryDisabled}
          onClick={primaryAction}
          type="button"
        >
          {primaryLabel}
        </Button>
      )}
    </DialogFooter>
  );
}

export { ImportWizardFooter };
