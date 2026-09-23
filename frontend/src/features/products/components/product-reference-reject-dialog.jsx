import { useEffect, useRef, useState } from 'react';

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
import { Textarea } from '@/components/ui/textarea';
import {
  useLazyGetProductReferenceDetailQuery,
  useLazyListProductReferenceProductsQuery,
  useRejectProductReferenceMutation,
  useRejectProductReferenceVariantMutation,
} from '@/features/products/api/product-reference-api';
import {
  getApiErrorMessage,
  getReferenceUnitLabel,
  getVariantLabel,
} from '@/features/products/lib/product-presentation';

function ProductReferenceRejectDialog({
  metadata,
  onClose,
  onRejected,
  open,
  product,
  variant = null,
}) {
  const cancelRef = useRef(null);
  const [reason, setReason] = useState(metadata?.rejectionReasons?.[0]?.value ?? '');
  const [comment, setComment] = useState('');
  const [replacementQuery, setReplacementQuery] = useState('');
  const [replacementProducts, setReplacementProducts] = useState([]);
  const [replacementProduct, setReplacementProduct] = useState(null);
  const [replacementVariants, setReplacementVariants] = useState([]);
  const [replacementVariantId, setReplacementVariantId] = useState('');
  const [formError, setFormError] = useState('');

  const [searchProducts, searchState] = useLazyListProductReferenceProductsQuery();
  const [loadProduct, loadState] = useLazyGetProductReferenceDetailQuery();
  const [rejectProduct, rejectProductState] = useRejectProductReferenceMutation();
  const [rejectVariant, rejectVariantState] = useRejectProductReferenceVariantMutation();
  const pending = (
    searchState.isFetching
    || loadState.isFetching
    || rejectProductState.isLoading
    || rejectVariantState.isLoading
  );

  useEffect(() => {
    if (!open) return;
    setReason(metadata?.rejectionReasons?.[0]?.value ?? '');
    setComment('');
    setReplacementQuery('');
    setReplacementProducts([]);
    setReplacementProduct(null);
    setReplacementVariants([]);
    setReplacementVariantId('');
    setFormError('');
  }, [metadata, open]);

  async function searchReplacement(event) {
    event.preventDefault();
    if (replacementQuery.trim().length < 2) {
      setFormError('Saisissez au moins deux caractères pour rechercher un remplacement.');
      return;
    }

    setFormError('');
    try {
      const result = await searchProducts({
        status: 'ACTIVE',
        q: replacementQuery.trim(),
        page: 1,
        limit: 20,
      }).unwrap();
      setReplacementProducts(
        (result?.products ?? []).filter((candidate) => candidate.id !== product.id),
      );
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'La recherche de remplacement a échoué.',
      ));
    }
  }

  async function chooseReplacement(candidate) {
    setFormError('');
    try {
      const detail = await loadProduct(candidate.id).unwrap();
      const variants = (detail?.variants ?? []).filter(
        (item) => item.status === 'ACTIVE',
      );
      setReplacementProduct(candidate);
      setReplacementVariants(variants);
      setReplacementVariantId(variants.length === 1 ? variants[0].id : '');
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'Le Produit de remplacement n’a pas pu être chargé.',
      ));
    }
  }

  async function submit() {
    if (!reason) {
      setFormError('Sélectionnez un motif de rejet.');
      return;
    }
    if (reason === 'DUPLICATE' && !replacementVariantId) {
      setFormError('Choisissez une déclinaison active de remplacement pour un doublon.');
      return;
    }

    const body = {
      reason,
      replacementVariantId: reason === 'DUPLICATE' ? replacementVariantId : null,
      comment: comment.trim() || null,
    };

    setFormError('');
    try {
      if (variant) {
        await rejectVariant({
          productId: product.id,
          variantId: variant.id,
          ...body,
        }).unwrap();
      } else {
        await rejectProduct({
          productId: product.id,
          ...body,
        }).unwrap();
      }
      onRejected();
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Le rejet n’a pas pu être enregistré.'));
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
            <DialogTitle>
              Rejeter {variant ? 'la déclinaison' : 'le Produit'}
            </DialogTitle>
            <DialogDescription>
              Le rejet conserve l’historique. Un doublon doit être rattaché à une déclinaison active de remplacement.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <Field>
              <FieldLabel htmlFor="product-reference-rejection-reason">Motif</FieldLabel>
              <Select
                disabled={pending}
                items={metadata?.rejectionReasons ?? []}
                onValueChange={(value) => {
                  setReason(value);
                  setReplacementProduct(null);
                  setReplacementVariants([]);
                  setReplacementVariantId('');
                }}
                value={reason || null}
              >
                <SelectTrigger id="product-reference-rejection-reason">
                  <SelectValue placeholder="Choisir un motif" />
                </SelectTrigger>
                <SelectContent>
                  {(metadata?.rejectionReasons ?? []).map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {reason === 'DUPLICATE' && (
              <section className="space-y-3 rounded-lg border border-border p-4">
                <form className="flex gap-2" onSubmit={searchReplacement}>
                  <Input
                    aria-label="Rechercher un Produit de remplacement"
                    disabled={pending}
                    onChange={(event) => setReplacementQuery(event.target.value)}
                    placeholder="Nom du Produit existant"
                    value={replacementQuery}
                  />
                  <Button disabled={pending} type="submit" variant="outline">
                    Rechercher
                  </Button>
                </form>

                {replacementProducts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {replacementProducts.map((candidate) => (
                      <Button
                        disabled={pending}
                        key={candidate.id}
                        onClick={() => chooseReplacement(candidate)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {candidate.name}
                      </Button>
                    ))}
                  </div>
                )}

                {replacementProduct && (
                  <Field>
                    <FieldLabel htmlFor="product-reference-replacement-variant">
                      Déclinaison de remplacement — {replacementProduct.name}
                    </FieldLabel>
                    <Select
                      disabled={pending}
                      items={replacementVariants.map((item) => ({
                        value: item.id,
                        label: getVariantLabel(item) + ' · '
                          + getReferenceUnitLabel(metadata, item.referenceUnit),
                      }))}
                      onValueChange={setReplacementVariantId}
                      value={replacementVariantId || null}
                    >
                      <SelectTrigger id="product-reference-replacement-variant">
                        <SelectValue placeholder="Choisir une déclinaison active" />
                      </SelectTrigger>
                      <SelectContent>
                        {replacementVariants.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {getVariantLabel(item)}
                            {' · '}
                            {getReferenceUnitLabel(metadata, item.referenceUnit)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </section>
            )}

            <Field>
              <FieldLabel htmlFor="product-reference-rejection-comment">Commentaire</FieldLabel>
              <Textarea
                disabled={pending}
                id="product-reference-rejection-comment"
                maxLength={500}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Facultatif"
                value={comment}
              />
            </Field>

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
            <Button
              disabled={pending}
              onClick={submit}
              type="button"
              variant="destructive"
            >
              {rejectProductState.isLoading || rejectVariantState.isLoading
                ? 'Rejet…'
                : 'Rejeter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { ProductReferenceRejectDialog };
