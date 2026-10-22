import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
const PACKAGING_FIELDS = [
  'containerType', 'supplierLabel', 'unitCount', 'quantityPerUnit', 'unit',
  'netWeight', 'netWeightUnit', 'drainedNetWeight', 'drainedNetWeightUnit',
];
const PHYSICAL_FIELDS = PACKAGING_FIELDS.filter((field) => field !== 'supplierLabel');
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
  const [recipeCountEdited, setRecipeCountEdited] = useState(false);
  const referenceUnit = article?.productVariant?.referenceUnit;
  const canVerifyRecipeUnits = referenceUnit === 'UNIT'
    && form.unit !== 'UNIT'
    && Number(form.unitCount) > 1 && Boolean(form.quantityPerUnit);
  const [update, status] = useUpdateSupplierArticleMutation();
  const previousCount = article?.recipeUnitEquivalence?.unitsPerPackage ?? null;
  const recipeCountChanged = recipeCount.trim() !== String(
    previousCount ?? article?.packaging?.unitCount ?? '',
  );
  const physicalChanged = PHYSICAL_FIELDS.some((name) => (
    String(article?.packaging?.[name] ?? EMPTY[name])
      !== String(form[name] ?? EMPTY[name])
  ));

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
    const verifiedCount = article.recipeUnitEquivalence?.unitsPerPackage ?? null;
    setRecipeCount(verifiedCount !== null
      ? String(verifiedCount) : String(article.packaging?.unitCount ?? ''));
    // Une preuve existante est conservée par le backend, sans nouvelle attestation.
    setRecipeConfirmed(false);
    setRecipeCountEdited(false);
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
            if (PHYSICAL_FIELDS.includes(name) && (
              String(article?.packaging?.[name] ?? EMPTY[name]) !== event.target.value
            )) setRecipeConfirmed(false);
            if (name === 'unitCount' && !article?.recipeUnitEquivalence) {
              setRecipeCount(event.target.value);
            }
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
    const packagingChanged = PACKAGING_FIELDS.some((name) => (
      String(article.packaging?.[name] ?? EMPTY[name])
        !== String(packaging[name] ?? EMPTY[name])
    ));
    const wantsNewConfirmation = canVerifyRecipeUnits
      && (recipeConfirmed || recipeCountEdited);
    if (wantsNewConfirmation && (!Number.isSafeInteger(Number(recipeCount))
      || !recipeCount.trim() || Number(recipeCount) < 1 || Number(recipeCount) > 1000000)) {
      setError('Indiquez un nombre entier de pièces utilisables.');
      return;
    }
    if (wantsNewConfirmation && !recipeConfirmed) {
      setError('Confirmez le nouveau nombre de pièces avant l’enregistrement.');
      return;
    }
    const changes = {};
    if ((form.supplierDesignation.trim() || null) !== (article.supplierDesignation || null)) {
      changes.supplierDesignation = form.supplierDesignation.trim() || null;
    }
    if ((form.brand.trim() || null) !== (article.brand || null)) {
      changes.brand = form.brand.trim() || null;
    }
    if (packagingChanged) {
      changes.packaging = Object.values(packaging).some((value) => value !== null)
        ? packaging : null;
    }
    if (referenceUnit === 'UNIT') {
      if (recipeConfirmed) {
        // Le backend ne réécrit jamais une preuve identique encore valide.
        changes.recipeUnitsPerPackage = Number(recipeCount);
        changes.confirmRecipeUnits = true;
      } else if (previousCount !== null && recipeCount.trim() === '') {
        changes.recipeUnitsPerPackage = null;
      }
      // Changement physique sans confirmation : le backend invalide l'ancienne preuve.
      // Toute autre édition conserve l'attestation et son verifiedAt.
    }
    if (Object.keys(changes).length === 0) {
      onSaved();
      return;
    }
    try {
      await update({
        workspaceId, articleId: article.id, ...changes,
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
              <div className="grid gap-3 sm:grid-cols-2">
                {field('supplierDesignation', 'Désignation fournisseur', { maxLength: 300 })}
                {field('brand', 'Marque (facultatif)', { maxLength: 160 })}
              </div>

              <fieldset className="rounded-lg border border-border p-3">
                <legend className="px-1 text-sm font-medium">Conditionnement</legend>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {field('containerType', 'Type de colis', { maxLength: 80 })}
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
                <Collapsible
                  className="mt-3 border-t border-border pt-2"
                  defaultOpen={Boolean(article?.packaging?.supplierLabel)}
                >
                  <CollapsibleTrigger
                    className="group flex w-full items-center justify-between gap-2 rounded-md px-1 py-2 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    type="button"
                  >
                    <span>
                      Informations complémentaires
                      {form.supplierLabel.trim() && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (mention renseignée)
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className="size-4 shrink-0 transition-transform duration-200 group-data-[panel-open]:rotate-180 motion-reduce:transition-none"
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-3">
                    {field('supplierLabel', 'Mention du conditionnement fournisseur (facultatif)', {
                      maxLength: 240,
                    })}
                    <div className="flex items-start gap-1 text-xs text-muted-foreground">
                      <span>
                        Mention d’origine telle qu’indiquée sur le catalogue ou la mercuriale.
                      </span>
                      <InfoTooltip
                        label="À quoi sert la mention du conditionnement fournisseur ?"
                        content="Ce texte conserve l’intitulé d’origine du colis (ex. CT 36 × 120 G). Il ne remplace ni la désignation de l’Article ni les quantités structurées utilisées pour calculer les prix."
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </fieldset>

              {referenceUnit === 'UNIT' && (
                <section aria-label="Correspondance avec la fiche technique" className="space-y-2 rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">Pièces utilisables en recette</p>
                  <p className="text-xs text-muted-foreground">
                    Unité de fiche : <strong aria-label="Unité utilisée en fiche technique">
                      {article?.productVariant
                        ? getVariantReferenceUnitLabel(null, article.productVariant)
                        : 'Non associée'}
                    </strong>
                  </p>
                  {canVerifyRecipeUnits ? (
                    <div className="flex flex-wrap items-end gap-3">
                      <SupplierArticleOutlinedField
                        filled={Boolean(recipeCount.trim())}
                        id="article-recipe-units"
                        label="Nombre réel de pièces par colis"
                      >
                        <Input
                          className="h-12 w-44"
                          id="article-recipe-units"
                          inputMode="numeric"
                          onChange={(event) => {
                            setRecipeCount(event.target.value);
                            setRecipeCountEdited(true);
                            setRecipeConfirmed(false);
                          }}
                          value={recipeCount}
                        />
                      </SupplierArticleOutlinedField>
                      {article?.recipeUnitEquivalence
                        && !physicalChanged
                        && !recipeCountChanged
                        && !recipeConfirmed ? (
                        <p className="py-3 text-sm" role="status">
                          {recipeCount} pièces déjà vérifiées
                        </p>
                      ) : recipeConfirmed ? (
                        <p className="py-3 text-sm" role="status">
                          {recipeCount} pièces confirmées
                        </p>
                      ) : (
                        <Button
                          disabled={!Number.isSafeInteger(Number(recipeCount))
                            || !recipeCount.trim() || Number(recipeCount) < 1}
                          onClick={() => { setRecipeConfirmed(true); setError(''); }}
                          type="button"
                          variant="outline"
                        >
                          Confirmer ce nombre
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Précisez d’abord plusieurs éléments et leur quantité physique dans le colis.
                    </p>
                  )}
                  {!article?.recipeUnitEquivalence && !recipeConfirmed && (
                    <p className="text-xs text-muted-foreground">
                      Sans confirmation, un tarif au carton ne peut pas être converti en prix par pièce.
                    </p>
                  )}
                  {article?.recipeUnitEquivalence && physicalChanged && !recipeConfirmed && (
                    <p className="text-xs text-warning" role="status">
                      Ce colis a changé. Son ancienne correspondance sera retirée si vous enregistrez sans nouvelle confirmation.
                    </p>
                  )}
                </section>
              )}
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
