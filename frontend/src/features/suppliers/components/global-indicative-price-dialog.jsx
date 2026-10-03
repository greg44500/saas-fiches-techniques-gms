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
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  getReferenceUnitLabel,
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
  const [source, setSource] = useState('');
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
    setSource(existingPrice?.source ?? '');
    setError('');
  }, [existingPrice, open, variant?.id]);

  async function submit(event) {
    event.preventDefault();

    if (!variant) return;

    if (!amount || Number(amount) <= 0) {
      setError('Le Prix repère doit être strictement positif.');
      return;
    }

    setError('');

    try {
      const price = await setPrice({
        productVariantId: variant.id,
        sourceAmount: amount,
        sourceBasis: variant.referenceUnit,
        currency: 'EUR',
        source: source.trim() || 'Ajustement gestionnaire métier',
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
        <DialogContent initialFocus={cancelRef}>
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
                Prix repère HT / {getReferenceUnitLabel(
                  null,
                  variant?.referenceUnit,
                )}
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
