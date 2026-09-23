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
  useContributeProductMutation,
  useDuplicateCheckProductMutation,
} from '@/features/products/api/product-catalog-api';
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

function ProductContributionDialog({
  metadata,
  onClose,
  onCreated,
  onUseExisting,
  open,
  workspaceId,
}) {
  const cancelRef = useRef(null);
  const [name, setName] = useState('');
  const [aliasesText, setAliasesText] = useState('');
  const [categoryId, setCategoryId] = useState(NO_CATEGORY);
  const [duplicateResult, setDuplicateResult] = useState(null);
  const [reviewedCandidateIds, setReviewedCandidateIds] = useState([]);
  const [variant, setVariant] = useState(() => createEmptyVariantDraft(metadata));
  const [formError, setFormError] = useState('');
  const [duplicateCheck, duplicateState] = useDuplicateCheckProductMutation();
  const [contributeProduct, contributionState] = useContributeProductMutation();

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
  const candidates = duplicateResult?.candidates ?? [];
  const everyCandidateReviewed = candidates.every(({ id }) =>
    reviewedCandidateIds.includes(id));
  const canPropose = Boolean(
    duplicateResult
    && !duplicateResult.exactMatch
    && !duplicateResult.privateConflict
    && everyCandidateReviewed,
  );
  const pending = duplicateState.isLoading || contributionState.isLoading;

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
      const result = await duplicateCheck({
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

  async function submitContribution() {
    if (!canPropose) {
      setFormError('Examinez les références proches avant de proposer un nouveau Produit.');
      return;
    }
    if (!variant.referenceUnit) {
      setFormError('Sélectionnez une unité de référence.');
      return;
    }

    setFormError('');
    try {
      const result = await contributeProduct({
        workspaceId,
        name: name.trim(),
        aliases,
        categoryId: categoryId === NO_CATEGORY ? null : categoryId,
        reviewedCandidateIds: candidates.map(({ id }) => id),
        variant: variantDraftToPayload(variant),
      }).unwrap();
      onCreated(result);
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'La contribution n’a pas pu être envoyée.',
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
            <DialogTitle>Proposer un Produit</DialogTitle>
            <DialogDescription>
              Recherchez d’abord l’existant. Une création n’est possible qu’après examen des références proches.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="product-contribution-name">Nom du Produit</FieldLabel>
                <Input
                  disabled={pending}
                  id="product-contribution-name"
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
                <FieldLabel htmlFor="product-contribution-aliases">Alias</FieldLabel>
                <Input
                  disabled={pending}
                  id="product-contribution-aliases"
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
                {duplicateState.isLoading ? 'Vérification…' : 'Rechercher l’existant'}
              </Button>
            </div>

            {duplicateResult?.privateConflict && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4" role="alert">
                <p className="font-medium text-destructive">Référence équivalente déjà existante</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Une identité équivalente existe déjà mais ne peut pas être exposée dans cet espace de travail. La création est bloquée.
                </p>
              </div>
            )}

            {duplicateResult?.exactMatch && (
              <div className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{duplicateResult.exactMatch.name}</p>
                    <StatusBadge tone={getProductStatusTone(duplicateResult.exactMatch.status)}>
                      {getProductStatusLabel(metadata, duplicateResult.exactMatch.status)}
                    </StatusBadge>
                  </div>
                  <Button
                    onClick={() => onUseExisting(duplicateResult.exactMatch.id)}
                    type="button"
                    variant="outline"
                  >
                    Utiliser cette référence
                  </Button>
                </div>
              </div>
            )}

            {candidates.length > 0 && !duplicateResult?.exactMatch && (
              <section className="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
                <div>
                  <h3 className="font-medium">Produits proches à examiner</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Confirmez pour chaque candidat qu’il ne correspond pas au Produit proposé.
                  </p>
                </div>
                <ul className="space-y-2">
                  {candidates.map((candidate) => (
                    <li className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3" key={candidate.id}>
                      <div>
                        <p className="font-medium">{candidate.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {candidate.category?.name ?? 'Sans catégorie'}
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

            {canPropose && (
              <section className="space-y-4 border-t border-border pt-5">
                <div>
                  <h3 className="font-medium">Nouvelle identité</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    La proposition restera « En validation » jusqu’à décision de la gouvernance du référentiel.
                  </p>
                </div>

                <Field>
                  <FieldLabel htmlFor="product-contribution-category">Catégorie principale</FieldLabel>
                  <Select
                    disabled={pending}
                    items={[
                      { value: NO_CATEGORY, label: 'Sans catégorie' },
                      ...(metadata?.categories ?? []).map((category) => ({
                        value: category.id,
                        label: category.name,
                      })),
                    ]}
                    onValueChange={setCategoryId}
                    value={categoryId}
                  >
                    <SelectTrigger id="product-contribution-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>Sans catégorie</SelectItem>
                      {(metadata?.categories ?? []).map((category) => (
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
            {canPropose && (
              <Button
                disabled={pending}
                onClick={submitContribution}
                type="button"
              >
                {contributionState.isLoading ? 'Envoi…' : 'Envoyer en validation'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { ProductContributionDialog, parseAliases };
