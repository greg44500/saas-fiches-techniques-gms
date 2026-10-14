import { useEffect, useState } from 'react';

import { DatePicker } from '@/components/forms/date-picker';
import { Button } from '@/components/ui/button';
import {
  DialogContent, DialogFooter, DialogHeader, DialogOverlay,
  DialogPortal, DialogRoot, DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { useCorrectSupplierArticleTariffPeriodMutation } from '@/features/suppliers/api/supplier-api';
import { getApiErrorMessage } from '@/features/suppliers/lib/supplier-presentation';

const civilDate = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';

function SupplierArticlePeriodCorrectionDialog({ article, onClose, onSaved, open, workspaceId }) {
  const [correct, state] = useCorrectSupplierArticleTariffPeriodMutation();
  const price = article?.supplierTariff;
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setValidFrom(civilDate(price?.validFrom));
    setValidTo(civilDate(price?.validTo));
    setReason('');
    setError('');
  }, [open, price?.id, price?.validFrom, price?.validTo]);

  async function save(event) {
    event.preventDefault();
    if (!price || !validFrom || (validTo && validTo < validFrom)) {
      setError('Vérifiez la date de début et la date de fin.');
      return;
    }
    try {
      await correct({
        workspaceId, articleId: article.id, tariffId: price.id,
        validFrom, validTo: validTo || null, reason: reason.trim() || null,
      }).unwrap();
      onSaved();
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Correction de la période impossible.'));
    }
  }

  return (
    <DialogRoot disablePointerDismissal open={open} onOpenChange={(next) => {
      if (!next && !state.isLoading) onClose();
    }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Corriger la période tarifaire</DialogTitle></DialogHeader>
          <p className="mt-3 text-sm text-muted-foreground">
            {article?.supplierDesignation} · Réf. {article?.supplierReference}
          </p>
          <p className="mt-2 text-sm">
            Le montant reste inchangé. L’ancienne période sera conservée dans l’historique.
          </p>
          <form className="mt-4 space-y-4" onSubmit={save}>
            <Field>
              <FieldLabel htmlFor="tariff-valid-from">Début de validité</FieldLabel>
              <DatePicker
                id="tariff-valid-from"
                max={validTo || undefined}
                onChange={setValidFrom}
                value={validFrom}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="tariff-valid-to">Fin de validité (facultative)</FieldLabel>
              <DatePicker
                id="tariff-valid-to"
                min={validFrom || undefined}
                onChange={setValidTo}
                value={validTo}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="tariff-valid-reason">Motif (facultatif)</FieldLabel>
              <Textarea
                id="tariff-valid-reason"
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ex. Date de fin mal renseignée"
                value={reason}
              />
            </Field>
            <FieldError>{error}</FieldError>
            <DialogFooter>
              <Button disabled={state.isLoading} onClick={onClose} variant="outline">
                Annuler
              </Button>
              <Button disabled={state.isLoading || !price} type="submit">
                {state.isLoading ? 'Correction…' : 'Enregistrer la période'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { SupplierArticlePeriodCorrectionDialog };
