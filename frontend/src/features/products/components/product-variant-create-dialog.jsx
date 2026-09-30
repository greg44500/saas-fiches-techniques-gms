import { useEffect, useRef, useState } from 'react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
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
    if (!variant.name.trim()) {
      setFormError('Renseignez le nom de la référence.');
      return;
    }
    if (!variant.conservationType) {
      setFormError('Sélectionnez une conservation.');
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
        'La référence n’a pas pu être créée.',
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
            <div className="flex items-center gap-2">
              <DialogTitle>Créer une référence Produit</DialogTitle>
              <InfoTooltip
                content={
                  'Vérifiez les références existantes de '
                  + (product?.name ?? 'ce Produit')
                  + ' avant d’en créer une nouvelle.'
                }
                label="À propos de la création d’une référence Produit"
              />
            </div>
            <DialogDescription className="sr-only">
              Créez une Référence Produit à partir des dimensions disponibles.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-5">
            {existingVariants.length > 0 && (
              <section className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-medium">Références existantes</h3>
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
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  Variété et caractéristiques
                </p>
                <InfoTooltip
                  content="Sélectionnez les valeurs existantes ou ajoutez plusieurs variétés et caractéristiques au référentiel de ce Produit."
                  label="À propos des variétés et caractéristiques"
                />
              </div>
              <Button
                disabled={pending}
                onClick={() => setDimensionDialogOpen(true)}
                type="button"
                variant="outline"
              >
                Ajouter des valeurs
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
              {pending ? 'Création…' : 'Créer la référence'}
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
