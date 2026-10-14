import { useEffect, useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DialogClose, DialogContent, DialogFooter, DialogHeader,
  DialogOverlay, DialogPortal, DialogRoot, DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { ProductSearchAutocomplete } from '@/features/products/components/product-search-autocomplete';
import { useGetProductMetadataQuery } from '@/features/products/api/product-catalog-api';
import {
  useGetSupplierArticleProductMetadataQuery,
  useSearchSupplierArticleProductsQuery,
} from '@/features/suppliers/api/supplier-api';
import { useUpdateSupplierArticleMutation } from '@/features/suppliers/api/supplier-api';
import { getApiErrorMessage } from '@/features/suppliers/lib/supplier-presentation';

function SupplierArticleAssociationDialog({
  article, canCreateProduct = false, onClose, onCreateProduct, onSaved, open, workspaceId,
}) {
  const cancelRef = useRef(null);
  const searchHintId = useId();
  const [search, setSearch] = useState('');
  const [contextualSearch, setContextualSearch] = useState('');
  const [variant, setVariant] = useState(null);
  const [error, setError] = useState('');
  const standardMetadata = useGetProductMetadataQuery(
    workspaceId, { skip: !open || canCreateProduct },
  );
  const articleMetadata = useGetSupplierArticleProductMetadataQuery(
    { workspaceId, articleId: article?.id },
    { skip: !open || !canCreateProduct || !article?.id },
  );
  const metadata = canCreateProduct ? articleMetadata : standardMetadata;
  const contextualQuery = useSearchSupplierArticleProductsQuery({
    workspaceId,
    articleId: article?.id,
    scope: 'REFERENCE',
    q: contextualSearch || undefined,
    page: 1,
    limit: 6,
  }, {
    skip: !open || !canCreateProduct || !article?.id || contextualSearch.length < 3,
  });
  const [updateArticle, updateState] = useUpdateSupplierArticleMutation();
  const normalizedSearch = search.trim();
  const hasEnoughCharacters = normalizedSearch.length >= 3;
  const isCurrentSearch = contextualSearch === normalizedSearch;
  const searchReady = canCreateProduct && hasEnoughCharacters
    && isCurrentSearch && contextualQuery.isSuccess && !contextualQuery.isFetching;
  const searchResults = contextualQuery.currentData?.results
    ?? contextualQuery.data?.results ?? [];
  const hasSelectedReference = Boolean(variant?.id);
  const searchFailed = canCreateProduct && hasEnoughCharacters
    && isCurrentSearch && contextualQuery.isError && !contextualQuery.isFetching;
  const canOfferCreation = searchReady && !hasSelectedReference;

  useEffect(() => {
    if (!open) return;
    setSearch(article?.productVariant?.name ?? '');
    setContextualSearch('');
    setVariant(article?.productVariant ?? null);
    setError('');
  }, [open, article?.id]);

  async function save(unlink = false) {
    if (!unlink && !variant?.id) {
      setError('Sélectionnez une Référence Produit.');
      return;
    }
    try {
      await updateArticle({
        workspaceId, articleId: article.id, productVariantId: unlink ? null : variant.id,
      }).unwrap();
      onSaved();
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Association impossible.'));
    }
  }

  return (
    <DialogRoot
      disablePointerDismissal
      onOpenChange={(value) => {
        if (!value && !updateState.isLoading) onClose();
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-xl" initialFocus={cancelRef}>
          <DialogHeader>
            <DialogTitle>Modifier le Produit associé</DialogTitle>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <section
              aria-label="Article fournisseur concerné"
              className="rounded-lg border border-border bg-muted/25 px-4 py-3"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Article fournisseur
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {article?.supplierDesignation || 'Sans désignation'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Réf. fournisseur : {article?.supplierReference}
              </p>
            </section>
            {article?.productVariant && (
              <p className="rounded-md border border-border p-3 text-sm">
                Association actuelle : <strong>{article.productVariant.name}</strong>
              </p>
            )}
            <Field>
              <FieldLabel>Rechercher une Référence Produit</FieldLabel>
              <ProductSearchAutocomplete
                descriptionId={!hasEnoughCharacters ? searchHintId : undefined}
                externalQuery={contextualQuery}
                externalSearch={canCreateProduct}
                metadata={metadata.data}
                onDebouncedSearchChange={setContextualSearch}
                onSelect={(result) => {
                  setVariant(result.variant ?? null);
                  setError(result.variant ? '' : 'Choisissez une Référence Produit exploitable.');
                }}
                onValueChange={(value) => {
                  setSearch(value);
                  setVariant((current) => current?.name === value ? current : null);
                }}
                scope="REFERENCE"
                value={search}
                workspaceId={workspaceId}
              />
              {!hasEnoughCharacters && (
                <p className="text-xs text-muted-foreground" id={searchHintId}>
                  Saisissez au moins 3 caractères
                </p>
              )}
            </Field>
            {canCreateProduct && !hasSelectedReference && hasEnoughCharacters && (
              <div className="space-y-3" aria-live="polite">
                {!searchReady && !searchFailed && (
                  <p className="text-sm text-muted-foreground" role="status">
                    Recherche des Références Produit en cours…
                  </p>
                )}
                {searchFailed && (
                  <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                    La recherche est indisponible. Réessayez avant de créer une Référence.
                  </p>
                )}
                {canOfferCreation && searchResults.length === 0 && (
                  <div className="space-y-3 rounded-md border border-warning/40 bg-warning/10 p-3" role="status">
                    <div className="flex items-start gap-2">
                      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
                      <p className="text-sm font-medium">
                        Aucune Référence Produit trouvée pour « {normalizedSearch} ».
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Vous pouvez maintenant proposer une Référence. Recherchez d’abord son Produit parent dans le formulaire de création.
                    </p>
                    <Button
                      disabled={updateState.isLoading}
                      onClick={() => onCreateProduct(normalizedSearch)}
                      type="button"
                      variant="outline"
                    >Créer la Référence manquante</Button>
                  </div>
                )}
                {canOfferCreation && searchResults.length > 0 && (
                  <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                    <p className="text-sm text-muted-foreground">
                      Examinez les suggestions ci-dessus. Aucune ne correspond à votre besoin ?
                    </p>
                    <Button
                      disabled={updateState.isLoading}
                      onClick={() => onCreateProduct(normalizedSearch)}
                      type="button"
                      variant="outline"
                    >Créer une Référence différente</Button>
                  </div>
                )}
              </div>
            )}
            <FieldError>{error}</FieldError>
          </div>
          <DialogFooter>
            <DialogClose
              disabled={updateState.isLoading}
              ref={cancelRef}
              render={<Button type="button" variant="outline" />}
            >Fermer</DialogClose>
            {article?.productVariant && (
              <Button
                disabled={updateState.isLoading}
                onClick={() => save(true)}
                type="button"
                variant="outline"
              >Retirer l’association</Button>
            )}
            <Button
              disabled={updateState.isLoading || !variant?.id
                || article?.productVariant?.id === variant?.id}
              onClick={() => save(false)}
              type="button"
            >Enregistrer l’association</Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}
export { SupplierArticleAssociationDialog };
