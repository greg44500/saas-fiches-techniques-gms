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
import { useUpdateProductReferenceVariantMutation } from '@/features/products/api/product-reference-api';
import {
  ProductVariantFields,
  variantDraftToPayload,
} from '@/features/products/components/product-variant-fields';
import { getApiErrorMessage } from '@/features/products/lib/product-presentation';

function variantToDraft(variant) {
  return {
    form: variant?.form ?? '',
    processingState: variant?.processingState ?? '',
    preservation: variant?.preservation ?? '',
    foodRange: variant?.foodRange ? String(variant.foodRange) : '',
    referenceUnit: variant?.referenceUnit ?? '',
    yieldPercent: variant?.yieldPercent ? String(variant.yieldPercent) : '',
  };
}

function ProductReferenceVariantEditDialog({
  metadata,
  onClose,
  onSaved,
  open,
  productId,
  variant,
}) {
  const cancelRef = useRef(null);
  const [draft, setDraft] = useState(() => variantToDraft(variant));
  const [formError, setFormError] = useState('');
  const [updateVariant, updateState] = useUpdateProductReferenceVariantMutation();

  useEffect(() => {
    if (!open) return;
    setDraft(variantToDraft(variant));
    setFormError('');
  }, [open, variant]);

  async function submit() {
    if (!draft.referenceUnit) {
      setFormError('Sélectionnez une unité de référence.');
      return;
    }

    setFormError('');
    try {
      const saved = await updateVariant({
        productId,
        variantId: variant.id,
        ...variantDraftToPayload(draft),
      }).unwrap();
      onSaved(saved);
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'La déclinaison n’a pas pu être corrigée.',
      ));
    }
  }

  return (
    <DialogRoot
      disablePointerDismissal
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !updateState.isLoading) onClose();
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-2xl" initialFocus={cancelRef}>
          <DialogHeader>
            <DialogTitle>Corriger la déclinaison</DialogTitle>
            <DialogDescription>
              Modifiez uniquement les dimensions Produit. Les données fournisseur et prix ne font pas partie de M-002.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <ProductVariantFields
              disabled={updateState.isLoading}
              metadata={metadata}
              onChange={setDraft}
              value={draft}
            />
            <FieldError>{formError}</FieldError>
          </div>

          <DialogFooter>
            <DialogClose
              disabled={updateState.isLoading}
              ref={cancelRef}
              render={<Button type="button" variant="outline" />}
            >
              Annuler
            </DialogClose>
            <Button disabled={updateState.isLoading} onClick={submit} type="button">
              {updateState.isLoading ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { ProductReferenceVariantEditDialog, variantToDraft };
