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
import {
  useGetProductReferenceDimensionsQuery,
  useUpdateProductReferenceVariantMutation,
} from '@/features/products/api/product-reference-api';
import { ProductDimensionContributionDialog } from '@/features/products/components/product-dimension-contribution-dialog';
import {
  ProductVariantFields,
  variantDraftToPayload,
} from '@/features/products/components/product-variant-fields';
import { getApiErrorMessage } from '@/features/products/lib/product-presentation';

function variantToDraft(variant) {
  return {
    presentation: '',
    varietyId: variant?.variety?.id ?? '',
    characteristicIdsByKind: Object.fromEntries(
      (variant?.characteristics ?? [])
        .filter(({ kind, id }) => kind && id)
        .map(({ kind, id }) => [kind, id]),
    ),
    processingState: variant?.processingState ?? '',
    foodRange: variant?.foodRange ? String(variant.foodRange) : '',
    referenceUnit: variant?.referenceUnit ?? '',
    yieldPercent: variant?.yieldPercent ? String(variant.yieldPercent) : '',
    structured: true,
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
  const [dimensionDialogOpen, setDimensionDialogOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [updateVariant, updateState] = useUpdateProductReferenceVariantMutation();
  const dimensionsQuery = useGetProductReferenceDimensionsQuery(productId, {
    skip: !open || !productId,
  });
  const dimensions = dimensionsQuery.data ?? {
    varieties: [],
    characteristics: [],
  };

  useEffect(() => {
    if (!open) return;
    setDraft(variantToDraft(variant));
    setDimensionDialogOpen(false);
    setFormError('');
  }, [open, variant]);

  async function submit() {
    if (!draft.foodRange) {
      setFormError('Sélectionnez une gamme.');
      return;
    }
    if (!draft.processingState) {
      setFormError('Sélectionnez un état / transformation.');
      return;
    }
    if (!draft.referenceUnit) {
      setFormError('Sélectionnez une unité de référence.');
      return;
    }

    setFormError('');
    try {
      const saved = await updateVariant({
        productId,
        variantId: variant.id,
        ...variantDraftToPayload(draft, { structured: true }),
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
    <>
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Les dimensions sont des références globales structurées.
              </p>
              <Button
                disabled={updateState.isLoading}
                onClick={() => setDimensionDialogOpen(true)}
                type="button"
                variant="outline"
              >
                Enrichir le référentiel
              </Button>
            </div>

            <ProductVariantFields
              dimensions={dimensions}
              disabled={updateState.isLoading}
              metadata={metadata}
              onChange={setDraft}
              structured
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

    <ProductDimensionContributionDialog
      metadata={metadata}
      mode="global"
      onClose={() => setDimensionDialogOpen(false)}
      onResolved={() => dimensionsQuery.refetch?.()}
      open={dimensionDialogOpen}
      product={{ id: productId, name: 'ce Produit' }}
    />
  </>
  );
}

export { ProductReferenceVariantEditDialog, variantToDraft };
