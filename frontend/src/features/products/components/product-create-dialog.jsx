import { useEffect, useMemo, useRef, useState } from 'react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
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

function ProductCreateDialog({
  createRequest,
  duplicateCheckRequest,
  initialName = '',
  metadata,
  mode = 'workspace',
  onClose,
  onCreated,
  onUseExisting,
  onUseCandidate,
  open,
  workspaceId,
}) {
  const cancelRef = useRef(null);
  const isGlobal = mode === 'global';
  const [name, setName] = useState(initialName);
  const [categoryId, setCategoryId] = useState(NO_CATEGORY);
  const [duplicateResult, setDuplicateResult] = useState(null);
  const [reviewedCandidateIds, setReviewedCandidateIds] = useState([]);
  const [variant, setVariant] = useState(() => createEmptyVariantDraft(metadata));
  const [formError, setFormError] = useState('');
  const [externalPending, setExternalPending] = useState(false);
  const [contextualLookupStatus, setContextualLookupStatus] = useState('idle');
  const [confirmedDistinct, setConfirmedDistinct] = useState(false);
  const contextualCreation = Boolean(!isGlobal && onUseCandidate && duplicateCheckRequest);
  const duplicateCheckRequestRef = useRef(duplicateCheckRequest);
  duplicateCheckRequestRef.current = duplicateCheckRequest;

  const [workspaceDuplicateCheck, workspaceDuplicateState] =
    useDuplicateCheckProductMutation();
  const [globalDuplicateCheck, globalDuplicateState] =
    useDuplicateCheckProductReferenceMutation();
  const [createWorkspaceProduct, workspaceCreateState] =
    useCreateProductMutation();
  const [createGlobalProduct, globalCreateState] =
    useCreateProductReferenceMutation();

  // L'arrivée tardive des métadonnées ne doit jamais effacer la saisie en cours.
  // Seule l'ouverture du dialogue (ou le changement du nom initial) réinitialise le formulaire.
  useEffect(() => {
    if (!open) return;

    setName(initialName);
    setCategoryId(NO_CATEGORY);
    setDuplicateResult(null);
    setReviewedCandidateIds([]);
    setVariant(createEmptyVariantDraft());
    setFormError('');
    setConfirmedDistinct(false);
    setContextualLookupStatus('idle');
  }, [open, initialName]);

  // Hydrater seulement les valeurs par défaut manquantes, sans remplacer les
  // valeurs déjà saisies lorsque les métadonnées sont rafraîchies.
  useEffect(() => {
    if (!open || !metadata) return;

    const defaults = createEmptyVariantDraft(metadata);
    setVariant((current) => {
      const conservationType = current.conservationType || defaults.conservationType;
      const referenceUnit = current.referenceUnit || defaults.referenceUnit;

      if (current.conservationType === conservationType
        && current.referenceUnit === referenceUnit) return current;

      return { ...current, conservationType, referenceUnit };
    });
  }, [metadata, open]);

  // La recherche est prédictive dans le parcours Article fournisseur.
  // Une réponse ancienne ne peut pas remplacer une recherche plus récente.
  useEffect(() => {
    if (!contextualCreation || !open) return undefined;
    const query = name.trim();
    if (query.length < 3) {
      setContextualLookupStatus('idle');
      return undefined;
    }

    let current = true;
    setContextualLookupStatus('loading');
    const timer = window.setTimeout(async () => {
      try {
        const found = await duplicateCheckRequestRef.current({
          workspaceId, name: query, aliases: [],
        });
        if (!current) return;
        setDuplicateResult(found);
        setReviewedCandidateIds([]);
        setConfirmedDistinct(false);
        setContextualLookupStatus('success');
      } catch (failure) {
        if (!current) return;
        setDuplicateResult(null);
        setConfirmedDistinct(false);
        setContextualLookupStatus('error');
        setFormError(getApiErrorMessage(
          failure, 'La recherche est indisponible. Réessayez en modifiant votre saisie.',
        ));
      }
    }, 350);

    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [contextualCreation, name, open, workspaceId]);

  const activeCategories = useMemo(
    () => (metadata?.categories ?? []).filter((category) => category.status === 'ACTIVE'),
    [metadata?.categories],
  );
  const candidates = duplicateResult?.candidates ?? [];
  const everyCandidateReviewed = contextualCreation
    ? (candidates.length === 0 || confirmedDistinct)
    : candidates.every(({ id }) => reviewedCandidateIds.includes(id));
  const reviewedIdsForCreation = contextualCreation && confirmedDistinct
    ? candidates.map(({ id }) => id)
    : reviewedCandidateIds;
  const canCreate = Boolean(
    duplicateResult
    && (!contextualCreation || contextualLookupStatus === 'success')
    && !duplicateResult.exactMatch
    && everyCandidateReviewed
    && variant.conservationType
    && variant.referenceUnit,
  );
  const pending = (
    workspaceDuplicateState.isLoading
    || globalDuplicateState.isLoading
    || externalPending
    || workspaceCreateState.isLoading
    || globalCreateState.isLoading
  );

  function invalidateDuplicateReview() {
    setDuplicateResult(null);
    setReviewedCandidateIds([]);
    setConfirmedDistinct(false);
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
      if (duplicateCheckRequest) setExternalPending(true);
      const result = isGlobal
        ? await globalDuplicateCheck({
          name: normalizedName,
          aliases: [],
        }).unwrap()
        : duplicateCheckRequest
          ? await duplicateCheckRequest({ workspaceId, name: normalizedName, aliases: [] })
          : await workspaceDuplicateCheck({
            workspaceId,
            name: normalizedName,
            aliases: [],
          }).unwrap();

      setDuplicateResult(result);
      setReviewedCandidateIds([]);
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'Le contrôle des doublons n’a pas pu être effectué.',
      ));
    } finally {
      setExternalPending(false);
    }
  }

  function handleExistingCandidate(candidate) {
    if (pending || !candidate || (!isGlobal && candidate.status !== 'ACTIVE')) return;
    if (onUseCandidate) {
      onUseCandidate(candidate.id, candidate);
      return;
    }
    onUseExisting?.(candidate.id);
  }

  function toggleCandidate(candidateId) {
    setReviewedCandidateIds((current) => (
      current.includes(candidateId)
        ? current.filter((id) => id !== candidateId)
        : [...current, candidateId]
    ));
  }

  async function submit() {
    if (!duplicateResult || duplicateResult.exactMatch || !everyCandidateReviewed
      || (contextualCreation && contextualLookupStatus !== 'success')) {
      setFormError('Examinez les références proches avant de créer un nouveau Produit.');
      return;
    }
    if (!variant.referenceUnit) {
      setFormError('Sélectionnez une unité de référence.');
      return;
    }

    if (!variant.conservationType) {
      setFormError('Sélectionnez une conservation.');
      return;
    }

    const variantPayload = variantDraftToPayload({
      ...variant,
      name: name.trim(),
    });
    const selectedCategoryId = categoryId === NO_CATEGORY ? null : categoryId;

    setFormError('');
    try {
      if (createRequest) setExternalPending(true);
      const payload = {
        workspaceId,
        name: name.trim(),
        categoryId: selectedCategoryId,
        reviewedCandidateIds: reviewedIdsForCreation,
        forceCreate: candidates.length > 0,
        variant: variantPayload,
      };
      const result = isGlobal
        ? await createGlobalProduct({
          name: name.trim(),
          aliases: [],
          categoryId: selectedCategoryId,
          reviewedCandidateIds: reviewedIdsForCreation,
          variant: variantPayload,
        }).unwrap()
        : createRequest
          ? await createRequest(payload)
          : await createWorkspaceProduct(payload).unwrap();

      if (
        !isGlobal
        && result?.classification === 'USER_CONFIRMATION_REQUIRED'
      ) {
        setDuplicateResult({
          exactMatch: null,
          candidates: result.candidates ?? [],
        });
        setReviewedCandidateIds([]);
        setConfirmedDistinct(false);
        setFormError(
          'De nouveaux Produits proches ont été détectés. Examinez-les avant de confirmer la création.',
        );
        return;
      }

      onCreated(result);
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        isGlobal
          ? 'Le Produit n’a pas pu être créé.'
          : 'La proposition n’a pas pu être soumise.',
      ));
    } finally {
      setExternalPending(false);
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
            <div className="flex items-center gap-2">
              <DialogTitle>Créer un Produit</DialogTitle>
              <InfoTooltip
                content={
                  isGlobal
                    ? 'Recherchez d’abord l’existant avant de publier une nouvelle identité globale.'
                    : 'Recherchez d’abord l’existant. Une nouvelle identité sera soumise au référentiel global pour revue.'
                }
                label="Aide sur la création d’un Produit"
              />
            </div>
            <DialogDescription className="sr-only">
              Recherchez l’existant avant de créer un nouveau Produit.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-5">
            {onUseCandidate && (
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">Rechercher un Produit existant</span>
                <InfoTooltip
                  content="Recherchez d’abord le Produit générique, par exemple « Croissant » plutôt que « Croissant individuel prêt à cuire ». Si le Produit existe, sélectionnez-le pour créer uniquement la Référence manquante."
                  label="Aide sur la recherche du Produit parent"
                />
              </div>
            )}
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

            {contextualCreation ? (
              <p className="text-xs text-muted-foreground" role="status">
                {name.trim().length < 3
                  ? 'Saisissez au moins 3 caractères pour rechercher un Produit.'
                  : contextualLookupStatus === 'loading'
                    ? 'Recherche automatique en cours…'
                    : contextualLookupStatus === 'error'
                      ? 'Recherche indisponible : vérifiez votre saisie et réessayez.'
                      : contextualLookupStatus === 'success'
                        ? 'Résultats actualisés. Affinez librement votre recherche.'
                        : 'Recherche automatique en cours…'}
              </p>
            ) : (
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
                  {onUseExisting
                    && (isGlobal || duplicateResult.exactMatch.status === 'ACTIVE') && (
                    <Button
                      disabled={pending}
                      onClick={() => handleExistingCandidate(duplicateResult.exactMatch)}
                      type="button"
                      variant="outline"
                    >
                      {onUseCandidate ? 'Utiliser ce Produit' : 'Ouvrir ce Produit'}
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

            {duplicateResult
              && !duplicateResult.exactMatch
              && candidates.length === 0 && (
              <div
                className="rounded-lg border border-warning/40 bg-warning/10 p-3"
                role="status"
              >
                <div className="flex items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                  <p className="text-sm font-semibold">
                    Aucun Produit existant correspondant n’a été trouvé.
                  </p>
                </div>
                {onUseCandidate && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Vérifiez le libellé ou lancez une nouvelle recherche avec un nom
                    plus générique avant de créer un nouveau Produit parent.
                  </p>
                )}
              </div>
            )}

            {candidates.length > 0 && !duplicateResult?.exactMatch && (
              <section className="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-center gap-1">
                  <h3 className="font-medium">
                    {contextualCreation ? 'Produits correspondants' : 'Produits proches à examiner'}
                  </h3>
                  <InfoTooltip
                    content={contextualCreation
                      ? 'Ces suggestions permettent de réutiliser un Produit existant. Si aucune ne convient, confirmez votre choix pour créer une nouvelle identité provisoire.'
                      : 'Confirmez pour chaque candidat qu’il s’agit bien d’un Produit différent.'}
                    label="Aide sur les Produits proches"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {contextualCreation
                    ? 'Choisissez le Produit correspondant pour le réutiliser, ou confirmez qu’aucun ne convient.'
                    : 'Ouvrez un Produit existant pour consulter ses Références. '
                      + 'Cochez « Différent » uniquement si vous voulez réellement créer un autre Produit.'}
                </p>
                <ul className="space-y-2">
                  {candidates.map((candidate) => (
                    <li className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3" key={candidate.id}>
                      <div>
                        <p className="font-medium">{candidate.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {candidate.category?.name ?? 'Catégorie non renseignée'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {(onUseCandidate || onUseExisting)
                          && (isGlobal || candidate.status === 'ACTIVE') && (
                          <Button
                            disabled={pending}
                            onClick={() => handleExistingCandidate(candidate)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {onUseCandidate ? 'Utiliser ce Produit' : 'Ouvrir ce Produit'}
                          </Button>
                        )}
                        {!isGlobal && candidate.status === 'ARCHIVED' && (
                          <span className="text-xs text-muted-foreground">
                            Produit archivé — non réutilisable
                          </span>
                        )}
                        {!contextualCreation && (
                          <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                              checked={reviewedCandidateIds.includes(candidate.id)}
                              disabled={pending}
                              onChange={() => toggleCandidate(candidate.id)}
                              type="checkbox"
                            />
                            Différent
                          </label>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {contextualCreation && (
                  <label className="flex cursor-pointer items-start gap-2 rounded-md border border-warning/30 bg-card p-3 text-sm">
                    <input
                      checked={confirmedDistinct}
                      className="mt-1"
                      disabled={pending}
                      onChange={(event) => setConfirmedDistinct(event.target.checked)}
                      type="checkbox"
                    />
                    <span>J’ai examiné ces Produits. Aucun ne correspond à celui que je souhaite créer.</span>
                  </label>
                )}
              </section>
            )}

            {duplicateResult && !duplicateResult.exactMatch && everyCandidateReviewed && (
              <section className="space-y-4 border-t border-border pt-5">
                <div className="flex items-center gap-1">
                  <h3 className="font-medium">Nouvelle identité</h3>
                  <InfoTooltip
                    content={
                      isGlobal
                        ? 'Elle sera publiée dans le référentiel global après le dernier contrôle serveur.'
                        : 'Elle sera utilisable immédiatement dans cet espace de travail avec le statut À valider, puis harmonisée par la gouvernance du référentiel.'
                    }
                    label="Aide sur la nouvelle identité"
                  />
                </div>

                <Field>
                  <FieldLabel htmlFor="product-create-category">Catégorie</FieldLabel>
                  <Select
                    disabled={pending}
                    items={[
                      { value: NO_CATEGORY, label: 'Sans catégorie' },
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
                      <SelectItem value={NO_CATEGORY}>Sans catégorie</SelectItem>
                      {activeCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <div>
                  <h4 className="mb-3 text-sm font-medium">Référence Produit</h4>
                  <ProductVariantFields
                    disabled={pending}
                    metadata={metadata}
                    onChange={setVariant}
                    showName={false}
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
                    : 'Soumettre la proposition'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { NO_CATEGORY, ProductCreateDialog };
