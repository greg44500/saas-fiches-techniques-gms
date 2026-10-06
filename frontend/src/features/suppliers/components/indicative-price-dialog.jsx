import { useEffect, useMemo, useRef, useState } from 'react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useGetProductMetadataQuery,
} from '@/features/products/api/product-catalog-api';
import {
  ProductSearchAutocomplete,
} from '@/features/products/components/product-search-autocomplete';
import {
  getReferenceLabel,
  getReferenceUnitLabel,
  getVariantReferenceUnitLabel,
} from '@/features/products/lib/product-presentation';
import {
  useArchiveDossierIndicativePriceMutation,
  useArchiveWorkspaceIndicativePriceMutation,
  useListDossierIndicativePricesQuery,
  useListWorkspaceIndicativePricesQuery,
  useSetDossierIndicativePriceMutation,
  useSetWorkspaceIndicativePriceMutation,
} from '@/features/suppliers/api/supplier-api';
import {
  getApiErrorMessage,
} from '@/features/suppliers/lib/supplier-presentation';

function IndicativePriceDialog({
  dossierId = null,
  onClose,
  onSaved,
  open,
  variant = null,
  workspaceId,
}) {
  const isDossier = Boolean(dossierId);
  const cancelRef = useRef(null);
  const selectedLabelRef = useRef('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [amount, setAmount] = useState('');
  const [basis, setBasis] = useState('');
  const [source, setSource] = useState('');
  const [error, setError] = useState('');

  const metadataQuery = useGetProductMetadataQuery(workspaceId);
  const metadata = metadataQuery.data;
  const productVariantId = selectedVariant?.id ?? null;

  const workspacePriceQuery = useListWorkspaceIndicativePricesQuery(
    {
      workspaceId,
      productVariantId,
    },
    {
      skip: !open || isDossier || !productVariantId,
    },
  );
  const dossierPriceQuery = useListDossierIndicativePricesQuery(
    {
      workspaceId,
      dossierId,
      productVariantId,
    },
    {
      skip: !open || !isDossier || !productVariantId,
    },
  );

  const [setWorkspacePrice, setWorkspaceState] =
    useSetWorkspaceIndicativePriceMutation();
  const [setDossierPrice, setDossierState] =
    useSetDossierIndicativePriceMutation();
  const [archiveWorkspacePrice, archiveWorkspaceState] =
    useArchiveWorkspaceIndicativePriceMutation();
  const [archiveDossierPrice, archiveDossierState] =
    useArchiveDossierIndicativePriceMutation();

  const existingPrice = (
    isDossier
      ? dossierPriceQuery.data?.[0]
      : workspacePriceQuery.data?.[0]
  ) ?? null;

  const pending = (
    setWorkspaceState.isLoading
    || setDossierState.isLoading
    || archiveWorkspaceState.isLoading
    || archiveDossierState.isLoading
  );

  useEffect(() => {
    if (!open) return;

    const initialLabel = variant?.name ?? '';
    selectedLabelRef.current = initialLabel;
    setSelectedVariant(variant ?? null);
    setProductSearch(initialLabel);
    setAmount('');
    setBasis(variant?.referenceUnit ?? '');
    setSource('');
    setError('');
  }, [open, variant]);

  useEffect(() => {
    if (!open || !productVariantId) return;

    if (existingPrice) {
      setAmount(existingPrice.sourceAmount ?? '');
      setBasis(existingPrice.sourceBasis ?? selectedVariant?.referenceUnit ?? '');
      setSource(existingPrice.source ?? '');
      return;
    }

    setAmount('');
    setBasis(selectedVariant?.referenceUnit ?? '');
    setSource('');
  }, [
    existingPrice,
    open,
    productVariantId,
    selectedVariant?.referenceUnit,
  ]);

  const unitItems = useMemo(() => {
    if (!selectedVariant) return [];

    const units = metadata?.referenceUnits ?? [];
    const referenceUnit = units.find(
      ({ value }) => value === selectedVariant.referenceUnit,
    );

    return units
      .filter(({ dimension }) => (
        !referenceUnit?.dimension
        || dimension === referenceUnit.dimension
      ))
      .map(({ value }) => ({
        value,
        label: value === 'UNIT'
          ? getVariantReferenceUnitLabel(
              metadata,
              selectedVariant,
            )
          : getReferenceUnitLabel(metadata, value),
      }));
  }, [metadata, selectedVariant]);

  async function submit(event) {
    event.preventDefault();

    if (!selectedVariant) {
      setError('Sélectionnez une Référence Produit.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError('Le prix indicatif doit être strictement positif.');
      return;
    }

    if (!basis) {
      setError('Sélectionnez l’unité du prix.');
      return;
    }

    try {
      const body = {
        workspaceId,
        productVariantId: selectedVariant.id,
        sourceAmount: amount,
        sourceBasis: basis,
        currency: 'EUR',
        source: source.trim() || null,
      };

      const result = isDossier
        ? await setDossierPrice({
          ...body,
          dossierId,
        }).unwrap()
        : await setWorkspacePrice(body).unwrap();

      onSaved?.(result);
    } catch (submissionError) {
      setError(getApiErrorMessage(
        submissionError,
        'Le Prix indicatif n’a pas pu être enregistré.',
      ));
    }
  }

  async function archive() {
    if (!selectedVariant || !existingPrice) return;

    try {
      if (isDossier) {
        await archiveDossierPrice({
          workspaceId,
          dossierId,
          productVariantId: selectedVariant.id,
        }).unwrap();
      } else {
        await archiveWorkspacePrice({
          workspaceId,
          productVariantId: selectedVariant.id,
        }).unwrap();
      }

      onSaved?.({ removed: true });
    } catch (archiveError) {
      setError(getApiErrorMessage(
        archiveError,
        'Le Prix indicatif n’a pas pu être retiré.',
      ));
    }
  }

  const title = isDossier
    ? 'Prix indicatif du Dossier'
    : 'Prix indicatif de l’espace de travail';

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
            <div className="flex items-center gap-2">
              <DialogTitle>{title}</DialogTitle>
              <InfoTooltip
                content={
                  isDossier
                    ? 'Estimation propre à ce Dossier. Elle est utilisée uniquement en dernier recours lorsqu’aucun prix commercial applicable n’est disponible.'
                    : 'Estimation commune à votre espace de travail. Elle est utilisée uniquement en dernier recours lorsqu’aucun prix commercial applicable ni Prix indicatif Dossier n’est disponible.'
                }
                label="À propos du Prix indicatif"
              />
            </div>
          </DialogHeader>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            {variant ? (
              <Field>
                <FieldLabel>Référence Produit</FieldLabel>
                <p className="rounded-md border border-border px-3 py-2 text-sm">
                  {variant.name}
                </p>
              </Field>
            ) : (
              <Field>
                <FieldLabel>Référence Produit</FieldLabel>
                <ProductSearchAutocomplete
                  metadata={metadata}
                  onSelect={(result) => {
                    if (!result.variant) return;

                    const selectedLabel = getReferenceLabel(
                      metadata,
                      result.product,
                      result.variant,
                    );
                    selectedLabelRef.current = selectedLabel;
                    setSelectedVariant(result.variant);
                    setProductSearch(selectedLabel);
                    setError('');
                  }}
                  onValueChange={(value) => {
                    setProductSearch(value);

                    if (value !== selectedLabelRef.current) {
                      selectedLabelRef.current = '';
                      setSelectedVariant(null);
                    }
                  }}
                  scope="REFERENCE"
                  value={productSearch}
                  workspaceId={workspaceId}
                />
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="indicative-price-amount">
                  Prix indicatif HT
                </FieldLabel>
                <Input
                  id="indicative-price-amount"
                  min="0"
                  onChange={(event) => setAmount(event.target.value)}
                  step="any"
                  type="number"
                  value={amount}
                />
              </Field>

              <Field>
                <FieldLabel>
                  Unité du prix (Kilo, Pièce, etc.)
                </FieldLabel>
                <Select
                  disabled={!selectedVariant}
                  items={unitItems}
                  onValueChange={setBasis}
                  value={basis}
                >
                  <SelectTrigger aria-label="Unité du prix indicatif">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="indicative-price-source">
                Note / provenance
              </FieldLabel>
              <Input
                id="indicative-price-source"
                maxLength={500}
                onChange={(event) => setSource(event.target.value)}
                placeholder="Ex. estimation interne septembre 2026"
                value={source}
              />
            </Field>

            <p className="text-xs text-muted-foreground">
              Devise V1 : EUR.
            </p>

            <FieldError>{error}</FieldError>

            <DialogFooter>
              {existingPrice && (
                <Button
                  disabled={pending}
                  onClick={archive}
                  type="button"
                  variant="outline"
                >
                  Retirer le Prix indicatif
                </Button>
              )}
              <DialogClose
                disabled={pending}
                ref={cancelRef}
                render={<Button type="button" variant="outline" />}
              >
                Annuler
              </DialogClose>
              <Button disabled={pending || !selectedVariant} type="submit">
                {pending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { IndicativePriceDialog };
