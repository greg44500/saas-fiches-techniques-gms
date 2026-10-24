import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  useCreateTechnicalSheetRangeMutation,
  useGetTechnicalSheetRangeSuggestionsQuery,
  useUpdateTechnicalSheetRangeMutation,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  getTechnicalSheetApiErrorMessage,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

/**
 * Dialogue métier commun à la création rapide et à la gestion des Gammes.
 * Reprend le contrôle anti-doublon des Catégories Produit : équivalent exact
 * interdit ; noms voisins à examiner et confirmer explicitement.
 */
function TechnicalSheetRangeFormDialog({
  workspaceId,
  range = null,
  onClose,
  onSaved,
}) {
  const cancelRef = useRef(null);
  const [name, setName] = useState(range?.name ?? '');
  const [debouncedName, setDebouncedName] = useState('');
  const [confirmedDistinct, setConfirmedDistinct] = useState(false);
  const [formError, setFormError] = useState('');
  const [createRange, createState] = useCreateTechnicalSheetRangeMutation();
  const [updateRange, updateState] = useUpdateTechnicalSheetRangeMutation();
  const pending = createState.isLoading || updateState.isLoading;
  const trimmedName = name.trim();

  useEffect(() => {
    setConfirmedDistinct(false);
    setFormError('');
    const timer = window.setTimeout(() => setDebouncedName(trimmedName), 220);
    return () => window.clearTimeout(timer);
  }, [trimmedName]);

  const suggestionQuery = useGetTechnicalSheetRangeSuggestionsQuery(
    { workspaceId, name: debouncedName, excludeRangeId: range?.id },
    { skip: !debouncedName },
  );
  const suggestionsReady = Boolean(
    trimmedName
    && debouncedName === trimmedName
    && !suggestionQuery.isFetching
    && !suggestionQuery.isError
    && suggestionQuery.currentData,
  );
  const exactMatch = suggestionsReady
    ? suggestionQuery.currentData.exactMatch : null;
  const candidates = suggestionsReady
    ? suggestionQuery.currentData.candidates ?? [] : [];
  const canSubmit = suggestionsReady
    && !exactMatch
    && (!candidates.length || confirmedDistinct)
    && (!range || trimmedName !== range.name.trim())
    && !pending;

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    setFormError('');
    const reviewedCandidateIds = confirmedDistinct
      ? candidates.map((candidate) => candidate.id)
      : [];
    try {
      const result = range
        ? await updateRange({
          workspaceId,
          rangeId: range.id,
          expectedRevision: range.revision,
          name: trimmedName,
          reviewedCandidateIds,
        }).unwrap()
        : await createRange({
          workspaceId,
          name: trimmedName,
          reviewedCandidateIds,
        }).unwrap();
      onSaved(result);
    } catch (error) {
      setFormError(getTechnicalSheetApiErrorMessage(
        error, 'La Gamme n’a pas pu être enregistrée.',
      ));
      suggestionQuery.refetch?.();
    }
  }

  return (
    <DialogRoot
      disablePointerDismissal
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !pending) onClose();
      }}
      open
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent initialFocus={cancelRef}>
          <DialogHeader>
            <DialogTitle>{range ? 'Renommer la gamme' : 'Créer une gamme'}</DialogTitle>
            <DialogDescription>
              Indiquez un nom pour cette gamme de produits finis.
              Elle sera disponible dans tous vos magasins.
            </DialogDescription>
          </DialogHeader>
          <form className="mt-5 space-y-4" onSubmit={submit}>
            <Field>
              <FieldLabel htmlFor="technical-sheet-range-name">Nom de la gamme</FieldLabel>
              <Input
                autoComplete="off"
                disabled={pending}
                id="technical-sheet-range-name"
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex. Snacking"
                value={name}
              />
            </Field>
            {trimmedName && !suggestionsReady && !suggestionQuery.isError && (
              <p className="text-sm text-muted-foreground" role="status">
                Vérification des gammes existantes…
              </p>
            )}
            {suggestionQuery.isError && trimmedName === debouncedName && (
              <p className="text-sm text-destructive" role="alert">
                Impossible de vérifier les gammes existantes. Réessayez avant d’enregistrer.
              </p>
            )}
            {exactMatch && (
              <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
                <p className="text-sm font-medium">Cette gamme existe déjà :</p>
                <p className="text-sm">
                  {exactMatch.name}
                  {exactMatch.status === 'ARCHIVED' ? ' (archivée)' : ''}
                </p>
              </div>
            )}
            {candidates.length > 0 && !exactMatch && (
              <div className="space-y-3 rounded-lg border border-warning/40 bg-warning/5 p-3">
                <p className="text-sm font-semibold">Gammes proches existantes</p>
                <p className="text-xs text-muted-foreground">
                  Vérifiez ces propositions avant de créer une nouvelle gamme.
                </p>
                <ul className="max-h-40 space-y-2 overflow-y-auto">
                  {candidates.map((candidate) => (
                    <li className="text-sm" key={candidate.id}>
                      {candidate.name}
                      {candidate.status === 'ARCHIVED' ? ' (archivée)' : ''}
                    </li>
                  ))}
                </ul>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={confirmedDistinct}
                    disabled={pending}
                    onChange={(event) => setConfirmedDistinct(event.target.checked)}
                  />
                  <span>J’ai vérifié ces propositions : ma gamme est différente.</span>
                </label>
              </div>
            )}
            <FieldError>{formError}</FieldError>
            <DialogFooter>
              <DialogClose
                disabled={pending}
                ref={cancelRef}
                render={<Button type="button" variant="outline" />}
              >
                Annuler
              </DialogClose>
              <Button disabled={!canSubmit} type="submit">
                {pending ? 'Enregistrement…' : range ? 'Enregistrer' : 'Créer la gamme'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { TechnicalSheetRangeFormDialog };
