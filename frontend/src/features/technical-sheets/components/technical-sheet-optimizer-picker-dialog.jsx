import { useState } from 'react';

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

const NONE = '__NONE__';

function TechnicalSheetOptimizerPickerDialog({
  onClose,
  onSelect,
  open,
  pendingSheetId = null,
  sheets,
}) {
  const [sheetId, setSheetId] =
    useState(NONE);
  const selected =
    sheets.find(
      (sheet) => sheet.id === sheetId,
    );

  return (
    <DialogRoot
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !pendingSheetId) {
          onClose();
        }
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Atelier d’optimisation
            </DialogTitle>
            <DialogDescription>
              Choisissez la Fiche technique à simuler. Une version validée sera d’abord reprise dans un nouveau brouillon.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5">
            <Select
              disabled={Boolean(pendingSheetId)}
              items={[
                {
                  value: NONE,
                  label: 'Choisir une Fiche',
                },
                ...sheets.map((sheet) => ({
                  value: sheet.id,
                  label: sheet.name,
                })),
              ]}
              onValueChange={setSheetId}
              value={sheetId}
            >
              <SelectTrigger aria-label="Fiche technique à optimiser">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem disabled value={NONE}>
                  Choisir une Fiche
                </SelectItem>
                {sheets.map((sheet) => (
                  <SelectItem
                    key={sheet.id}
                    value={sheet.id}
                  >
                    {sheet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <DialogClose
              disabled={Boolean(pendingSheetId)}
              render={
                <Button
                  type="button"
                  variant="outline"
                />
              }
            >
              Annuler
            </DialogClose>
            <Button
              disabled={
                !selected
                || Boolean(pendingSheetId)
              }
              onClick={() =>
                onSelect(selected)}
              type="button"
            >
              {pendingSheetId
                ? 'Ouverture…'
                : 'Ouvrir l’Atelier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export {
  TechnicalSheetOptimizerPickerDialog,
};
