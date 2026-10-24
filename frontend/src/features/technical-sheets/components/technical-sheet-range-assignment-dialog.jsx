import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DialogClose, DialogContent, DialogFooter,
  DialogHeader, DialogOverlay, DialogPortal, DialogRoot, DialogTitle,
} from '@/components/ui/dialog';
import {
  useAssignTechnicalSheetRangeMutation,
} from '@/features/technical-sheets/api/technical-sheets-api';
import { TechnicalSheetRangePicker } from '@/features/technical-sheets/components/technical-sheet-range-picker';
import {
  getTechnicalSheetApiErrorMessage,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

function TechnicalSheetRangeAssignmentDialog({
  workspaceId, dossierId, sheet, canManage, onClose, onUpdated,
}) {
  const cancelRef = useRef(null);
  const [rangeId, setRangeId] = useState(sheet.rangeId ?? null);
  const [error, setError] = useState('');
  const [assignRange, mutation] = useAssignTechnicalSheetRangeMutation();

  async function save() {
    setError('');
    try {
      const updated = await assignRange({
        workspaceId, dossierId, technicalSheetId: sheet.id,
        expectedRevision: sheet.revision, rangeId,
      }).unwrap();
      onUpdated(updated);
    } catch (failure) {
      setError(getTechnicalSheetApiErrorMessage(
        failure, 'Le classement de la Fiche n’a pas pu être enregistré.',
      ));
    }
  }

  return (
    <DialogRoot
      disablePointerDismissal
      onOpenChange={(open) => { if (!open && !mutation.isLoading) onClose(); }}
      open
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent initialFocus={cancelRef}>
          <DialogHeader>
            <DialogTitle>Changer de gamme — {sheet.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-5 space-y-3">
            <TechnicalSheetRangePicker
              canCreate={canManage}
              currentRange={sheet.range}
              disabled={mutation.isLoading}
              onChange={setRangeId}
              value={rangeId}
              workspaceId={workspaceId}
            />
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose
              disabled={mutation.isLoading}
              ref={cancelRef}
              render={<Button type="button" variant="outline" />}
            >Annuler</DialogClose>
            <Button
              disabled={mutation.isLoading || rangeId === (sheet.rangeId ?? null)}
              onClick={save}
              type="button"
            >{mutation.isLoading ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { TechnicalSheetRangeAssignmentDialog };
