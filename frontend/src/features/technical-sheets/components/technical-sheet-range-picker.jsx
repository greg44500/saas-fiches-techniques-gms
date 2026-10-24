import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useListTechnicalSheetRangesQuery,
} from '@/features/technical-sheets/api/technical-sheets-api';
import { TechnicalSheetRangeFormDialog } from '@/features/technical-sheets/components/technical-sheet-range-form-dialog';

const WITHOUT_RANGE = '__WITHOUT_RANGE__';

function TechnicalSheetRangePicker({
  workspaceId,
  value,
  onChange,
  disabled = false,
  canCreate = false,
  currentRange = null,
}) {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const rangesQuery = useListTechnicalSheetRangesQuery({
    workspaceId, page: 1, limit: 100, status: 'ACTIVE',
    search: search.trim() || undefined,
  });
  const activeRanges = rangesQuery.data?.ranges ?? [];
  const selectedArchivedRange = (
    currentRange?.status === 'ARCHIVED'
    && !activeRanges.some((range) => range.id === currentRange.id)
  ) ? currentRange : null;

  const choices = [
    { value: WITHOUT_RANGE, label: 'Sans gamme' },
    ...activeRanges.map((range) => ({ value: range.id, label: range.name })),
    ...(selectedArchivedRange ? [{
      value: selectedArchivedRange.id,
      label: selectedArchivedRange.name + ' (archivée)',
    }] : []),
  ];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor="technical-sheet-range-search">
        Gamme (facultative)
      </label>
      <Input
        disabled={disabled}
        id="technical-sheet-range-search"
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Rechercher une gamme du Workspace…"
        value={search}
      />
      <Select
        disabled={disabled || rangesQuery.isFetching}
        items={choices}
        onValueChange={(next) => onChange(next === WITHOUT_RANGE ? null : next)}
        value={value ?? WITHOUT_RANGE}
      >
        <SelectTrigger aria-label="Gamme de la Fiche technique">
          <SelectValue placeholder="Sans gamme" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={WITHOUT_RANGE}>Sans gamme</SelectItem>
          {activeRanges.map((range) => (
            <SelectItem key={range.id} value={range.id}>{range.name}</SelectItem>
          ))}
          {selectedArchivedRange && (
            <SelectItem disabled value={selectedArchivedRange.id}>
              {selectedArchivedRange.name} (archivée)
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      {rangesQuery.isError && (
        <p className="text-sm text-destructive" role="alert">
          Les Gammes n’ont pas pu être chargées.
        </p>
      )}
      {canCreate && (
        <div>
          <Button
            disabled={disabled}
            onClick={() => setCreateOpen(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            Créer une gamme
          </Button>
          {createOpen && (
            <TechnicalSheetRangeFormDialog
              onClose={() => setCreateOpen(false)}
              onSaved={(range) => {
                setSearch('');
                setCreateOpen(false);
                onChange(range.id);
              }}
              workspaceId={workspaceId}
            />
          )}
        </div>
      )}
    </div>
  );
}

export { TechnicalSheetRangePicker };
