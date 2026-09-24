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
  useCreateVariantMutation,
  useGetProductDimensionsQuery,
} from '@/features/products/api/product-catalog-api';
import {
  useCreateProductReferenceVariantMutation,
  useGetProductReferenceDimensionsQuery,
} from '@/features/products/api/product-reference-api';
import { ProductDimensionContributionDialog } from '@/features/products/components/product-dimension-contribution-dialog';
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

function ProductVariantCreateDialog({
  existingVariants = [],
  metadata,
  mode = 'workspace',
  onClose,
  onCreated,
  open,
  product,
  workspaceId,
}) {
  const cancelRef = useRef(null);
  const isGlobal = mode === 'global';
  const [variant, setVariant] = useState(() => createEmptyVariantDraft(
    metadata,
    { structured: true },
  ));
  const [dimensionDialogOpen, setDimensionDialogOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [createWorkspaceVariant, workspaceState] = useCreateVariantMutation();
  const [createGlobalVariant, globalState] = useCreateProductReferenceVariantMutation();
  const workspaceDimensionsQuery = useGetProductDimensionsQuery(
    {
      workspaceId,
      productId: product?.id,
    },
    {
      skip: !open || isGlobal || !workspaceId || !product?.id,
    },
  );
  const globalDimensionsQuery = useGetProductReferenceDimensionsQuery(
    product?.id,
    {
      skip: !open || !isGlobal || !product?.id,
    },
  );
  const dimensionsQuery = isGlobal
    ? globalDimensionsQuery
    : workspaceDimensionsQuery;
  const dimensions = dimensionsQuery.data ?? {
    varieties: [],
    characteristics: [],
  };
  const pending = workspaceState.isLoading || globalState.isLoading;

  useEffect(() => {
    if (!open) return;
    setVariant(createEmptyVariantDraft(metadata, { structured: true }));
    setDimensionDialogOpen(false);
    setFormError('');
  }, [metadata, open]);

  async function submit() {
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
      productId: product.id,
      ...variantDraftToPayload(variant, { structured: true }),
    };

    setFormError('');
    try {
      const result = isGlobal
        ? await createGlobalVariant(payload).unwrap()
        : await createWorkspaceVariant({
          workspaceId,
          ...payload,
        }).unwrap();

      onCreated(result);
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'La déclinaison n’a pas pu être créée.',
      ));
    }
  }

  return (
    <>
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
            <DialogTitle>Créer une déclinaison</DialogTitle>
            <DialogDescription>
              Vérifiez les déclinaisons existantes de {product?.name} avant d’en créer une nouvelle.
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

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  Variété et caractéristiques
                </p>
                <p className="text-sm text-muted-foreground">
                  Sélectionnez des dimensions existantes ou enrichissez le référentiel.
                </p>
              </div>
              <Button
                disabled={pending}
                onClick={() => setDimensionDialogOpen(true)}
                type="button"
                variant="outline"
              >
                Enrichir le référentiel
              </Button>
            </div>

            <ProductVariantFields
              dimensions={dimensions}
              disabled={pending}
              metadata={metadata}
              onChange={setVariant}
              structured
              value={variant}
            />

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
            >
              {pending ? 'Création…' : 'Créer la déclinaison'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <ProductDimensionContributionDialog
      metadata={metadata}
      mode={mode}
      onClose={() => setDimensionDialogOpen(false)}
      onResolved={() => {
        dimensionsQuery.refetch?.();
      }}
      open={dimensionDialogOpen}
      product={product}
      workspaceId={workspaceId}
    />
  </>
  );
}

export { ProductVariantCreateDialog };
