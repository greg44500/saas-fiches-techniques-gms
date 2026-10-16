import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import {
  getReferenceUnitLabel,
  getVariantReferenceUnitLabel,
} from '@/features/products/lib/product-presentation';
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
const PACKAGING_FIELDS = new Set([
  'containerType', 'supplierLabel', 'unitCount', 'quantityPerUnit', 'unit',
  'netWeight', 'netWeightUnit', 'drainedNetWeight', 'drainedNetWeightUnit',
]);
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
  const [recipeCount, setRecipeCount] = useState('');
  const [recipeConfirmed, setRecipeConfirmed] = useState(false);
  const referenceUnit = article?.productVariant?.referenceUnit;
  const canVerifyRecipeUnits = referenceUnit === 'UNIT'
    && form.unit !== 'UNIT'
    && Number(form.unitCount) > 1 && Boolean(form.quantityPerUnit);
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
    setRecipeCount(String(article.recipeUnitEquivalence?.unitsPerPackage ?? ''));
    setRecipeConfirmed(Boolean(article.recipeUnitEquivalence?.unitsPerPackage));
    setError('');
  }, [open, article?.id]);

  function field(name, label, inputProps = {}) {
    return (
      <Field>
        <FieldLabel htmlFor={'article-edit-' + name}>{label}</FieldLabel>
        <Input
          id={'article-edit-' + name}
          onChange={(event) => {
            setForm((prev) => ({ ...prev, [name]: event.target.value }));
            if (PACKAGING_FIELDS.has(name)) setRecipeConfirmed(false);
          }}
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
      setError('Le nombre d’unités par colis doit être un entier positif.');
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
    const recipeUnitsPerPackage = canVerifyRecipeUnits && recipeCount.trim()
      ? Number(recipeCount) : null;
    if (recipeUnitsPerPackage !== null
      && (!Number.isSafeInteger(recipeUnitsPerPackage)
        || recipeUnitsPerPackage < 1 || recipeUnitsPerPackage > 1000000)) {
      setError('Le nombre de pièces de recette par colis doit être un entier positif.');
      return;
    }
    if (recipeUnitsPerPackage !== null && !recipeConfirmed) {
      setError('Confirmez que ce nombre correspond bien aux pièces utilisées en recette.');
      return;
    }
    try {
      await update({
        workspaceId, articleId: article.id,
        supplierDesignation: form.supplierDesignation.trim() || null,
        brand: form.brand.trim() || null,
        packaging: Object.values(packaging).some((value) => value !== null)
          ? packaging : null,
        ...(referenceUnit === 'UNIT' ? {
          recipeUnitsPerPackage,
          ...(recipeUnitsPerPackage === null ? {} : { confirmRecipeUnits: true }),
        } : {}),
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
            <div className="flex items-start gap-2">
              <DialogTitle className="min-w-0 break-words">
                Modifier les informations de : {article?.supplierDesignation || 'Article fournisseur'}
                {article?.supplierReference ? ' — réf. ' + article.supplierReference : ''}
              </DialogTitle>
              <InfoTooltip
                className="mt-0.5"
                label="Informations sur la correction du conditionnement"
                content="Vous pouvez corriger le conditionnement actuel. Les anciens tarifs doivent conserver les données de conditionnement utilisées lors de leur enregistrement. Si un ancien tarif ne possède pas ces données, sa conversion ne sera pas supposée."
              />
            </div>
          </DialogHeader>
          <p className="mt-2 text-sm text-muted-foreground">
            {article?.supplier?.name}
          </p>
          <form className="mt-4 space-y-4" onSubmit={save}>
            {field('supplierDesignation', 'Désignation fournisseur', { maxLength: 300 })}
            {field('brand', 'Marque (facultatif)', { maxLength: 160 })}
            <fieldset className="space-y-3 rounded-lg border border-border p-3">
              <legend className="px-1 font-medium">Conditionnement</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('containerType', 'Type de colis', { maxLength: 80 })}
                {field('supplierLabel', 'Libellé fournisseur', { maxLength: 240 })}
                {field('unitCount', 'Nb d’unités par colis', { inputMode: 'numeric' })}
                {field('quantityPerUnit', 'Quantité par unité', { inputMode: 'decimal' })}
                <Field>
                  <FieldLabel>Unité de quantité</FieldLabel>
                  <Select items={UNITS.map((unit) => ({
                    value: unit, label: getReferenceUnitLabel(null, unit),
                  }))}
                    onValueChange={(unit) => {
                      setForm((prev) => ({ ...prev, unit }));
                      setRecipeConfirmed(false);
                    }}
                    value={form.unit}>
                    <SelectTrigger aria-label="Unité de quantité"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {getReferenceUnitLabel(null, unit)}
                        </SelectItem>
                      ))}
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
              <div className="mt-3 border-t border-border pt-3">
                <FieldLabel>Unité utilisée en fiche technique</FieldLabel>
                <p className="mt-1 text-sm font-medium" aria-label="Unité utilisée en fiche technique">
                  {article?.productVariant
                    ? getVariantReferenceUnitLabel(null, article.productVariant)
                    : 'Référence Produit non associée'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Définie dans le Référentiel Produits : elle ne se modifie pas ici.
                </p>
              </div>
              {canVerifyRecipeUnits && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <Field>
                    <FieldLabel htmlFor="article-recipe-units">
                      Nombre de pièces de recette par colis (facultatif)
                    </FieldLabel>
                    <Input
                      id="article-recipe-units"
                      inputMode="numeric"
                      onChange={(event) => {
                        setRecipeCount(event.target.value);
                        setRecipeConfirmed(false);
                      }}
                      value={recipeCount}
                    />
                  </Field>
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={recipeConfirmed}
                      disabled={!recipeCount.trim()}
                      onChange={(event) => setRecipeConfirmed(event.target.checked)}
                    />
                    <span>Je confirme le nombre réel de pièces utilisables en recette dans ce colis.</span>
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Ne confirmez pas une estimation de poids ou un nombre de sachets
                    qui ne correspond pas aux pièces de recette.
                  </p>
                </div>
              )}
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
