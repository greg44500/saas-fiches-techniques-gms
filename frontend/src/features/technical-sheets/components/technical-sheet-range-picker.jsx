import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { FieldLabel } from '@/components/ui/field';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useListTechnicalSheetRangeOptionsQuery,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  TechnicalSheetRangeFormDialog,
} from '@/features/technical-sheets/components/technical-sheet-range-form-dialog';

const WITHOUT_RANGE = '__WITHOUT_RANGE__';

/**
 * Une Fiche a zéro ou une Gamme active. La création rapide conserve
 * l'état de la Fiche en cours et sélectionne aussitôt la nouvelle Gamme.
 * Toutes les options actives sont servies par un endpoint métier dédié.
 */
function TechnicalSheetRangePicker({
  workspaceId,
  value,
  onChange,
  disabled = false,
  canCreate = false,
  currentRange = null,
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newlyCreated, setNewlyCreated] = useState(null);
  const rangesQuery = useListTechnicalSheetRangeOptionsQuery({ workspaceId });
  const activeRanges = rangesQuery.data ?? [];
  const currentArchived = currentRange?.status === 'ARCHIVED'
    && !activeRanges.some((range) => range.id === currentRange.id)
    ? currentRange : null;

  const options = [
    { value: WITHOUT_RANGE, label: 'Sans gamme' },
    ...activeRanges.map((range) => ({ value: range.id, label: range.name })),
    ...(newlyCreated && !activeRanges.some(({ id }) => id === newlyCreated.id)
      ? [{ value: newlyCreated.id, label: newlyCreated.name }] : []),
    ...(currentArchived ? [{
      value: currentArchived.id,
      label: currentArchived.name + ' (archivée)',
    }] : []),
  ];

  return (
    <div className="space-y-2">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <FieldLabel htmlFor="technical-sheet-range-select">
          Gamme (facultative)
        </FieldLabel>
        {canCreate && (
          <Button
            disabled={disabled}
            onClick={() => setCreateOpen(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            Créer une gamme
          </Button>
        )}
      </div>
      <Select
        disabled={disabled || rangesQuery.isLoading || rangesQuery.isError}
        items={options}
        onValueChange={(next) => onChange(next === WITHOUT_RANGE ? null : next)}
        value={value ?? WITHOUT_RANGE}
      >
        <SelectTrigger
          aria-label="Gamme (facultative)"
          id="technical-sheet-range-select"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={WITHOUT_RANGE}>Sans gamme</SelectItem>
          {activeRanges.map((range) => (
            <SelectItem key={range.id} value={range.id}>{range.name}</SelectItem>
          ))}
          {newlyCreated && !activeRanges.some(({ id }) => id === newlyCreated.id) && (
            <SelectItem value={newlyCreated.id}>{newlyCreated.name}</SelectItem>
          )}
          {currentArchived && (
            <SelectItem disabled value={currentArchived.id}>
              {currentArchived.name} (archivée)
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      {rangesQuery.isError && (
        <p className="text-sm text-destructive" role="alert">
          Impossible de charger les gammes. Réessayez avant de classer la Fiche.
        </p>
      )}
      {createOpen && (
        <TechnicalSheetRangeFormDialog
          onClose={() => setCreateOpen(false)}
          onSaved={(range) => {
            setNewlyCreated(range);
            onChange(range.id);
            setCreateOpen(false);
          }}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}

export { TechnicalSheetRangePicker };
