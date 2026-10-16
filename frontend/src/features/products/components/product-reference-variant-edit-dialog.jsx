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
import { InfoTooltip } from '@/components/shared/info-tooltip';
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
    name: variant?.name ?? '',
    presentation: '',
    varietyId: variant?.variety?.id ?? '',
    characteristicIdsByKind: Object.fromEntries(
      (variant?.characteristics ?? [])
        .filter(({ kind, id }) => kind && id)
        .map(({ kind, id }) => [kind, id]),
    ),
    processingState: variant?.processingState ?? '',
    conservationType: variant?.conservationType ?? '',
    referenceUnit: variant?.referenceUnit ?? '',
    countUnitLabelSingular:
      variant?.countUnitLabelSingular ?? '',
    countUnitLabelPlural:
      variant?.countUnitLabelPlural ?? '',
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
    if (!draft.name.trim()) {
      setFormError('Renseignez le nom de la référence.');
      return;
    }
    if (!draft.conservationType) {
      setFormError('Sélectionnez une conservation.');
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
        'La référence n’a pas pu être corrigée.',
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
            <div className="flex items-center gap-2">
              <DialogTitle>Corriger la référence Produit</DialogTitle>
              <InfoTooltip
                label="Aide sur la correction d’une référence Produit"
                content="Vous pouvez corriger le nom et les caractéristiques de cette référence. L’unité de recette est utilisée pour calculer les quantités et les coûts des fiches techniques. Si elle est déjà utilisée par une fiche, un article fournisseur ou un prix, créez une nouvelle référence pour utiliser une autre unité."
              />
            </div>
            <DialogDescription className="sr-only">
              Correction des informations d’une référence Produit.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Caractéristiques de la référence
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
