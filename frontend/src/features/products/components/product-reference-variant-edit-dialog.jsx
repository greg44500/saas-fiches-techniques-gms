import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldError } from '@/components/ui/field';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import {
  useGetProductReferenceDimensionsQuery,
  useUpdateProductReferenceVariantMutation,
} from '@/features/products/api/product-reference-api';
import { ProductDimensionContributionDialog } from '@/features/products/components/product-dimension-contribution-dialog';
import {
  ProductVariantFields,
  variantDraftToPayload,
} from '@/features/products/components/product-variant-fields';
import { getApiErrorMessage } from '@/features/products/lib/product-presentation';

function variantToDraft(variant) {
  return {
    name: variant?.name ?? '',
    presentation: '',
    varietyId: variant?.variety?.id ?? '',
    characteristicIdsByKind: Object.fromEntries(
      (variant?.characteristics ?? [])
        .filter(({ kind, id }) => kind && id)
        .map(({ kind, id }) => [kind, id]),
    ),
    processingState: variant?.processingState ?? '',
    conservationType: variant?.conservationType ?? '',
    referenceUnit: variant?.referenceUnit ?? '',
    countUnitLabelSingular:
      variant?.countUnitLabelSingular ?? '',
    countUnitLabelPlural:
      variant?.countUnitLabelPlural ?? '',
    yieldPercent: variant?.yieldPercent ? String(variant.yieldPercent) : '',
    structured: true,
  };
}

function ProductReferenceVariantEditDialog({
  metadata,
  onClose,
  onSaved,
  open,
  productId,
  variant,
}) {
  const cancelRef = useRef(null);
  const [draft, setDraft] = useState(() => variantToDraft(variant));
  const [dimensionDialogOpen, setDimensionDialogOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmedUnitCorrection, setConfirmedUnitCorrection] = useState(false);
  const [updateVariant, updateState] = useUpdateProductReferenceVariantMutation();
  const dimensionsQuery = useGetProductReferenceDimensionsQuery(productId, {
    skip: !open || !productId,
  });
  const dimensions = dimensionsQuery.data ?? {
    varieties: [],
    characteristics: [],
  };

  useEffect(() => {
    if (!open) return;
    setDraft(variantToDraft(variant));
    setDimensionDialogOpen(false);
    setFormError('');
    setConfirmedUnitCorrection(false);
  }, [open, variant]);

  async function submit() {
    if (!draft.name.trim()) {
      setFormError('Renseignez le nom de la référence.');
      return;
    }
    if (!draft.conservationType) {
      setFormError('Sélectionnez une conservation.');
      return;
    }
    if (!draft.referenceUnit) {
      setFormError('Sélectionnez une unité de référence.');
      return;
    }

    const unitChanged = draft.referenceUnit !== variant.referenceUnit;
    if (unitChanged && !confirmedUnitCorrection) {
      setFormError('Confirmez la correction de l’unité de recette avant de continuer.');
      return;
    }

    setFormError('');
    try {
      const saved = await updateVariant({
        productId,
        variantId: variant.id,
        ...variantDraftToPayload(draft, { structured: true }),
        ...(unitChanged && confirmedUnitCorrection
          ? { confirmSupplierArticleRevaluation: true } : {}),
      }).unwrap();
      onSaved(saved);
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'La référence n’a pas pu être corrigée.',
      ));
    }
  }

  return (
    <>
    <DialogRoot
      disablePointerDismissal
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !updateState.isLoading) onClose();
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent
          className="flex max-h-[calc(100dvh-2rem)] max-w-4xl flex-col overflow-hidden p-0"
          initialFocus={cancelRef}
        >
          <DialogHeader className="shrink-0 px-5 pb-1 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <DialogTitle className="min-w-0 break-words">
                  Corriger {variant?.name ?? 'une référence Produit'}
                </DialogTitle>
                <InfoTooltip
                  label="Aide sur la correction d’une référence Produit"
                  content="Vous pouvez corriger les informations de cette référence. Si son unité change, l’application vérifie qu’aucune fiche technique ni aucun prix historique incompatible ne sera modifié. Les tarifs fournisseur et les quantités par colis seront conservés, mais le prix de recette devra être vérifié."
                />
              </div>
              <Button
                disabled={updateState.isLoading}
                onClick={() => setDimensionDialogOpen(true)}
                type="button"
                variant="outline"
              >
                Enrichir le référentiel
              </Button>
            </div>
            <DialogDescription className="sr-only">
              Correction des informations d’une référence Produit.
            </DialogDescription>
          </DialogHeader>

          <div
            aria-label="Champs de la référence Produit"
            className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4"
            role="region"
            tabIndex={0}
          >
            <ProductVariantFields
              dimensions={dimensions}
              disabled={updateState.isLoading}
              metadata={metadata}
              floatingLabels
              onChange={(nextDraft) => {
                if (nextDraft.referenceUnit !== draft.referenceUnit) {
                  setConfirmedUnitCorrection(false);
                }
                setDraft(nextDraft);
              }}
              structured
              value={draft}
            />
            {draft.referenceUnit !== variant.referenceUnit && (
              <div className="space-y-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                <div className="flex items-center gap-1">
                  <p className="font-medium text-foreground">Correction de l’unité de recette</p>
                  <InfoTooltip
                    content="Les recettes et les prix historiques protégés bloqueront cette modification. Si seuls des Articles fournisseur sont liés, leur colisage sera conservé et leur valorisation sera à vérifier après enregistrement."
                    label="Conséquences de la correction de l’unité de recette"
                  />
                </div>
                <p className="text-muted-foreground">
                  Les coûts de recette devront être vérifiés après cette correction.
                </p>
                <label className="flex items-start gap-2">
                  <input
                    checked={confirmedUnitCorrection}
                    className="mt-1"
                    onChange={(event) => setConfirmedUnitCorrection(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Je confirme vouloir corriger l’unité de cette référence.</span>
                </label>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border bg-popover px-5 py-4">
            <FieldError className="mb-3">{formError}</FieldError>
            <DialogFooter className="mt-0">
              <DialogClose
                disabled={updateState.isLoading}
                ref={cancelRef}
                render={<Button type="button" variant="outline" />}
              >
                Annuler
              </DialogClose>
              <Button disabled={updateState.isLoading} onClick={submit} type="button">
                {updateState.isLoading ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <ProductDimensionContributionDialog
      metadata={metadata}
      mode="global"
      onClose={() => setDimensionDialogOpen(false)}
      onResolved={() => dimensionsQuery.refetch?.()}
      open={dimensionDialogOpen}
      product={{ id: productId, name: 'ce Produit' }}
    />
  </>
  );
}

export { ProductReferenceVariantEditDialog, variantToDraft };
