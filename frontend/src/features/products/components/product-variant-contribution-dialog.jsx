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
import { FieldError } from '@/components/ui/field';
import { useContributeVariantMutation } from '@/features/products/api/product-catalog-api';
import {
  ProductVariantFields,
  createEmptyVariantDraft,
  variantDraftToPayload,
} from '@/features/products/components/product-variant-fields';
import {
  getApiErrorMessage,
  getReferenceUnitLabel,
  getVariantLabel,
} from '@/features/products/lib/product-presentation';

function ProductVariantContributionDialog({
  existingVariants = [],
  metadata,
  onClose,
  onCreated,
  open,
  product,
  workspaceId,
}) {
  const cancelRef = useRef(null);
  const [variant, setVariant] = useState(() => createEmptyVariantDraft(metadata));
  const [formError, setFormError] = useState('');
  const [contributeVariant, mutationState] = useContributeVariantMutation();

  useEffect(() => {
    if (!open) return;
    setVariant(createEmptyVariantDraft(metadata));
    setFormError('');
  }, [metadata, open]);

  async function submit() {
    if (!variant.referenceUnit) {
      setFormError('Sélectionnez une unité de référence.');
      return;
    }

    setFormError('');
    try {
      const result = await contributeVariant({
        workspaceId,
        productId: product.id,
        ...variantDraftToPayload(variant),
      }).unwrap();
      onCreated(result);
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'La déclinaison n’a pas pu être proposée.',
      ));
    }
  }

  return (
    <DialogRoot
      disablePointerDismissal
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !mutationState.isLoading) onClose();
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto" initialFocus={cancelRef}>
          <DialogHeader>
            <DialogTitle>Proposer une déclinaison</DialogTitle>
            <DialogDescription>
              Vérifiez les déclinaisons existantes de {product?.name} avant d’en proposer une nouvelle.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-5">
            {existingVariants.length > 0 && (
              <section className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-medium">Déclinaisons existantes</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {existingVariants.map((existing) => (
                    <li className="flex flex-wrap justify-between gap-2" key={existing.id}>
                      <span>{getVariantLabel(existing)}</span>
                      <span className="text-muted-foreground">
                        {getReferenceUnitLabel(metadata, existing.referenceUnit)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <ProductVariantFields
              disabled={mutationState.isLoading}
              metadata={metadata}
              onChange={setVariant}
              value={variant}
            />

            <FieldError>{formError}</FieldError>
          </div>

          <DialogFooter>
            <DialogClose
              disabled={mutationState.isLoading}
              ref={cancelRef}
              render={<Button type="button" variant="outline" />}
            >
              Annuler
            </DialogClose>
            <Button
              disabled={mutationState.isLoading}
              onClick={submit}
              type="button"
            >
              {mutationState.isLoading ? 'Envoi…' : 'Envoyer en validation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { ProductVariantContributionDialog };
