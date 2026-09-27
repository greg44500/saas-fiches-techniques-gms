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
import { useUpdateProductReferenceMutation } from '@/features/products/api/product-reference-api';
import { getApiErrorMessage } from '@/features/products/lib/product-presentation';

const NO_CATEGORY = '__NONE__';

function ProductReferenceEditDialog({
  metadata,
  onClose,
  onSaved,
  open,
  product,
}) {
  const cancelRef = useRef(null);
  const [name, setName] = useState(product?.name ?? '');
  const [aliasesText, setAliasesText] = useState(product?.aliases?.join(', ') ?? '');
  const [categoryId, setCategoryId] = useState(product?.category?.id ?? NO_CATEGORY);
  const [formError, setFormError] = useState('');
  const [updateProduct, updateState] = useUpdateProductReferenceMutation();

  useEffect(() => {
    if (!open || !product) return;
    setName(product.name);
    setAliasesText(product.aliases?.join(', ') ?? '');
    setCategoryId(product.category?.id ?? NO_CATEGORY);
    setFormError('');
  }, [open, product]);

  async function submit() {
    const aliases = [...new Set(
      aliasesText.split(',').map((alias) => alias.trim()).filter(Boolean),
    )];
    const changes = {};
    if (name.trim() !== product.name) changes.name = name.trim();
    if (aliases.join('|') !== (product.aliases ?? []).join('|')) changes.aliases = aliases;
    const nextCategoryId = categoryId === NO_CATEGORY ? null : categoryId;
    if (nextCategoryId !== (product.category?.id ?? null)) changes.categoryId = nextCategoryId;

    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    setFormError('');
    try {
      const saved = await updateProduct({
        productId: product.id,
        ...changes,
      }).unwrap();
      onSaved(saved);
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'Le Produit n’a pas pu être corrigé.',
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
        <DialogContent initialFocus={cancelRef}>
          <DialogHeader>
            <DialogTitle>Corriger le Produit</DialogTitle>
            <DialogDescription>
              Corrigez l’identité globale et ses synonymes métier. Les contrôles de doublons restent appliqués par le backend.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <Field>
              <FieldLabel htmlFor="product-reference-product-name">Nom</FieldLabel>
              <Input
                disabled={updateState.isLoading}
                id="product-reference-product-name"
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="product-reference-product-aliases">Synonymes métier</FieldLabel>
              <Input
                disabled={updateState.isLoading}
                id="product-reference-product-aliases"
                onChange={(event) => setAliasesText(event.target.value)}
                placeholder="Séparés par des virgules"
                value={aliasesText}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="product-reference-product-category">Catégorie</FieldLabel>
              <Select
                disabled={updateState.isLoading}
                items={[
                  { value: NO_CATEGORY, label: 'Sans catégorie' },
                  ...(metadata?.categories ?? [])
                    .filter((category) => category.status === 'ACTIVE')
                    .map((category) => ({
                      value: category.id,
                      label: category.name,
                    })),
                ]}
                onValueChange={setCategoryId}
                value={categoryId}
              >
                <SelectTrigger id="product-reference-product-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>Sans catégorie</SelectItem>
                  {(metadata?.categories ?? [])
                    .filter((category) => category.status === 'ACTIVE')
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>

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
            <Button
              disabled={updateState.isLoading || !name.trim()}
              onClick={submit}
              type="button"
            >
              {updateState.isLoading ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { ProductReferenceEditDialog };
