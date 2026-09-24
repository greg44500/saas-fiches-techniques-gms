import { useEffect, useMemo, useRef, useState } from 'react';

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
import {
  useContributeProductReferenceMutation,
} from '@/features/products/api/product-catalog-api';
import {
  useCreateProductReferenceCharacteristicMutation,
  useCreateProductReferenceVarietyMutation,
} from '@/features/products/api/product-reference-api';
import { getApiErrorMessage } from '@/features/products/lib/product-presentation';

const VARIETY = 'VARIETY';
const CHARACTERISTIC = 'CHARACTERISTIC';

function ProductDimensionContributionDialog({
  metadata,
  mode = 'workspace',
  onClose,
  onResolved,
  open,
  product,
  workspaceId,
}) {
  const cancelRef = useRef(null);
  const isGlobal = mode === 'global';
  const characteristicKinds = metadata?.productCharacteristicKinds ?? [];
  const [type, setType] = useState(VARIETY);
  const [kind, setKind] = useState(characteristicKinds[0]?.value ?? '');
  const [value, setValue] = useState('');
  const [formError, setFormError] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');

  const [contribute, workspaceState] = useContributeProductReferenceMutation();
  const [createVariety, varietyState] = useCreateProductReferenceVarietyMutation();
  const [createCharacteristic, characteristicState] =
    useCreateProductReferenceCharacteristicMutation();

  useEffect(() => {
    if (!open) return;
    setType(VARIETY);
    setKind(characteristicKinds[0]?.value ?? '');
    setValue('');
    setFormError('');
    setReviewMessage('');
  }, [characteristicKinds, open]);

  const pending = (
    workspaceState.isLoading
    || varietyState.isLoading
    || characteristicState.isLoading
  );
  const typeItems = useMemo(() => [
    { value: VARIETY, label: 'Variété' },
    { value: CHARACTERISTIC, label: 'Caractéristique' },
  ], []);

  async function submit() {
    const proposedValue = value.trim();
    if (!proposedValue) {
      setFormError('Renseignez la valeur à ajouter au référentiel.');
      return;
    }
    if (type === CHARACTERISTIC && !kind) {
      setFormError('Sélectionnez le type de caractéristique.');
      return;
    }

    setFormError('');
    setReviewMessage('');

    try {
      if (isGlobal) {
        const result = type === VARIETY
          ? await createVariety({
            productId: product.id,
            name: proposedValue,
            aliases: [],
          }).unwrap()
          : await createCharacteristic({
            productId: product.id,
            kind,
            name: proposedValue,
            aliases: [],
          }).unwrap();

        onResolved?.({
          classification: 'PUBLISHED',
          publishedReference: result,
        });
        onClose();
        return;
      }

      const result = await contribute({
        workspaceId,
        type,
        productId: product.id,
        ...(type === CHARACTERISTIC ? { characteristicKind: kind } : {}),
        value: proposedValue,
      }).unwrap();

      if (result.classification === 'REVIEW_REQUIRED') {
        setReviewMessage(
          'La proposition nécessite une revue du référentiel global. '
          + 'Elle ne sera disponible dans une déclinaison qu’après validation.',
        );
        onResolved?.(result);
        return;
      }

      if (result.classification === 'INVALID') {
        setFormError(
          result.reasons?.[0]?.message
          ?? 'La proposition ne peut pas être utilisée.',
        );
        return;
      }

      onResolved?.(result);
      onClose();
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'Le référentiel n’a pas pu être enrichi.',
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
            <DialogTitle>Enrichir le référentiel</DialogTitle>
            <DialogDescription>
              Ajoutez une dimension à {product?.name}. Les ajouts Workspace
              suivent la politique de contribution du référentiel global.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <Field>
              <FieldLabel htmlFor="product-dimension-type">Dimension</FieldLabel>
              <Select
                disabled={pending}
                items={typeItems}
                onValueChange={(nextType) => {
                  setType(nextType);
                  setFormError('');
                  setReviewMessage('');
                }}
                value={type}
              >
                <SelectTrigger id="product-dimension-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {type === CHARACTERISTIC && (
              <Field>
                <FieldLabel htmlFor="product-dimension-kind">
                  Type de caractéristique
                </FieldLabel>
                <Select
                  disabled={pending}
                  items={characteristicKinds}
                  onValueChange={setKind}
                  value={kind || null}
                >
                  <SelectTrigger id="product-dimension-kind">
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {characteristicKinds.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="product-dimension-value">
                {type === VARIETY ? 'Nom de la variété' : 'Valeur'}
              </FieldLabel>
              <Input
                disabled={pending}
                id="product-dimension-value"
                maxLength={120}
                onChange={(event) => {
                  setValue(event.target.value);
                  setFormError('');
                  setReviewMessage('');
                }}
                placeholder={
                  type === VARIETY
                    ? 'Ex. Gala, Charlotte'
                    : 'Ex. En botte avec fanes'
                }
                value={value}
              />
            </Field>

            {reviewMessage && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                {reviewMessage}
              </div>
            )}

            <FieldError>{formError}</FieldError>
          </div>

          <DialogFooter>
            <DialogClose
              disabled={pending}
              ref={cancelRef}
              render={<Button type="button" variant="outline" />}
            >
              Fermer
            </DialogClose>
            {!reviewMessage && (
              <Button disabled={pending} onClick={submit} type="button">
                {pending ? 'Traitement…' : 'Ajouter'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { ProductDimensionContributionDialog };
