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
import { useUpdateSupplierArticleMutation } from '@/features/suppliers/api/supplier-api';
import { getApiErrorMessage } from '@/features/suppliers/lib/supplier-presentation';

const UNITS = ['G', 'KG', 'ML', 'CL', 'L', 'UNIT'];
const EMPTY = {
  supplierDesignation: '', brand: '', containerType: '', supplierLabel: '',
  unitCount: '', quantityPerUnit: '', unit: 'KG',
  netWeight: '', netWeightUnit: 'KG',
  drainedNetWeight: '', drainedNetWeightUnit: 'KG',
};

function SupplierArticleEditDialog({ article, onClose, onSaved, open, workspaceId }) {
  const cancelRef = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [update, status] = useUpdateSupplierArticleMutation();

  useEffect(() => {
    if (!open || !article) return;
    setForm({
      ...EMPTY,
      supplierDesignation: article.supplierDesignation ?? '',
      brand: article.brand ?? '',
      ...Object.fromEntries(
        Object.keys(EMPTY).filter((field) => field !== 'supplierDesignation' && field !== 'brand')
          .map((field) => [field, String(article.packaging?.[field] ?? EMPTY[field])]),
      ),
    });
    setError('');
  }, [open, article?.id]);

  function field(name, label, inputProps = {}) {
    return (
      <Field>
        <FieldLabel htmlFor={'article-edit-' + name}>{label}</FieldLabel>
        <Input
          id={'article-edit-' + name}
          onChange={(event) => setForm((prev) => ({ ...prev, [name]: event.target.value }))}
          value={form[name]}
          {...inputProps}
        />
      </Field>
    );
  }

  function numericValue(text) {
    return text.trim() ? text.trim().replace(',', '.') : null;
  }

  async function save(event) {
    event.preventDefault();
    const unitCount = form.unitCount.trim() ? Number(form.unitCount) : null;
    if (unitCount !== null && (!Number.isInteger(unitCount) || unitCount < 1)) {
      setError('Le nombre d’unités doit être un entier positif.');
      return;
    }
    const packaging = {
      containerType: form.containerType.trim() || null,
      supplierLabel: form.supplierLabel.trim() || null,
      unitCount,
      quantityPerUnit: numericValue(form.quantityPerUnit),
      unit: form.quantityPerUnit.trim() ? form.unit : null,
      netWeight: numericValue(form.netWeight),
      netWeightUnit: form.netWeight.trim() ? form.netWeightUnit : null,
      drainedNetWeight: numericValue(form.drainedNetWeight),
      drainedNetWeightUnit: form.drainedNetWeight.trim() ? form.drainedNetWeightUnit : null,
    };
    try {
      await update({
        workspaceId, articleId: article.id,
        supplierDesignation: form.supplierDesignation.trim() || null,
        brand: form.brand.trim() || null,
        packaging: Object.values(packaging).some((value) => value !== null)
          ? packaging : null,
      }).unwrap();
      onSaved();
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Modification impossible.'));
    }
  }

  return (
    <DialogRoot open={open} disablePointerDismissal onOpenChange={(next) => {
      if (!next && !status.isLoading) onClose();
    }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier les informations de l’Article</DialogTitle>
          </DialogHeader>
          <p className="mt-3 text-sm text-muted-foreground">
            {article?.supplier?.name} · Réf. {article?.supplierReference}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Le conditionnement actuel peut être corrigé. Les anciens tarifs conservent
            leur conditionnement historique.
          </p>
          <form className="mt-4 space-y-4" onSubmit={save}>
            {field('supplierDesignation', 'Désignation fournisseur', { maxLength: 300 })}
            {field('brand', 'Marque (facultatif)', { maxLength: 160 })}
            <fieldset className="space-y-3 rounded-lg border border-border p-3">
              <legend className="px-1 font-medium">Conditionnement</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('containerType', 'Type de colis', { maxLength: 80 })}
                {field('supplierLabel', 'Libellé fournisseur', { maxLength: 240 })}
                {field('unitCount', 'Nombre d’unités', { inputMode: 'numeric' })}
                {field('quantityPerUnit', 'Quantité par unité', { inputMode: 'decimal' })}
                <Field>
                  <FieldLabel>Unité de quantité</FieldLabel>
                  <Select items={UNITS.map((unit) => ({ value: unit, label: unit }))}
                    onValueChange={(unit) => setForm((prev) => ({ ...prev, unit }))}
                    value={form.unit}>
                    <SelectTrigger aria-label="Unité de quantité"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNITS.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                {field('netWeight', 'Poids net', { inputMode: 'decimal' })}
                <Field>
                  <FieldLabel>Unité du poids net</FieldLabel>
                  <Select items={['G', 'KG'].map((unit) => ({ value: unit, label: unit }))}
                    onValueChange={(unit) => setForm((prev) => ({ ...prev, netWeightUnit: unit }))}
                    value={form.netWeightUnit}>
                    <SelectTrigger aria-label="Unité du poids net"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['G', 'KG'].map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                {field('drainedNetWeight', 'Poids net égoutté', { inputMode: 'decimal' })}
                <Field>
                  <FieldLabel>Unité du poids égoutté</FieldLabel>
                  <Select items={['G', 'KG'].map((unit) => ({ value: unit, label: unit }))}
                    onValueChange={(unit) => setForm((prev) => ({
                      ...prev, drainedNetWeightUnit: unit,
                    }))} value={form.drainedNetWeightUnit}>
                    <SelectTrigger aria-label="Unité du poids égoutté"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['G', 'KG'].map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </fieldset>
            <FieldError>{error}</FieldError>
            <DialogFooter>
              <DialogClose ref={cancelRef} render={<Button type="button" variant="outline" />}>
                Annuler
              </DialogClose>
              <Button disabled={status.isLoading} type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { SupplierArticleEditDialog };
