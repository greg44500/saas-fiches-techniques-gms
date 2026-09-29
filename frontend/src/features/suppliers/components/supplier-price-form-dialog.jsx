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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateInvoicedPriceMutation,
  useCreateNegotiatedPriceMutation,
} from '@/features/suppliers/api/supplier-api';
import {
  getReferenceUnitLabel,
} from '@/features/products/lib/product-presentation';
import {
  getApiErrorMessage,
} from '@/features/suppliers/lib/supplier-presentation';

const NONE = '__NONE__';
const PRICE_BASES = ['PACKAGE', 'G', 'KG', 'ML', 'CL', 'L', 'UNIT'];

function SupplierPriceFormDialog({
  articles,
  dossierId,
  mode,
  onClose,
  onSaved,
  open,
  workspaceId,
}) {
  const isInvoice = mode === 'invoice';
  const cancelRef = useRef(null);
  const [articleId, setArticleId] = useState(NONE);
  const [amount, setAmount] = useState('');
  const [basis, setBasis] = useState('KG');
  const [date, setDate] = useState('');
  const [validTo, setValidTo] = useState('');
  const [source, setSource] = useState('');
  const [error, setError] = useState('');

  const [createNegotiated, negotiatedState] =
    useCreateNegotiatedPriceMutation();
  const [createInvoice, invoiceState] =
    useCreateInvoicedPriceMutation();
  const pending = negotiatedState.isLoading || invoiceState.isLoading;

  useEffect(() => {
    if (!open) return;

    setArticleId(NONE);
    setAmount('');
    setBasis('KG');
    setDate('');
    setValidTo('');
    setSource('');
    setError('');
  }, [open]);

  async function submit(event) {
    event.preventDefault();

    if (articleId === NONE) {
      setError('Sélectionnez un Article fournisseur.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError('Le montant doit être strictement positif.');
      return;
    }

    if (!date) {
      setError(
        isInvoice
          ? 'La date de facture est obligatoire.'
          : 'Le début de validité est obligatoire.',
      );
      return;
    }

    const article = articles.find(({ id }) => id === articleId);

    try {
      const result = isInvoice
        ? await createInvoice({
          workspaceId,
          dossierId,
          supplierId: article.supplierId,
          articleId,
          invoiceDate: new Date(date).toISOString(),
          sourceAmount: amount,
          sourceBasis: basis,
          currency: 'EUR',
          source: source.trim() || null,
        }).unwrap()
        : await createNegotiated({
          workspaceId,
          dossierId,
          articleId,
          sourceAmount: amount,
          sourceBasis: basis,
          currency: 'EUR',
          validFrom: new Date(date).toISOString(),
          validTo: validTo ? new Date(validTo).toISOString() : null,
          source: source.trim() || null,
        }).unwrap();

      onSaved(result);
    } catch (submissionError) {
      setError(getApiErrorMessage(
        submissionError,
        isInvoice
          ? 'Le Prix facturé n’a pas pu être enregistré.'
          : 'Le Tarif négocié n’a pas pu être enregistré.',
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
              <DialogTitle>
                {isInvoice ? 'Ajouter un Prix facturé' : 'Ajouter un Tarif négocié'}
              </DialogTitle>
              <InfoTooltip
                content="Cette donnée commerciale appartient strictement au Dossier courant."
                label="À propos de ce prix"
              />
            </div>
          </DialogHeader>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            <Field>
              <FieldLabel>Article fournisseur</FieldLabel>
              <Select
                items={[
                  { value: NONE, label: 'Sélectionner' },
                  ...articles.map((article) => ({
                    value: article.id,
                    label:
                      article.supplierName
                      + ' · '
                      + article.supplierReference,
                  })),
                ]}
                onValueChange={setArticleId}
                value={articleId}
              >
                <SelectTrigger aria-label="Article fournisseur">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sélectionner</SelectItem>
                  {articles.map((article) => (
                    <SelectItem key={article.id} value={article.id}>
                      {article.supplierName} · {article.supplierReference}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="supplier-price-amount">Montant HT</FieldLabel>
                <Input
                  id="supplier-price-amount"
                  min="0"
                  onChange={(event) => setAmount(event.target.value)}
                  step="any"
                  type="number"
                  value={amount}
                />
              </Field>

              <Field>
                <FieldLabel>Unité du prix (Kilo, Pièce, etc.)</FieldLabel>
                <Select
                  items={PRICE_BASES.map((value) => ({
                    value,
                    label: getReferenceUnitLabel(null, value),
                  }))}
                  onValueChange={setBasis}
                  value={basis}
                >
                  <SelectTrigger aria-label="Unité du prix">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_BASES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {getReferenceUnitLabel(null, value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="supplier-price-date">
                {isInvoice ? 'Date de facture' : 'Valide à partir du'}
              </FieldLabel>
              <Input
                id="supplier-price-date"
                onChange={(event) => setDate(event.target.value)}
                type="date"
                value={date}
              />
            </Field>

            {!isInvoice && (
              <Field>
                <FieldLabel htmlFor="supplier-price-valid-to">
                  Valide jusqu’au
                </FieldLabel>
                <Input
                  id="supplier-price-valid-to"
                  onChange={(event) => setValidTo(event.target.value)}
                  type="date"
                  value={validTo}
                />
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="supplier-price-source">Provenance</FieldLabel>
              <Input
                id="supplier-price-source"
                maxLength={500}
                onChange={(event) => setSource(event.target.value)}
                placeholder={isInvoice ? 'Ex. Facture n°…' : 'Ex. Accord commercial…'}
                value={source}
              />
            </Field>

            <FieldError>{error}</FieldError>

            <DialogFooter>
              <DialogClose
                disabled={pending}
                ref={cancelRef}
                render={<Button type="button" variant="outline" />}
              >
                Annuler
              </DialogClose>
              <Button disabled={pending} type="submit">
                {pending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { PRICE_BASES, SupplierPriceFormDialog };
