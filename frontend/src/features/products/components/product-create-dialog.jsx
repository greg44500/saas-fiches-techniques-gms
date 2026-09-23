import { useEffect, useMemo, useRef, useState } from 'react';

import { StatusBadge } from '@/components/shared/status-badge';
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
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateProductMutation,
  useDuplicateCheckProductMutation,
} from '@/features/products/api/product-catalog-api';
import {
  useCreateProductReferenceMutation,
  useDuplicateCheckProductReferenceMutation,
} from '@/features/products/api/product-reference-api';
import {
  ProductVariantFields,
  createEmptyVariantDraft,
  variantDraftToPayload,
} from '@/features/products/components/product-variant-fields';
import {
  getApiErrorMessage,
  getProductStatusLabel,
  getProductStatusTone,
} from '@/features/products/lib/product-presentation';

const NO_CATEGORY = '__NONE__';

function parseAliases(value) {
  return [...new Set(
    value
      .split(',')
      .map((alias) => alias.trim())
      .filter(Boolean),
  )];
}

function ProductCreateDialog({
  metadata,
  mode = 'workspace',
  onClose,
  onCreated,
  onUseExisting,
  open,
  workspaceId,
}) {
  const cancelRef = useRef(null);
  const isGlobal = mode === 'global';
  const [name, setName] = useState('');
  const [aliasesText, setAliasesText] = useState('');
  const [categoryId, setCategoryId] = useState(NO_CATEGORY);
  const [duplicateResult, setDuplicateResult] = useState(null);
  const [reviewedCandidateIds, setReviewedCandidateIds] = useState([]);
  const [variant, setVariant] = useState(() => createEmptyVariantDraft(metadata));
  const [formError, setFormError] = useState('');

  const [workspaceDuplicateCheck, workspaceDuplicateState] =
    useDuplicateCheckProductMutation();
  const [globalDuplicateCheck, globalDuplicateState] =
    useDuplicateCheckProductReferenceMutation();
  const [createWorkspaceProduct, workspaceCreateState] =
    useCreateProductMutation();
  const [createGlobalProduct, globalCreateState] =
    useCreateProductReferenceMutation();

  useEffect(() => {
    if (!open) return;

    setName('');
    setAliasesText('');
    setCategoryId(NO_CATEGORY);
    setDuplicateResult(null);
    setReviewedCandidateIds([]);
    setVariant(createEmptyVariantDraft(metadata));
    setFormError('');
  }, [metadata, open]);

  const aliases = useMemo(() => parseAliases(aliasesText), [aliasesText]);
  const activeCategories = useMemo(
    () => (metadata?.categories ?? []).filter((category) => category.status === 'ACTIVE'),
    [metadata?.categories],
  );
  const candidates = duplicateResult?.candidates ?? [];
  const everyCandidateReviewed = candidates.every(({ id }) =>
    reviewedCandidateIds.includes(id));
  const canCreate = Boolean(
    duplicateResult
    && !duplicateResult.exactMatch
    && everyCandidateReviewed
    && categoryId !== NO_CATEGORY,
  );
  const pending = (
    workspaceDuplicateState.isLoading
    || globalDuplicateState.isLoading
    || workspaceCreateState.isLoading
    || globalCreateState.isLoading
  );

  function invalidateDuplicateReview() {
    setDuplicateResult(null);
    setReviewedCandidateIds([]);
    setFormError('');
  }

  async function verifyExisting() {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setFormError('Renseignez le nom du Produit avant de rechercher les doublons.');
      return;
    }

    setFormError('');
    try {
      const result = isGlobal
        ? await globalDuplicateCheck({
          name: normalizedName,
          aliases,
        }).unwrap()
        : await workspaceDuplicateCheck({
          workspaceId,
          name: normalizedName,
          aliases,
        }).unwrap();

      setDuplicateResult(result);
      setReviewedCandidateIds([]);
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'Le contrôle des doublons n’a pas pu être effectué.',
      ));
    }
  }

  function toggleCandidate(candidateId) {
    setReviewedCandidateIds((current) => (
      current.includes(candidateId)
        ? current.filter((id) => id !== candidateId)
        : [...current, candidateId]
    ));
  }

  async function submit() {
    if (!duplicateResult || duplicateResult.exactMatch || !everyCandidateReviewed) {
      setFormError('Examinez les références proches avant de créer un nouveau Produit.');
      return;
    }
    if (categoryId === NO_CATEGORY) {
      setFormError('Sélectionnez une catégorie active.');
      return;
    }
    if (!variant.foodRange) {
      setFormError('Sélectionnez une gamme.');
      return;
    }
    if (!variant.processingState) {
      setFormError('Sélectionnez un état / transformation.');
      return;
    }
    if (!variant.referenceUnit) {
      setFormError('Sélectionnez une unité de référence.');
      return;
    }

    const payload = {
      name: name.trim(),
      aliases,
      categoryId,
      reviewedCandidateIds: candidates.map(({ id }) => id),
      variant: variantDraftToPayload(variant),
    };

    setFormError('');
    try {
      const result = isGlobal
        ? await createGlobalProduct(payload).unwrap()
        : await createWorkspaceProduct({
          workspaceId,
          ...payload,
        }).unwrap();

      onCreated(result);
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'Le Produit n’a pas pu être créé.',
      ));
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
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto" initialFocus={cancelRef}>
          <DialogHeader>
            <DialogTitle>Créer un Produit</DialogTitle>
            <DialogDescription>
              Recherchez d’abord l’existant. La nouvelle identité sera immédiatement partagée dans le référentiel global.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="product-create-name">Nom du Produit</FieldLabel>
                <Input
                  disabled={pending}
                  id="product-create-name"
                  maxLength={120}
                  onChange={(event) => {
                    setName(event.target.value);
                    invalidateDuplicateReview();
                  }}
                  placeholder="Ex. Carotte"
                  value={name}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="product-create-aliases">Alias</FieldLabel>
                <Input
                  disabled={pending}
                  id="product-create-aliases"
                  maxLength={500}
                  onChange={(event) => {
                    setAliasesText(event.target.value);
                    invalidateDuplicateReview();
                  }}
                  placeholder="Séparés par des virgules"
                  value={aliasesText}
                />
              </Field>
            </div>

            <div className="flex justify-end">
              <Button
                disabled={pending || !name.trim()}
                onClick={verifyExisting}
                type="button"
                variant="outline"
              >
                {(workspaceDuplicateState.isLoading || globalDuplicateState.isLoading)
                  ? 'Vérification…'
                  : 'Rechercher l’existant'}
              </Button>
            </div>

            {duplicateResult?.exactMatch && (
              <div className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{duplicateResult.exactMatch.name}</p>
                    <StatusBadge tone={getProductStatusTone(duplicateResult.exactMatch.status)}>
                      {getProductStatusLabel(metadata, duplicateResult.exactMatch.status)}
                    </StatusBadge>
                  </div>
                  {onUseExisting
                    && (isGlobal || duplicateResult.exactMatch.status === 'ACTIVE') && (
                    <Button
                      onClick={() => onUseExisting(duplicateResult.exactMatch.id)}
                      type="button"
                      variant="outline"
                    >
                      Ouvrir cette référence
                    </Button>
                  )}
                  {!isGlobal && duplicateResult.exactMatch.status === 'ARCHIVED' && (
                    <p className="max-w-sm text-sm text-muted-foreground">
                      Cette référence est archivée dans le référentiel global. Elle ne peut pas être recréée depuis cet espace de travail.
                    </p>
                  )}
                </div>
              </div>
            )}

            {candidates.length > 0 && !duplicateResult?.exactMatch && (
              <section className="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
                <div>
                  <h3 className="font-medium">Produits proches à examiner</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Confirmez pour chaque candidat qu’il s’agit bien d’un Produit différent.
                  </p>
                </div>
                <ul className="space-y-2">
                  {candidates.map((candidate) => (
                    <li className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3" key={candidate.id}>
                      <div>
                        <p className="font-medium">{candidate.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {candidate.category?.name ?? 'Catégorie non renseignée'}
                        </p>
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          checked={reviewedCandidateIds.includes(candidate.id)}
                          disabled={pending}
                          onChange={() => toggleCandidate(candidate.id)}
                          type="checkbox"
                        />
                        Différent
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {duplicateResult && !duplicateResult.exactMatch && everyCandidateReviewed && (
              <section className="space-y-4 border-t border-border pt-5">
                <div>
                  <h3 className="font-medium">Nouvelle identité</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Elle sera créée active dans le référentiel global après le dernier contrôle serveur.
                  </p>
                </div>

                <Field>
                  <FieldLabel htmlFor="product-create-category">Catégorie principale *</FieldLabel>
                  <Select
                    disabled={pending}
                    items={[
                      { value: NO_CATEGORY, label: 'Sélectionner une catégorie' },
                      ...activeCategories.map((category) => ({
                        value: category.id,
                        label: category.name,
                      })),
                    ]}
                    onValueChange={setCategoryId}
                    value={categoryId}
                  >
                    <SelectTrigger id="product-create-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>Sélectionner une catégorie</SelectItem>
                      {activeCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <div>
                  <h4 className="mb-3 text-sm font-medium">Première déclinaison</h4>
                  <ProductVariantFields
                    disabled={pending}
                    metadata={metadata}
                    onChange={setVariant}
                    value={variant}
                  />
                </div>
              </section>
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
            {duplicateResult && !duplicateResult.exactMatch && everyCandidateReviewed && (
              <Button
                disabled={pending || !canCreate}
                onClick={submit}
                type="button"
              >
                {(workspaceCreateState.isLoading || globalCreateState.isLoading)
                  ? 'Création…'
                  : isGlobal
                    ? 'Créer dans le référentiel global'
                    : 'Créer et ajouter à mon référentiel'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { NO_CATEGORY, ProductCreateDialog, parseAliases };
