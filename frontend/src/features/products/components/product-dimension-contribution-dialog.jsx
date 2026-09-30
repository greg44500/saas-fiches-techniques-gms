import { useEffect, useMemo, useRef, useState } from 'react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { StatusBadge } from '@/components/shared/status-badge';
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
const CHARACTERISTIC_PREFIX = 'CHARACTERISTIC:';

function getSessionStatus(result) {
  if (result.classification === 'REVIEW_REQUIRED') {
    return {
      label: 'À examiner',
      tone: 'warning',
    };
  }

  if (result.classification === 'EXISTING') {
    return {
      label: 'Existe déjà',
      tone: 'neutral',
    };
  }

  return {
    label: 'Disponible',
    tone: 'success',
  };
}

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
  const valueRef = useRef(null);
  const isGlobal = mode === 'global';
  const characteristicKinds = metadata?.productCharacteristicKinds ?? [];
  const [selectedType, setSelectedType] = useState(VARIETY);
  const [value, setValue] = useState('');
  const [formError, setFormError] = useState('');
  const [sessionEntries, setSessionEntries] = useState([]);

  const [contribute, workspaceState] = useContributeProductReferenceMutation();
  const [createVariety, varietyState] = useCreateProductReferenceVarietyMutation();
  const [createCharacteristic, characteristicState] =
    useCreateProductReferenceCharacteristicMutation();

  const typeItems = useMemo(() => [
    { value: VARIETY, label: 'Variété' },
    ...characteristicKinds.map((kind) => ({
      value: CHARACTERISTIC_PREFIX + kind.value,
      label: kind.label,
    })),
  ], [characteristicKinds]);

  useEffect(() => {
    if (!open) return;

    setSelectedType(VARIETY);
    setValue('');
    setFormError('');
    setSessionEntries([]);
  }, [open]);

  const pending = (
    workspaceState.isLoading
    || varietyState.isLoading
    || characteristicState.isLoading
  );
  const selectedDefinition = typeItems.find(
    (item) => item.value === selectedType,
  ) ?? typeItems[0];
  const isVariety = selectedType === VARIETY;
  const characteristicKind = isVariety
    ? null
    : selectedType.slice(CHARACTERISTIC_PREFIX.length);
  const valueLabel = isVariety
    ? 'Nom de la variété'
    : selectedDefinition?.label ?? 'Valeur';

  function recordResolvedValue(result, proposedValue) {
    const status = getSessionStatus(result);
    const resolvedReference = (
      result.publishedReference
      ?? result.existingReference
      ?? null
    );

    setSessionEntries((current) => [
      ...current,
      {
        typeLabel: selectedDefinition?.label ?? 'Valeur',
        value: resolvedReference?.name ?? proposedValue,
        status,
        detail: result.classification === 'REVIEW_REQUIRED'
          ? 'Disponible après validation du référentiel global.'
          : null,
      },
    ]);
  }

  function prepareNextValue() {
    setValue('');
    setFormError('');
    globalThis.queueMicrotask(() => {
      valueRef.current?.focus();
    });
  }

  async function submit() {
    const proposedValue = value.trim();
    if (!proposedValue) {
      setFormError('Renseignez la valeur à ajouter au référentiel.');
      return;
    }

    setFormError('');

    try {
      if (isGlobal) {
        const publishedReference = isVariety
          ? await createVariety({
            productId: product.id,
            name: proposedValue,
            aliases: [],
          }).unwrap()
          : await createCharacteristic({
            productId: product.id,
            kind: characteristicKind,
            name: proposedValue,
            aliases: [],
          }).unwrap();

        const result = {
          classification: 'PUBLISHED',
          publishedReference,
        };

        recordResolvedValue(result, proposedValue);
        onResolved?.(result);
        prepareNextValue();
        return;
      }

      const result = await contribute({
        workspaceId,
        type: isVariety ? VARIETY : CHARACTERISTIC,
        productId: product.id,
        ...(isVariety
          ? {}
          : { characteristicKind }),
        value: proposedValue,
      }).unwrap();

      if (result.classification === 'INVALID') {
        setFormError(
          result.reasons?.[0]?.message
          ?? 'La proposition ne peut pas être utilisée.',
        );
        return;
      }

      recordResolvedValue(result, proposedValue);
      onResolved?.(result);
      prepareNextValue();
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
        <DialogContent
          className="max-h-[calc(100vh-2rem)] max-w-xl overflow-y-auto"
          initialFocus={cancelRef}
        >
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>Ajouter des valeurs au référentiel</DialogTitle>
              <InfoTooltip
                content={
                  'Ajoutez successivement les variétés et caractéristiques utiles à '
                  + (product?.name ?? 'ce Produit')
                  + '. Une valeur peut être disponible immédiatement ou nécessiter une validation.'
                }
                label="À propos de l’enrichissement du référentiel"
              />
            </div>
            <DialogDescription className="sr-only">
              Ajoutez plusieurs valeurs au référentiel du Produit sans fermer ce formulaire.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <Field>
              <FieldLabel htmlFor="product-dimension-type">
                Type de valeur
              </FieldLabel>
              <Select
                disabled={pending}
                items={typeItems}
                onValueChange={(nextType) => {
                  setSelectedType(nextType);
                  setValue('');
                  setFormError('');
                }}
                value={selectedType}
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

            <Field>
              <FieldLabel htmlFor="product-dimension-value">
                {valueLabel}
              </FieldLabel>
              <div className="flex gap-2">
                <Input
                  disabled={pending}
                  id="product-dimension-value"
                  maxLength={120}
                  onChange={(event) => {
                    setValue(event.target.value);
                    setFormError('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      submit();
                    }
                  }}
                  placeholder={
                    isVariety
                      ? 'Ex. Bergeron'
                      : 'Ex. Entier, Orange, 35/40…'
                  }
                  ref={valueRef}
                  value={value}
                />
                <Button
                  disabled={pending || !value.trim()}
                  onClick={submit}
                  type="button"
                >
                  {pending ? 'Traitement…' : 'Ajouter'}
                </Button>
              </div>
            </Field>

            <FieldError>{formError}</FieldError>

            {sessionEntries.length > 0 && (
              <section
                aria-label="Valeurs ajoutées dans cette session"
                className="rounded-lg border border-border p-3"
              >
                <p className="text-sm font-medium">
                  Valeurs ajoutées dans cette session
                </p>
                <ul className="mt-3 space-y-2">
                  {sessionEntries.map((entry, index) => (
                    <li
                      className="flex flex-wrap items-start justify-between gap-3 rounded-md bg-muted/30 px-3 py-2"
                      key={
                        entry.typeLabel
                        + '-'
                        + entry.value
                        + '-'
                        + index
                      }
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {entry.value}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.typeLabel}
                          {entry.detail ? ' · ' + entry.detail : ''}
                        </p>
                      </div>
                      <StatusBadge tone={entry.status.tone}>
                        {entry.status.label}
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <DialogFooter>
            <DialogClose
              disabled={pending}
              ref={cancelRef}
              render={<Button type="button" variant="outline" />}
            >
              Fermer
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { ProductDimensionContributionDialog };
