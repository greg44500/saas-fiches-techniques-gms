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
  useCreateProductReferenceCategoryMutation,
  useGetProductReferenceCategorySuggestionsQuery,
  useUpdateProductReferenceCategoryMutation,
} from '@/features/products/api/product-reference-api';
import { getApiErrorMessage } from '@/features/products/lib/product-presentation';

function ProductReferenceCategoryDialog({
  category = null,
  onClose,
  onSaved,
  onUseExisting,
  open,
}) {
  const cancelRef = useRef(null);
  const [name, setName] = useState(category?.name ?? '');
  const [debouncedName, setDebouncedName] = useState('');
  const [confirmedDistinct, setConfirmedDistinct] = useState(false);
  const [formError, setFormError] = useState('');
  const [createCategory, createState] = useCreateProductReferenceCategoryMutation();
  const [updateCategory, updateState] = useUpdateProductReferenceCategoryMutation();
  const pending = createState.isLoading || updateState.isLoading;
  const trimmedName = name.trim();

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setDebouncedName('');
    setConfirmedDistinct(false);
    setFormError('');
  }, [category, open]);

  useEffect(() => {
    setConfirmedDistinct(false);
    setFormError('');
    const timer = setTimeout(() => setDebouncedName(trimmedName), 220);
    return () => clearTimeout(timer);
  }, [trimmedName]);

  const suggestionQuery = useGetProductReferenceCategorySuggestionsQuery(
    { name: debouncedName, excludeCategoryId: category?.id },
    { skip: !open || !debouncedName },
  );
  const suggestionsReady = Boolean(
    trimmedName && debouncedName === trimmedName
    && !suggestionQuery.isFetching && !suggestionQuery.isError
    && suggestionQuery.currentData,
  );
  const exactMatch = suggestionsReady ? suggestionQuery.currentData.exactMatch : null;
  const candidates = suggestionsReady ? suggestionQuery.currentData.candidates ?? [] : [];
  const needsConfirmation = candidates.length > 0;
  const canSubmit = suggestionsReady
    && !exactMatch && (!needsConfirmation || confirmedDistinct) && !pending;

  async function submit() {
    if (!trimmedName) {
      setFormError('Renseignez le nom de la catégorie.');
      return;
    }
    if (!canSubmit) return;

    setFormError('');
    try {
      const reviewedCandidateIds = confirmedDistinct
        ? candidates.map(({ id }) => id) : [];
      const saved = category
        ? await updateCategory({
          categoryId: category.id,
          name: trimmedName,
          reviewedCandidateIds,
        }).unwrap()
        : await createCategory({ name: trimmedName, reviewedCandidateIds }).unwrap();
      onSaved(saved);
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'La catégorie n’a pas pu être enregistrée.',
      ));
      suggestionQuery.refetch();
    }
  }

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
        <DialogContent initialFocus={cancelRef}>
          <DialogHeader>
            <DialogTitle>{category ? 'Renommer la catégorie' : 'Créer une catégorie'}</DialogTitle>
            <DialogDescription className="sr-only">
              Choisissez un nom et examinez les catégories proches avant d'enregistrer.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <Field>
              <FieldLabel htmlFor="product-reference-category-name">Nom</FieldLabel>
              <Input
                disabled={pending}
                id="product-reference-category-name"
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </Field>

            {trimmedName && !suggestionsReady && !suggestionQuery.isError && (
              <p className="text-sm text-muted-foreground" role="status">
                Recherche des catégories existantes…
              </p>
            )}
            {suggestionQuery.isError && trimmedName === debouncedName && (
              <p className="text-sm text-destructive" role="alert">
                Impossible de vérifier les catégories existantes. Réessayez avant d’enregistrer.
              </p>
            )}

            {exactMatch && (
              <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
                <p className="text-sm font-medium">Cette catégorie existe déjà :</p>
                <p className="text-sm">{exactMatch.name}
                  {exactMatch.status === 'ARCHIVED' ? ' (archivée)' : ''}
                </p>
                {onUseExisting && (
                  <Button
                    disabled={pending}
                    onClick={() => onUseExisting(exactMatch)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Voir cette catégorie
                  </Button>
                )}
              </div>
            )}

            {needsConfirmation && !exactMatch && (
              <div className="space-y-3 rounded-lg border border-warning/40 bg-warning/5 p-3">
                <p className="text-sm font-semibold">Catégories proches existantes</p>
                <p className="text-xs text-muted-foreground">
                  Vérifiez ces propositions avant de créer une nouvelle catégorie.
                </p>
                <ul className="max-h-40 space-y-2 overflow-y-auto">
                  {candidates.map((candidate) => (
                    <li className="flex items-center justify-between gap-2" key={candidate.id}>
                      <span className="min-w-0 break-words text-sm">
                        {candidate.name}
                        {candidate.status === 'ARCHIVED' ? ' (archivée)' : ''}
                      </span>
                      {onUseExisting && (
                        <Button
                          disabled={pending}
                          onClick={() => onUseExisting(candidate)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Voir
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={confirmedDistinct}
                    disabled={pending}
                    onChange={(event) => setConfirmedDistinct(event.target.checked)}
                  />
                  <span>J’ai vérifié ces propositions : ma catégorie est différente.</span>
                </label>
              </div>
            )}
            <FieldError>{formError}</FieldError>
          </div>
          <DialogFooter>
            <DialogClose
              disabled={pending}
              ref={cancelRef}
              render={<Button type="button" variant="outline" />}
            >
              Annuler
            </DialogClose>
            <Button disabled={!canSubmit} onClick={submit} type="button">
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { ProductReferenceCategoryDialog };
