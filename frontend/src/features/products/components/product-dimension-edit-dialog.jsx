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
  useUpdateProductReferenceCharacteristicMutation,
  useUpdateProductReferenceVarietyMutation,
} from '@/features/products/api/product-reference-api';
import { getApiErrorMessage } from '@/features/products/lib/product-presentation';

function parseGovernedAliases(value) {
  return [...new Set(
    value
      .split(',')
      .map((alias) => alias.trim())
      .filter(Boolean),
  )];
}

function ProductDimensionEditDialog({
  dimension,
  onClose,
  onSaved,
  open,
  productId,
  type,
}) {
  const cancelRef = useRef(null);
  const [name, setName] = useState(dimension?.name ?? '');
  const [aliasesText, setAliasesText] = useState(
    dimension?.aliases?.join(', ') ?? '',
  );
  const [formError, setFormError] = useState('');

  const [updateVariety, varietyState] =
    useUpdateProductReferenceVarietyMutation();
  const [updateCharacteristic, characteristicState] =
    useUpdateProductReferenceCharacteristicMutation();
  const pending = varietyState.isLoading || characteristicState.isLoading;

  useEffect(() => {
    if (!open || !dimension) return;
    setName(dimension.name ?? '');
    setAliasesText(dimension.aliases?.join(', ') ?? '');
    setFormError('');
  }, [dimension, open]);

  async function submit() {
    const nextName = name.trim();
    if (!nextName) {
      setFormError('Le libellé est obligatoire.');
      return;
    }

    const aliases = parseGovernedAliases(aliasesText);
    const body = {
      name: nextName,
      aliases,
    };

    setFormError('');
    try {
      const saved = type === 'VARIETY'
        ? await updateVariety({
          productId,
          varietyId: dimension.id,
          ...body,
        }).unwrap()
        : await updateCharacteristic({
          productId,
          characteristicId: dimension.id,
          ...body,
        }).unwrap();

      onSaved?.(saved);
      onClose();
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'La dimension n’a pas pu être corrigée.',
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
            <DialogTitle>
              Corriger {type === 'VARIETY' ? 'la variété' : 'la caractéristique'}
            </DialogTitle>
            <DialogDescription>
              Les alias saisis ici sont des synonymes métier gouvernés,
              pas des variantes de casse, pluriels ou fautes.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <Field>
              <FieldLabel htmlFor="product-dimension-edit-name">Libellé</FieldLabel>
              <Input
                disabled={pending}
                id="product-dimension-edit-name"
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="product-dimension-edit-aliases">
                Synonymes métier
              </FieldLabel>
              <Input
                disabled={pending}
                id="product-dimension-edit-aliases"
                maxLength={500}
                onChange={(event) => setAliasesText(event.target.value)}
                placeholder="Séparés par des virgules"
                value={aliasesText}
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
              disabled={pending || !name.trim()}
              onClick={submit}
              type="button"
            >
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export {
  ProductDimensionEditDialog,
  parseGovernedAliases,
};
