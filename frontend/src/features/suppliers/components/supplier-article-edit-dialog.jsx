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
  DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useUpdateSupplierArticleMutation } from '@/features/suppliers/api/supplier-api';
import { getApiErrorMessage } from '@/features/suppliers/lib/supplier-presentation';
import { cn } from '@/lib/utils';

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

// Habillage propre à l'édition M-003 : conserve Field, Input et Select Base UI.
// Ne crée pas de primitive UI transverse et ne modifie aucun contrat Core.
function SupplierArticleOutlinedField({ children, filled, id, label }) {
  return (
    <Field
      className="group relative gap-0 pt-2"
      data-label-state={filled ? 'filled' : 'empty'}
    >
      <div className={cn(
        'pointer-events-none absolute left-3 z-10 inline-flex max-w-[calc(100%-1.5rem)] items-center',
        'transition-all duration-200 ease-out motion-reduce:transition-none',
        filled
          ? 'top-2 -translate-y-1/2'
          : 'top-8 -translate-y-1/2 group-focus-within:top-2',
      )}
      >
        <FieldLabel
          className={cn(
            'pointer-events-auto max-w-full truncate whitespace-nowrap rounded-sm',
            'transition-all duration-200 ease-out motion-reduce:transition-none',
            filled
              ? 'bg-popover px-1 text-xs text-foreground'
              : 'text-sm text-muted-foreground group-focus-within:bg-popover group-focus-within:px-1 group-focus-within:text-xs group-focus-within:text-foreground',
          )}
          htmlFor={id}
        >
          {label}
        </FieldLabel>
      </div>
      {children}
    </Field>
  );
}

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
    const id = 'article-edit-' + name;
    return (
      <SupplierArticleOutlinedField filled={Boolean(form[name]?.trim())} id={id} label={label}>
        <Input
          className="h-12"
          id={id}
          onChange={(event) => {
            setForm((prev) => ({ ...prev, [name]: event.target.value }));
            if (PACKAGING_FIELDS.has(name)) setRecipeConfirmed(false);
          }}
          value={form[name]}
          {...inputProps}
        />
      </SupplierArticleOutlinedField>
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
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-4xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-5 pt-5">
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
            <DialogDescription className="sr-only">
              Modification de l’Article fournisseur, de son conditionnement et de l’équivalence éventuelle en pièces de recette.
            </DialogDescription>
            <p className="text-sm text-muted-foreground">{article?.supplier?.name}</p>
          </DialogHeader>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={save}>
            <div
              aria-label="Champs de l’Article fournisseur"
              className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4"
              role="region"
              tabIndex={0}
            >
              <section aria-label="Correspondance avec la fiche technique" className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">
                    {referenceUnit === 'UNIT' ? 'Valorisation à la pièce' : 'Unité de recette'}
                  </h3>
                  {referenceUnit === 'UNIT' && (
                    <InfoTooltip
                      label="Précisions sur la correspondance en pièces de recette"
                      content="Ne confirmez pas une estimation de poids ou un nombre de sachets qui ne correspond pas aux pièces de recette."
                    />
                  )}
                </div>
                {referenceUnit === 'UNIT' && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pour utiliser un tarif au carton comme prix par pièce, confirmez le nombre réel de pièces utilisables en recette.
                  </p>
                )}

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-muted/10 px-3 py-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        Unité utilisée en fiche technique
                      </span>
                      <InfoTooltip
                        label="Origine de l’unité utilisée en fiche technique"
                        content="Définie dans le Référentiel Produits : elle ne se modifie pas ici."
                      />
                    </div>
                    <p className="mt-1 text-sm font-semibold" aria-label="Unité utilisée en fiche technique">
                      {article?.productVariant
                        ? getVariantReferenceUnitLabel(null, article.productVariant)
                        : 'Référence Produit non associée'}
                    </p>
                  </div>

                  {canVerifyRecipeUnits ? (
                    <SupplierArticleOutlinedField
                      filled={Boolean(recipeCount.trim())}
                      id="article-recipe-units"
                      label="Nombre de pièces de recette par colis (facultatif)"
                    >
                      <Input
                        className="h-12"
                        id="article-recipe-units"
                        inputMode="numeric"
                        onChange={(event) => {
                          setRecipeCount(event.target.value);
                          setRecipeConfirmed(false);
                        }}
                        value={recipeCount}
                      />
                    </SupplierArticleOutlinedField>
                  ) : referenceUnit === 'UNIT' ? (
                    <p className="self-center text-xs text-muted-foreground">
                      Indiquez d’abord le nombre d’unités et la quantité par unité dans le conditionnement ci-dessous.
                    </p>
                  ) : null}
                </div>
                {canVerifyRecipeUnits && (
                  <label className="mt-3 flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={recipeConfirmed}
                      disabled={!recipeCount.trim()}
                      onChange={(event) => setRecipeConfirmed(event.target.checked)}
                    />
                    <span>Je confirme le nombre réel de pièces utilisables en recette dans ce colis.</span>
                  </label>
                )}
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                {field('supplierDesignation', 'Désignation fournisseur', { maxLength: 300 })}
                {field('brand', 'Marque (facultatif)', { maxLength: 160 })}
              </div>

              <fieldset className="rounded-lg border border-border p-3">
                <legend className="px-1 text-sm font-medium">Conditionnement</legend>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {field('containerType', 'Type de colis', { maxLength: 80 })}
                  {field('supplierLabel', 'Libellé fournisseur', { maxLength: 240 })}
                  {field('unitCount', 'Nb d’unités par colis', { inputMode: 'numeric' })}
                  {field('quantityPerUnit', 'Quantité par unité', { inputMode: 'decimal' })}
                  <SupplierArticleOutlinedField filled={Boolean(form.unit)} id="article-edit-unit" label="Unité de quantité">
                    <Select
                      items={UNITS.map((unit) => ({
                        value: unit, label: getReferenceUnitLabel(null, unit),
                      }))}
                      onValueChange={(unit) => {
                        setForm((prev) => ({ ...prev, unit }));
                        setRecipeConfirmed(false);
                      }}
                      value={form.unit}
                    >
                      <SelectTrigger aria-label="Unité de quantité" className="h-12 pt-3" id="article-edit-unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {getReferenceUnitLabel(null, unit)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SupplierArticleOutlinedField>
                  {field('netWeight', 'Poids net', { inputMode: 'decimal' })}
                  <SupplierArticleOutlinedField filled={Boolean(form.netWeightUnit)} id="article-edit-netWeightUnit" label="Unité du poids net">
                    <Select
                      items={['G', 'KG'].map((unit) => ({ value: unit, label: unit }))}
                      onValueChange={(unit) => setForm((prev) => ({ ...prev, netWeightUnit: unit }))}
                      value={form.netWeightUnit}
                    >
                      <SelectTrigger aria-label="Unité du poids net" className="h-12 pt-3" id="article-edit-netWeightUnit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['G', 'KG'].map((unit) => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SupplierArticleOutlinedField>
                  {field('drainedNetWeight', 'Poids net égoutté', { inputMode: 'decimal' })}
                  <SupplierArticleOutlinedField filled={Boolean(form.drainedNetWeightUnit)} id="article-edit-drainedNetWeightUnit" label="Unité du poids égoutté">
                    <Select
                      items={['G', 'KG'].map((unit) => ({ value: unit, label: unit }))}
                      onValueChange={(unit) => setForm((prev) => ({ ...prev, drainedNetWeightUnit: unit }))}
                      value={form.drainedNetWeightUnit}
                    >
                      <SelectTrigger aria-label="Unité du poids égoutté" className="h-12 pt-3" id="article-edit-drainedNetWeightUnit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['G', 'KG'].map((unit) => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SupplierArticleOutlinedField>
                </div>
              </fieldset>
            </div>

            <div className="shrink-0 border-t border-border bg-popover px-5 py-4">
              <FieldError className="mb-3">{error}</FieldError>
              <DialogFooter className="mt-0">
                <DialogClose
                  disabled={status.isLoading}
                  ref={cancelRef}
                  render={<Button type="button" variant="outline" />}
                >
                  Annuler
                </DialogClose>
                <Button disabled={status.isLoading} type="submit">
                  {status.isLoading ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { SupplierArticleEditDialog };
