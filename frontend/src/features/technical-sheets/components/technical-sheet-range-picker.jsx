import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useCreateTechnicalSheetRangeMutation,
  useListTechnicalSheetRangesQuery,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  getTechnicalSheetApiErrorMessage,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

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
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const rangesQuery = useListTechnicalSheetRangesQuery({
    workspaceId, page: 1, limit: 100, status: 'ACTIVE',
    search: search.trim() || undefined,
  });
  const [createRange, createState] = useCreateTechnicalSheetRangeMutation();
  const activeRanges = rangesQuery.data?.ranges ?? [];
  const selectedArchivedRange = (
    currentRange?.status === 'ARCHIVED'
    && !activeRanges.some((range) => range.id === currentRange.id)
  ) ? currentRange : null;

  async function createQuickRange() {
    if (!newName.trim()) return;
    setError('');
    try {
      const range = await createRange({
        workspaceId, name: newName.trim(),
      }).unwrap();
      setSearch('');
      setNewName('');
      onChange(range.id);
    } catch (failure) {
      setError(getTechnicalSheetApiErrorMessage(
        failure, 'La Gamme n’a pas pu être créée.',
      ));
    }
  }

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
        <div className="space-y-2 rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground">
            Créer une Gamme la rend disponible dans tous les Dossiers du Workspace.
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              aria-label="Nom de la nouvelle gamme"
              className="min-w-40 flex-1"
              disabled={disabled || createState.isLoading}
              maxLength={100}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Nouvelle gamme…"
              value={newName}
            />
            <Button
              disabled={disabled || createState.isLoading || !newName.trim()}
              onClick={createQuickRange}
              size="sm"
              type="button"
              variant="outline"
            >
              Créer cette gamme
            </Button>
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}

export { TechnicalSheetRangePicker };
