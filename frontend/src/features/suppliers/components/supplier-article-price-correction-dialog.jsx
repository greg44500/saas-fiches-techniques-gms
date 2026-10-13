import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DialogClose, DialogContent, DialogFooter, DialogHeader,
  DialogOverlay, DialogPortal, DialogRoot, DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCorrectSupplierArticleTariffMutation } from '@/features/suppliers/api/supplier-api';
import { getApiErrorMessage } from '@/features/suppliers/lib/supplier-presentation';

const BASES = [
  ['PACKAGE', 'Par conditionnement'],
  ['KG', 'Par kilogramme'],
  ['G', 'Par gramme'],
  ['L', 'Par litre'],
  ['CL', 'Par centilitre'],
  ['ML', 'Par millilitre'],
  ['UNIT', 'Par pièce / unité'],
];

function SupplierArticlePriceCorrectionDialog({
  article, onClose, onSaved, open, workspaceId,
}) {
  const closeRef = useRef(null);
  const [correct, state] = useCorrectSupplierArticleTariffMutation();
  const [amount, setAmount] = useState('');
  const [basis, setBasis] = useState('PACKAGE');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const price = article?.supplierTariff;

  useEffect(() => {
    if (!open) return;
    setAmount(price?.sourceAmount ?? '');
    setBasis(price?.sourceBasis ?? 'PACKAGE');
    setReason('');
    setError('');
  }, [open, price?.id, price?.sourceAmount, price?.sourceBasis]);

  async function save(event) {
    event.preventDefault();
    if (!article || !price || !amount.trim() || reason.trim().length < 8) {
      setError('Indiquez le montant et un motif de correction (8 caractères minimum).');
      return;
    }
    try {
      await correct({
        workspaceId, articleId: article.id, tariffId: price.id,
        sourceAmount: amount.trim().replace(',', '.'),
        sourceBasis: basis, reason: reason.trim(),
      }).unwrap();
      onSaved();
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Correction du tarif impossible.'));
    }
  }

  return (
    <DialogRoot disablePointerDismissal open={open} onOpenChange={(next) => {
      if (!next && !state.isLoading) onClose();
    }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Corriger un tarif fournisseur</DialogTitle>
          </DialogHeader>
          <p className="mt-4 text-sm text-muted-foreground">
            {article?.supplierDesignation} · Réf. {article?.supplierReference}
          </p>
          <p className="mt-2 text-sm">
            Valeur enregistrée : <strong>{price?.sourcePriceLabel ?? '—'}</strong>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Une nouvelle révision remplacera la valeur courante pour la même
            période. L’ancienne valeur restera consultable dans l’historique.
            Pour un changement de prix à une nouvelle date, utilisez une nouvelle liste tarifaire.
          </p>
          <form className="mt-4 space-y-4" onSubmit={save}>
            <Field>
              <FieldLabel htmlFor="tariff-correct-amount">Nouveau prix HT</FieldLabel>
              <Input
                id="tariff-correct-amount"
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
                value={amount}
              />
            </Field>
            <Field>
              <FieldLabel>À quoi correspond le prix ?</FieldLabel>
              <Select
                items={BASES.map(([value, label]) => ({ value, label }))}
                onValueChange={setBasis}
                value={basis}
              >
                <SelectTrigger aria-label="Unité du tarif corrigé"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BASES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="tariff-correct-reason">Motif de la correction</FieldLabel>
              <Textarea
                id="tariff-correct-reason"
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ex. Erreur de saisie du prix figurant sur la mercuriale"
                value={reason}
              />
            </Field>
            <FieldError>{error}</FieldError>
            <DialogFooter>
              <DialogClose ref={closeRef} render={<Button variant="outline" type="button" />}>
                Annuler
              </DialogClose>
              <Button disabled={state.isLoading || !price} type="submit">
                {state.isLoading ? 'Correction…' : 'Enregistrer la correction'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}
export { SupplierArticlePriceCorrectionDialog };
