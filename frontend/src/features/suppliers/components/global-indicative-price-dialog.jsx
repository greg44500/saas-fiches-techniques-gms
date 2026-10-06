import { useEffect, useRef, useState } from 'react';

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
  FieldDescription,
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
  getVariantReferenceUnitLabel,
} from '@/features/products/lib/product-presentation';
import {
  useArchiveGlobalIndicativePriceMutation,
  useListGlobalIndicativePricesQuery,
  useSetGlobalIndicativePriceMutation,
} from '@/features/suppliers/api/supplier-api';
import {
  getApiErrorMessage,
} from '@/features/suppliers/lib/supplier-presentation';

function GlobalIndicativePriceDialog({
  onClose,
  onSaved,
  open,
  variant,
}) {
  const cancelRef = useRef(null);
  const [amount, setAmount] = useState('');
  const [sourceBasis, setSourceBasis] = useState('');
  const [source, setSource] = useState('');
  const [sourceOrganization, setSourceOrganization] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [observedAt, setObservedAt] = useState('');
  const [containerType, setContainerType] = useState('');
  const [unitCount, setUnitCount] = useState('');
  const [quantityPerUnit, setQuantityPerUnit] = useState('');
  const [netWeight, setNetWeight] = useState('');
  const [netWeightUnit, setNetWeightUnit] = useState('G');
  const [supplierLabel, setSupplierLabel] = useState('');
  const [error, setError] = useState('');

  const priceQuery = useListGlobalIndicativePricesQuery(
    {
      productVariantId: variant?.id,
      status: 'ACTIVE',
    },
    {
      skip: !open || !variant?.id,
    },
  );
  const existingPrice = priceQuery.data?.[0] ?? null;

  const [setPrice, setPriceState] =
    useSetGlobalIndicativePriceMutation();
  const [archivePrice, archivePriceState] =
    useArchiveGlobalIndicativePriceMutation();

  const pending =
    setPriceState.isLoading
    || archivePriceState.isLoading;

  useEffect(() => {
    if (!open) return;

    setAmount(existingPrice?.sourceAmount ?? '');
    setSourceBasis(
      existingPrice?.sourceBasis
      ?? variant?.referenceUnit
      ?? '',
    );
    setSource(existingPrice?.source ?? '');
    setSourceOrganization(existingPrice?.sourceOrganization ?? '');
    setSourceUrl(existingPrice?.sourceUrl ?? '');
    setObservedAt(
      existingPrice?.observedAt
        ? new Date(existingPrice.observedAt).toISOString().slice(0, 10)
        : '',
    );
    setContainerType(existingPrice?.packaging?.containerType ?? '');
    setUnitCount(existingPrice?.packaging?.unitCount
      ? String(existingPrice.packaging.unitCount)
      : '');
    setQuantityPerUnit(existingPrice?.packaging?.quantityPerUnit ?? '');
    setNetWeight(existingPrice?.packaging?.netWeight ?? '');
    setNetWeightUnit(existingPrice?.packaging?.netWeightUnit ?? 'G');
    setSupplierLabel(existingPrice?.packaging?.supplierLabel ?? '');
    setError('');
  }, [existingPrice, open, variant?.id, variant?.referenceUnit]);

  async function submit(event) {
    event.preventDefault();

    if (!variant) return;

    if (!amount || Number(amount) <= 0) {
      setError('Le Prix repère doit être strictement positif.');
      return;
    }

    const parsedUnitCount = unitCount ? Number(unitCount) : null;
    if (
      parsedUnitCount !== null
      && (!Number.isInteger(parsedUnitCount) || parsedUnitCount <= 0)
    ) {
      setError('Le nombre de sous-unités doit être un entier positif.');
      return;
    }

    if (
      sourceBasis === 'PACKAGE'
      && (
        !parsedUnitCount
        || !quantityPerUnit
        || Number(quantityPerUnit) <= 0
      )
    ) {
      setError(
        'Le prix du conditionnement exige son nombre de sous-unités et la quantité par sous-unité.',
      );
      return;
    }

    const hasPackaging = Boolean(
      containerType.trim()
      || parsedUnitCount
      || quantityPerUnit
      || netWeight
      || supplierLabel.trim(),
    );

    setError('');

    try {
      const price = await setPrice({
        productVariantId: variant.id,
        sourceAmount: amount,
        sourceBasis,
        currency: 'EUR',
        source: source.trim() || null,
        packaging: hasPackaging
          ? {
            containerType: containerType.trim() || null,
            unitCount: parsedUnitCount,
            quantityPerUnit: quantityPerUnit || null,
            unit: quantityPerUnit ? variant.referenceUnit : null,
            netWeight: netWeight || null,
            netWeightUnit: netWeight ? netWeightUnit : null,
            supplierLabel: supplierLabel.trim() || null,
          }
          : null,
        sourceOrganization: sourceOrganization.trim() || null,
        sourceUrl: sourceUrl.trim() || null,
        observedAt: observedAt || null,
      }).unwrap();

      onSaved?.(price);
    } catch (submissionError) {
      setError(getApiErrorMessage(
        submissionError,
        'Le Prix repère global n’a pas pu être enregistré.',
      ));
    }
  }

  async function archive() {
    if (!variant || !existingPrice) return;

    setError('');

    try {
      await archivePrice({
        productVariantId: variant.id,
      }).unwrap();

      onSaved?.({ removed: true });
    } catch (archiveError) {
      setError(getApiErrorMessage(
        archiveError,
        'Le Prix repère global n’a pas pu être retiré.',
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
          className="max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto"
          initialFocus={cancelRef}
        >
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>Prix repère global</DialogTitle>
              <InfoTooltip
                content="Estimation globale de dernier recours utilisée pour valoriser une Fiche lorsqu’aucun prix fournisseur, Dossier ou espace de travail n’est disponible."
                label="À propos du Prix repère global"
              />
            </div>
          </DialogHeader>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            <Field>
              <FieldLabel>Référence Produit</FieldLabel>
              <p className="rounded-md border border-border px-3 py-2 text-sm">
                {variant?.name ?? 'Référence indisponible'}
              </p>
            </Field>

            <Field>
              <FieldLabel htmlFor="global-indicative-price-amount">
                {sourceBasis === 'PACKAGE'
                  ? 'Prix HT du conditionnement observé'
                  : 'Prix repère HT / '
                    + getVariantReferenceUnitLabel(null, variant)}
              </FieldLabel>
              <Input
                id="global-indicative-price-amount"
                min="0"
                onChange={(event) => setAmount(event.target.value)}
                step="any"
                type="number"
                value={amount}
              />
            </Field>

            <Field>
              <FieldLabel>Base du prix relevé</FieldLabel>
              <Select
                items={[
                  {
                    value: variant?.referenceUnit ?? 'UNIT',
                    label:
                      'Prix par '
                      + getVariantReferenceUnitLabel(null, variant),
                  },
                  {
                    value: 'PACKAGE',
                    label: 'Prix du conditionnement',
                  },
                ]}
                onValueChange={setSourceBasis}
                value={sourceBasis || variant?.referenceUnit || null}
              >
                <SelectTrigger aria-label="Base du Prix repère">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={variant?.referenceUnit ?? 'UNIT'}>
                    Prix par {getVariantReferenceUnitLabel(null, variant)}
                  </SelectItem>
                  <SelectItem value="PACKAGE">
                    Prix du conditionnement
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="space-y-4 rounded-md border border-border p-4">
              <div>
                <p className="text-sm font-medium">Conditionnement observé</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Une seule structure arithmétique est conservée. Le libellé d’origine peut expliquer un carton ou des paquets imbriqués.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="global-price-container">
                    Contenant principal
                  </FieldLabel>
                  <Input
                    id="global-price-container"
                    maxLength={80}
                    onChange={(event) => setContainerType(event.target.value)}
                    placeholder="Paquet, carton, sac…"
                    value={containerType}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="global-price-unit-count">
                    Sous-unités
                  </FieldLabel>
                  <Input
                    id="global-price-unit-count"
                    min="1"
                    onChange={(event) => setUnitCount(event.target.value)}
                    placeholder="Ex. 8"
                    type="number"
                    value={unitCount}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="global-price-quantity-per-unit">
                    Quantité par sous-unité
                  </FieldLabel>
                  <Input
                    id="global-price-quantity-per-unit"
                    min="0"
                    onChange={(event) => setQuantityPerUnit(event.target.value)}
                    placeholder={
                      'Ex. 4 '
                      + getVariantReferenceUnitLabel(
                        null,
                        variant,
                        { plural: true },
                      )
                    }
                    step="any"
                    type="number"
                    value={quantityPerUnit}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="global-price-net-weight">
                    Poids net total
                  </FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      id="global-price-net-weight"
                      min="0"
                      onChange={(event) => setNetWeight(event.target.value)}
                      step="any"
                      type="number"
                      value={netWeight}
                    />
                    <Select
                      items={[
                        { value: 'G', label: 'g' },
                        { value: 'KG', label: 'kg' },
                      ]}
                      onValueChange={setNetWeightUnit}
                      value={netWeightUnit}
                    >
                      <SelectTrigger aria-label="Unité du poids net" className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="G">g</SelectItem>
                        <SelectItem value="KG">kg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="global-price-packaging-label">
                    Libellé d’origine
                  </FieldLabel>
                  <Input
                    id="global-price-packaging-label"
                    maxLength={240}
                    onChange={(event) => setSupplierLabel(event.target.value)}
                    placeholder="Ex. 1 carton = 8 paquets × 4 tranches de 100 g"
                    value={supplierLabel}
                  />
                </Field>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="global-price-source-organization">
                  Source professionnelle
                </FieldLabel>
                <Input
                  id="global-price-source-organization"
                  maxLength={160}
                  onChange={(event) => setSourceOrganization(event.target.value)}
                  placeholder="Ex. Transgourmet"
                  value={sourceOrganization}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="global-price-observed-at">
                  Date du relevé
                </FieldLabel>
                <Input
                  id="global-price-observed-at"
                  onChange={(event) => setObservedAt(event.target.value)}
                  type="date"
                  value={observedAt}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="global-price-source-url">
                URL de la source
              </FieldLabel>
              <Input
                id="global-price-source-url"
                maxLength={1000}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://…"
                type="url"
                value={sourceUrl}
              />
              <FieldDescription>
                Ne renseignez une organisation que si le prix provient réellement de cette source.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="global-indicative-price-source">
                Note / provenance
              </FieldLabel>
              <Input
                id="global-indicative-price-source"
                maxLength={500}
                onChange={(event) => setSource(event.target.value)}
                placeholder="Ex. ajustement gestionnaire métier"
                value={source}
              />
            </Field>

            <p className="text-xs text-muted-foreground">
              Cette valeur est indicative. Un prix propre au client ou une
              donnée fournisseur plus précise reste toujours prioritaire.
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
                  Retirer le Prix repère
                </Button>
              )}
              <DialogClose
                disabled={pending}
                ref={cancelRef}
                render={<Button type="button" variant="outline" />}
              >
                Annuler
              </DialogClose>
              <Button
                disabled={pending || !variant}
                type="submit"
              >
                {pending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { GlobalIndicativePriceDialog };
