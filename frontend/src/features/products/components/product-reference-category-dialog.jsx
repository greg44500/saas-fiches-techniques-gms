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
  useCreateProductReferenceCategoryMutation,
  useUpdateProductReferenceCategoryMutation,
} from '@/features/products/api/product-reference-api';
import { getApiErrorMessage } from '@/features/products/lib/product-presentation';

function ProductReferenceCategoryDialog({
  category = null,
  onClose,
  onSaved,
  open,
}) {
  const cancelRef = useRef(null);
  const [name, setName] = useState(category?.name ?? '');
  const [formError, setFormError] = useState('');
  const [createCategory, createState] = useCreateProductReferenceCategoryMutation();
  const [updateCategory, updateState] = useUpdateProductReferenceCategoryMutation();
  const pending = createState.isLoading || updateState.isLoading;

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setFormError('');
  }, [category, open]);

  async function submit() {
    if (!name.trim()) {
      setFormError('Renseignez le nom de la catégorie.');
      return;
    }

    setFormError('');
    try {
      const saved = category
        ? await updateCategory({
          categoryId: category.id,
          name: name.trim(),
        }).unwrap()
        : await createCategory({ name: name.trim() }).unwrap();
      onSaved(saved);
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'La catégorie n’a pas pu être enregistrée.',
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
        <DialogContent initialFocus={cancelRef}>
          <DialogHeader>
            <DialogTitle>{category ? 'Renommer la catégorie' : 'Créer une catégorie'}</DialogTitle>
            <DialogDescription>
              La taxonomie M-002 est globale et plate.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <Field>
              <FieldLabel htmlFor="product-reference-category-name">Nom</FieldLabel>
              <Input
                disabled={pending}
                id="product-reference-category-name"
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                value={name}
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
            <Button disabled={pending || !name.trim()} onClick={submit} type="button">
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { ProductReferenceCategoryDialog };
