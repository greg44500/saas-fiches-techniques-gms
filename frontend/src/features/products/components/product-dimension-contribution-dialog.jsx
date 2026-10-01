import { useEffect, useMemo, useRef, useState } from 'react';
import { Minus } from 'lucide-react';

import { ActionIconButton } from '@/components/shared/action-icon-button';
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
  useUndoProductDimensionAdditionMutation,
} from '@/features/products/api/product-catalog-api';
import {
  useCreateProductReferenceCharacteristicMutation,
  useCreateProductReferenceVarietyMutation,
  useUndoProductReferenceDimensionAdditionMutation,
} from '@/features/products/api/product-reference-api';
import { getApiErrorMessage } from '@/features/products/lib/product-presentation';

const VARIETY = 'VARIETY';
const CHARACTERISTIC = 'CHARACTERISTIC';
const CHARACTERISTIC_PREFIX = 'CHARACTERISTIC:';

function getSessionStatus(result) {
  if (
    result.classification === 'PROVISIONAL'
    || result.classification === 'REVIEW_REQUIRED'
  ) {
    return {
      label: 'À valider',
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
    label: 'Ajoutée',
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
  const sessionEntrySequenceRef = useRef(0);
  const removalTimersRef = useRef(new Map());
  const isGlobal = mode === 'global';
  const [selectedType, setSelectedType] = useState(VARIETY);
  const [value, setValue] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [sessionEntries, setSessionEntries] = useState([]);

  const [contribute, workspaceState] = useContributeProductReferenceMutation();
  const [undoWorkspaceDimension, undoWorkspaceState] =
    useUndoProductDimensionAdditionMutation();
  const [createVariety, varietyState] = useCreateProductReferenceVarietyMutation();
  const [createCharacteristic, characteristicState] =
    useCreateProductReferenceCharacteristicMutation();
  const [undoGlobalDimension, undoGlobalState] =
    useUndoProductReferenceDimensionAdditionMutation();

  const typeItems = useMemo(() => [
    { value: VARIETY, label: 'Variété' },
    ...(metadata?.productCharacteristicKinds ?? [])
      .filter((kind) => (
        isGlobal || kind.value !== 'COMMERCIAL_TYPE'
      ))
      .map((kind) => ({
        value: CHARACTERISTIC_PREFIX + kind.value,
        label: kind.label,
      })),
  ], [isGlobal, metadata?.productCharacteristicKinds]);

  useEffect(() => {
    if (!open) return;

    setSelectedType(VARIETY);
    setValue('');
    setFormError('');
    setConfirmation(null);
    setSessionEntries([]);
    sessionEntrySequenceRef.current = 0;
  }, [open]);

  useEffect(() => () => {
    for (const timer of removalTimersRef.current.values()) {
      globalThis.clearTimeout(timer);
    }
    removalTimersRef.current.clear();
  }, []);

  const pending = (
    workspaceState.isLoading
    || varietyState.isLoading
    || characteristicState.isLoading
    || undoWorkspaceState.isLoading
    || undoGlobalState.isLoading
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

    sessionEntrySequenceRef.current += 1;
    setSessionEntries((current) => [
      ...current,
      {
        id: 'session-entry-' + sessionEntrySequenceRef.current,
        type: isVariety ? VARIETY : CHARACTERISTIC,
        typeLabel: selectedDefinition?.label ?? 'Valeur',
        value: resolvedReference?.name ?? proposedValue,
        referenceId: resolvedReference?.id ?? null,
        canUndo: [
          'AUTO_PUBLISHABLE',
          'PUBLISHED',
        ].includes(result.classification),
        removing: false,
        status,
        detail: (
          result.classification === 'PROVISIONAL'
          || result.classification === 'REVIEW_REQUIRED'
        )
          ? 'Utilisable dans votre espace de travail en attendant la validation du référentiel global.'
          : null,
      },
    ]);
  }

  function prepareNextValue() {
    setValue('');
    setFormError('');
    setConfirmation(null);
    globalThis.queueMicrotask(() => {
      valueRef.current?.focus();
    });
  }

  async function submit({ forceCreate = false } = {}) {
    const proposedValue = value.trim();
    if (!proposedValue) {
      setFormError('Renseignez la valeur à ajouter au référentiel.');
      return;
    }

    if (/,/.test(proposedValue)) {
      setFormError('Ajoutez une seule valeur à la fois.');
      return;
    }

    setFormError('');
    setConfirmation(null);

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
        forceCreate,
      }).unwrap();

      if (result.classification === 'INVALID') {
        setFormError(
          result.reasons?.[0]?.message
          ?? 'La proposition ne peut pas être utilisée.',
        );
        return;
      }

      if (result.classification === 'USER_CONFIRMATION_REQUIRED') {
        setConfirmation({
          proposedValue,
          candidates: result.candidates ?? [],
        });
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


  async function undoSessionEntry(entry) {
    if (!entry.canUndo || !entry.referenceId || entry.removing) return;

    setFormError('');

    try {
      const payload = {
        productId: product.id,
        dimensionType: entry.type,
        dimensionId: entry.referenceId,
      };
      const mutation = isGlobal
        ? undoGlobalDimension(payload)
        : undoWorkspaceDimension({
          workspaceId,
          ...payload,
        });

      await mutation.unwrap();

      setSessionEntries((current) => current.map((candidate) => (
        candidate.id === entry.id
          ? { ...candidate, removing: true }
          : candidate
      )));
      onResolved?.({
        classification: 'UNDO',
        dimensionType: entry.type,
        dimensionId: entry.referenceId,
      });

      const timer = globalThis.setTimeout(() => {
        setSessionEntries((current) => current.filter(
          (candidate) => candidate.id !== entry.id,
        ));
        removalTimersRef.current.delete(entry.id);
        globalThis.queueMicrotask(() => {
          valueRef.current?.focus();
        });
      }, 180);
      removalTimersRef.current.set(entry.id, timer);
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'Cette valeur ne peut pas être retirée.',
      ));
    }
  }

  function selectCandidate(candidate) {
    const result = {
      classification: 'EXISTING',
      existingReference: candidate,
    };
    recordResolvedValue(result, candidate.name);
    onResolved?.(result);
    prepareNextValue();
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
                      : characteristicKind === 'PRESENTATION'
                        ? 'Ex. Entier'
                        : characteristicKind === 'CUT'
                          ? 'Ex. Filet'
                          : characteristicKind === 'SIZE_FORMAT'
                            ? 'Ex. 35/40'
                            : characteristicKind === 'COLOR'
                              ? 'Ex. Rouge'
                              : characteristicKind === 'QUALITY_DESIGNATION'
                                ? 'Ex. Label Rouge'
                                : 'Saisissez une valeur'
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

            {confirmation && (
              <section className="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium">
                    Une valeur proche existe déjà.
                  </p>
                  <InfoTooltip
                    content={
                      'Utilisez une valeur existante si elle correspond, '
                      + 'ou confirmez la création de « '
                      + confirmation.proposedValue
                      + ' ».'
                    }
                    label="Aide sur les valeurs proches"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {confirmation.candidates.map((candidate) => (
                    <Button
                      disabled={pending}
                      key={candidate.id}
                      onClick={() => selectCandidate(candidate)}
                      type="button"
                      variant="outline"
                    >
                      Utiliser {candidate.name}
                    </Button>
                  ))}
                  <Button
                    disabled={pending}
                    onClick={() => submit({ forceCreate: true })}
                    type="button"
                  >
                    Créer quand même « {confirmation.proposedValue} »
                  </Button>
                </div>
              </section>
            )}

            {sessionEntries.length > 0 && (
              <section
                aria-label="Valeurs ajoutées dans cette session"
                className="rounded-lg border border-border p-3"
              >
                <p className="text-sm font-medium">
                  Valeurs ajoutées dans cette session
                </p>
                <ul className="mt-3 space-y-2">
                  {sessionEntries.map((entry) => (
                    <li
                      className={
                        'group flex flex-wrap items-start justify-between gap-3 '
                        + 'rounded-md bg-muted/30 px-3 py-2 transition-all '
                        + 'duration-200 ease-out '
                        + (entry.removing
                          ? 'translate-x-6 opacity-0'
                          : 'translate-x-0 opacity-100')
                      }
                      key={entry.id}
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
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={entry.status.tone}>
                          {entry.status.label}
                        </StatusBadge>
                        {entry.canUndo && (
                          <ActionIconButton
                            className={
                              'translate-x-1 opacity-0 transition-all '
                              + 'duration-150 group-hover:translate-x-0 '
                              + 'group-hover:opacity-100 focus-visible:translate-x-0 '
                              + 'focus-visible:opacity-100'
                            }
                            disabled={pending || entry.removing}
                            Icon={Minus}
                            label={'Retirer ' + entry.value}
                            onClick={() => undoSessionEntry(entry)}
                            tooltipLabel="Retirer cette valeur"
                            variant="ghost"
                          />
                        )}
                      </div>
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
