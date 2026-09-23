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
} from '@/features/products/api/product-catalog-api';
import {
  useCreateProductReferenceVariantMutation,
} from '@/features/products/api/product-reference-api';
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
  const [variant, setVariant] = useState(() => createEmptyVariantDraft(metadata));
  const [formError, setFormError] = useState('');
  const [createWorkspaceVariant, workspaceState] = useCreateVariantMutation();
  const [createGlobalVariant, globalState] = useCreateProductReferenceVariantMutation();
  const pending = workspaceState.isLoading || globalState.isLoading;

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

    const payload = {
      productId: product.id,
      ...variantDraftToPayload(variant),
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

            <ProductVariantFields
              disabled={pending}
              metadata={metadata}
              onChange={setVariant}
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
  );
}

export { ProductVariantCreateDialog };
