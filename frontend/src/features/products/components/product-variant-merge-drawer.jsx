import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Info, Search } from 'lucide-react';

import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  useListProductReferenceMergeCandidatesQuery,
  useMergeProductReferenceVariantsMutation,
  usePreviewProductReferenceVariantMergeMutation,
} from '@/features/products/api/product-reference-api';
import {
  formatYield,
  getApiErrorMessage,
  getConservationTypeLabel,
  getVariantReferenceUnitLabel,
} from '@/features/products/lib/product-presentation';

const STEP_LABELS = Object.freeze([
  'Sélection',
  'Comparaison',
  'Validation',
]);

const DEPENDENCY_LABELS = Object.freeze({
  supplierArticles: 'Articles fournisseur',
  supplierCatalogLines: 'Lignes de catalogue',
  workspaceFavorites: 'Favoris des espaces de travail',
  indicativePrices: 'Prix indicatifs actifs',
  technicalSheetDrafts: 'Fiches techniques en brouillon',
  technicalSheetLines: 'Lignes de brouillon',
  validatedTechnicalSheets: 'Fiches validées conservées en historique',
  pendingContributions: 'Contributions en attente',
});

function formatDimensionList(values = []) {
  return values.map(({ name }) => name).filter(Boolean).join(', ') || 'Aucune';
}

function VariantSummary({ metadata, title, variant, highlighted = false }) {
  if (!variant) return null;

  return (
    <section className={highlighted
      ? "rounded-lg border border-sky-500/60 bg-sky-500/10 p-4"
      : "rounded-lg border border-border p-4"}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <h3 className="mt-1 font-semibold">{variant.name}</h3>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Variété</dt>
          <dd>{variant.variety?.name ?? 'Aucune'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Caractéristiques</dt>
          <dd>{formatDimensionList(variant.characteristics)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Conservation</dt>
          <dd>{getConservationTypeLabel(metadata, variant.conservationType)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Unité</dt>
          <dd>{getVariantReferenceUnitLabel(metadata, variant)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Rendement</dt>
          <dd>{formatYield(variant.yieldPercent)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">État de préparation</dt>
          <dd>{variant.processingState || 'Non renseigné'}</dd>
        </div>
      </dl>
    </section>
  );
}

function InfoHint({ children, label }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          aria-label={label}
          className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          type="button"
        >
          <Info aria-hidden="true" className="size-4" />
        </TooltipTrigger>
        <TooltipContent>{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function StepIndicator({ step, onNavigate }) {
  return (
    <nav aria-label="Progression de la fusion">
      <ol className="grid grid-cols-3 gap-2">
        {STEP_LABELS.map((label, index) => {
          const number = index + 1;
          const active = number === step;
          const done = number < step;
          return (
            <li key={label}>
              <button
                aria-current={active ? 'step' : undefined}
                className={
                  'flex w-full items-center justify-center gap-2 border-b-[3px] px-1 py-3 text-sm transition-colors '
                  + (active
                    ? 'border-sky-500 bg-sky-500/10 font-semibold text-foreground'
                    : done
                      ? 'border-emerald-500 text-foreground hover:bg-muted'
                      : 'cursor-not-allowed border-border text-muted-foreground')
                }
                disabled={!done}
                onClick={() => onNavigate(number)}
                type="button"
              >
                <span className={
                  'flex size-7 shrink-0 items-center justify-center rounded-full border '
                  + (active
                    ? 'border-sky-500 bg-sky-500 text-white'
                    : done
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                      : 'border-border')
                }>
                  {done
                    ? <Check aria-hidden="true" className="size-4" />
                    : number}
                </span>
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ProductVariantMergeDrawer({
  metadata,
  onClose,
  onMerged,
  open,
  product,
  sourceVariant,
}) {
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [candidate, setCandidate] = useState(null);
  const [retainedVariantId, setRetainedVariantId] = useState(null);
  const [targetName, setTargetName] = useState('');
  const [preview, setPreview] = useState(null);
  const [priceResolutions, setPriceResolutions] = useState({});
  const [previewError, setPreviewError] = useState('');
  const [mergeError, setMergeError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const normalizedSearch = search.trim();
  const candidatesQuery = useListProductReferenceMergeCandidatesQuery(
    {
      productId: product?.id,
      variantId: sourceVariant?.id,
      q: normalizedSearch.length >= 2 ? normalizedSearch : undefined,
      limit: 20,
    },
    {
      skip: !open || !product?.id || !sourceVariant?.id,
    },
  );
  const [previewMerge, previewState] =
    usePreviewProductReferenceVariantMergeMutation();
  const [mergeVariants, mergeState] =
    useMergeProductReferenceVariantsMutation();

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSearch('');
    setCandidate(null);
    setRetainedVariantId(null);
    setTargetName('');
    setPreview(null);
    setPriceResolutions({});
    setPreviewError('');
    setMergeError('');
    setConfirmOpen(false);
  }, [open, sourceVariant?.id]);

  function chooseCandidate(nextCandidate) {
    const sourceCanBeRetained = (
      sourceVariant.governanceStatus === 'APPROVED'
      && sourceVariant.status === 'ACTIVE'
    );
    const candidateCanBeRetained = nextCandidate.canBeRetained === true;
    const defaultRetainedId = sourceCanBeRetained
      ? sourceVariant.id
      : candidateCanBeRetained
        ? nextCandidate.id
        : null;

    setPriceResolutions({});
    setCandidate(nextCandidate);
    setRetainedVariantId(defaultRetainedId);
    setTargetName(
      defaultRetainedId === nextCandidate.id
        ? nextCandidate.name
        : sourceVariant.name,
    );
    setPreview(null);
    setPreviewError('');
    setStep(2);
  }

  const retainedVariant = retainedVariantId === sourceVariant?.id
    ? sourceVariant
    : retainedVariantId === candidate?.id
      ? candidate
      : null;
  const replacedVariant = retainedVariantId === sourceVariant?.id
    ? candidate
    : retainedVariantId === candidate?.id
      ? sourceVariant
      : null;

  function chooseRetained(nextId) {
    const nextVariant = nextId === sourceVariant.id
      ? sourceVariant
      : candidate;

    setPriceResolutions({});
    setRetainedVariantId(nextId);
    setTargetName(nextVariant?.name ?? '');
    setPreview(null);
    setPreviewError('');
  }

  async function buildPreview() {
    if (!retainedVariant || !replacedVariant) return;

    setPreviewError('');
    try {
      const nextPreview = await previewMerge({
        productId: product.id,
        retainedVariantId: retainedVariant.id,
        replacedVariantId: replacedVariant.id,
        targetName: targetName.trim(),
      }).unwrap();

      setPriceResolutions({});
      setPreview(nextPreview);
      setStep(3);
    } catch (error) {
      setPreviewError(getApiErrorMessage(
        error,
        'La fusion ne peut pas être prévisualisée.',
      ));
    }
  }

  async function confirmMerge() {
    if (!preview?.previewFingerprint) return;

    setMergeError('');
    try {
      const result = await mergeVariants({
        productId: product.id,
        retainedVariantId: preview.retained.id,
        replacedVariantId: preview.replaced.id,
        targetName: preview.targetName,
        previewFingerprint: preview.previewFingerprint,
        priceResolutions: Object.entries(priceResolutions).map(([sourcePriceId, decision]) => ({
          sourcePriceId,
          action: decision.action,
          ...(decision.action === 'MANUAL'
            ? { manualAmount: decision.manualAmount } : {}),
        })),
      }).unwrap();

      setConfirmOpen(false);
      onMerged(result);
    } catch (error) {
      setMergeError(getApiErrorMessage(
        error,
        'La fusion n’a pas pu être exécutée.',
      ));
    }
  }

  const candidates = candidatesQuery.data ?? [];
  const canChooseSourceAsRetained = (
    sourceVariant?.governanceStatus === 'APPROVED'
    && sourceVariant?.status === 'ACTIVE'
  );
  const canChooseCandidateAsRetained = (
    candidate?.governanceStatus === 'APPROVED'
    && candidate?.status === 'ACTIVE'
  );
  const hasBlockingConflicts = Boolean(preview?.conflicts?.length);
  const priceArbitrations = preview?.priceArbitrations ?? [];
  const unresolvedPrices = priceArbitrations.some(({ sourcePriceId }) => {
    const decision = priceResolutions[sourcePriceId];
    if (!decision) return true;
    if (decision.action === 'MANUAL') {
      return !/^(?!0+(?:\.0+)?$)\d+(?:\.\d{1,6})?$/.test(decision.manualAmount ?? '');
    }
    return false;
  });

  return (
    <>
      <Sheet onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
        <SheetContent
          className="w-[min(96vw,44rem)] max-w-none overflow-y-auto"
          side="right"
        >
          <SheetHeader className="border-b border-border pr-14">
            <SheetTitle className="flex flex-wrap items-center gap-2 pr-2">
              Fusionner des Références Produit : {product?.name}
              <InfoHint label="Informations sur la fusion">
                La Référence remplacée reste conservée dans l’historique et
                ses dépendances sont réconciliées par le serveur.
              </InfoHint>
            </SheetTitle>
            <SheetDescription className="sr-only">
              Sélectionner, comparer et confirmer la fusion des Références Produit.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 p-4 sm:p-6">
            <StepIndicator step={step} onNavigate={setStep} />

            {step === 1 && (
              <section className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Référence de départ</p>
                  <div className="mt-2 rounded-lg border border-border p-3">
                    <p className="font-medium">{sourceVariant.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Unité : {getVariantReferenceUnitLabel(metadata, sourceVariant)}
                      <span className="mt-1 block">
                        Conservation : {getConservationTypeLabel(
                          metadata,
                          sourceVariant.conservationType,
                        )}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1">
                    <label
                      className="text-sm font-medium"
                      htmlFor="variant-merge-search"
                    >
                      Rechercher la seconde Référence
                    </label>
                    <InfoHint label="Informations sur la recherche">
                      La recherche interroge le serveur et ne dépend pas de la
                      pagination de la liste courante.
                    </InfoHint>
                  </div>
                  <div className="relative mt-2">
                    <Search
                      aria-hidden="true"
                      className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      className="pl-9"
                      id="variant-merge-search"
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Nom, variété ou caractéristique"
                      value={search}
                    />
                  </div>
                </div>

                {candidatesQuery.isError ? (
                  <ErrorState
                    description="Impossible de rechercher les Références admissibles."
                    title="Recherche indisponible"
                  />
                ) : null}

                {candidatesQuery.isFetching ? (
                  <p className="text-sm text-muted-foreground">
                    Recherche en cours…
                  </p>
                ) : null}

                {!candidatesQuery.isFetching
                  && !candidatesQuery.isError
                  && candidates.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Aucune autre Référence admissible.
                  </p>
                ) : null}

                {candidates.length > 0 ? (
                  <ul className="space-y-2">
                    {candidates.map((item) => (
                      <li
                        className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                        key={item.id}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {getConservationTypeLabel(
                              metadata,
                              item.conservationType,
                            )}
                            {' · '}
                            {getVariantReferenceUnitLabel(metadata, item)}
                            {' · '}
                            {item.governanceStatus === 'PROVISIONAL'
                              ? 'À contrôler'
                              : item.status === 'ARCHIVED'
                                ? 'Validée · Archivée'
                                : 'Validée'}
                          </p>
                        </div>
                        <Button
                          onClick={() => chooseCandidate(item)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Comparer
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            )}

            {step === 2 && candidate ? (
              <section className="space-y-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <VariantSummary
                    metadata={metadata}
                    title="Référence de départ"
                    variant={sourceVariant}
                  />
                  <VariantSummary
                    metadata={metadata}
                    title="Référence sélectionnée"
                    variant={candidate}
                  />
                </div>

                <fieldset className="grid gap-2 sm:grid-cols-2">
                  <legend className="mb-2 text-sm font-medium">
                    Référence à conserver
                  </legend>
                  <label className="flex cursor-pointer gap-3 rounded-lg border border-border p-3">
                    <input
                      checked={retainedVariantId === sourceVariant.id}
                      disabled={!canChooseSourceAsRetained}
                      name="retained-variant"
                      onChange={() => chooseRetained(sourceVariant.id)}
                      type="radio"
                    />
                    <span>
                      <span className="block font-medium">
                        {sourceVariant.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {!canChooseSourceAsRetained
                          ? 'Cette Référence provisoire ne peut pas être conservée.'
                          : null}
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer gap-3 rounded-lg border border-border p-3">
                    <input
                      checked={retainedVariantId === candidate.id}
                      disabled={!canChooseCandidateAsRetained}
                      name="retained-variant"
                      onChange={() => chooseRetained(candidate.id)}
                      type="radio"
                    />
                    <span>
                      <span className="block font-medium">{candidate.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {!canChooseCandidateAsRetained
                          ? 'Cette Référence provisoire ne peut pas être conservée.'
                          : null}
                      </span>
                    </span>
                  </label>
                </fieldset>

                <div>
                  <div className="flex items-center gap-1">
                    <label className="text-sm font-medium" htmlFor="merge-target-name">
                      Nom après fusion
                    </label>
                    <InfoHint label="Informations sur le nom après fusion">
                      Les autres caractéristiques métier restent celles de la
                      Référence explicitement conservée.
                    </InfoHint>
                  </div>
                  <Input
                    id="merge-target-name"
                    maxLength={160}
                    onChange={(event) => {
                      setTargetName(event.target.value);
                      setPreview(null);
                      setPriceResolutions({});
                    }}
                    value={targetName}
                  />
                </div>

                {previewError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {previewError}
                  </p>
                ) : null}

                <div className="flex flex-wrap justify-between gap-2">
                  <Button
                    onClick={() => setStep(1)}
                    type="button"
                    variant="outline"
                  >
                    <ArrowLeft aria-hidden="true" className="mr-2 size-4" />
                    Revenir à la sélection
                  </Button>
                  <Button
                    disabled={
                      previewState.isLoading
                      || !retainedVariantId
                      || !targetName.trim()
                    }
                    onClick={buildPreview}
                    type="button"
                  >
                    {previewState.isLoading
                      ? 'Vérification…'
                      : 'Vérifier la fusion'}
                  </Button>
                </div>
              </section>
            ) : null}

            {step === 3 && preview ? (
              <section className="space-y-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <VariantSummary
                    metadata={metadata}
                    highlighted
                    title="Référence conservée"
                    variant={preview.retained}
                  />
                  <VariantSummary
                    metadata={metadata}
                    title="Référence remplacée"
                    variant={preview.replaced}
                  />
                </div>

                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm font-medium">Identité cible</p>
                  <p className="mt-1 text-lg font-semibold">
                    {preview.targetName}
                  </p>
                </div>

                {priceArbitrations.length > 0 ? (
                  <section className="space-y-3">
                    <div className="flex items-center gap-1">
                      <h3 className="text-sm font-semibold">
                        Arbitrer les Prix indicatifs
                      </h3>
                      <InfoHint label="Informations sur l’arbitrage des prix">
                      Chaque périmètre conserve un seul Prix indicatif actif.
                      Choisissez le montant à retenir avant de confirmer la fusion.
                      </InfoHint>
                    </div>
                    {priceArbitrations.map((price) => {
                      const decision = priceResolutions[price.sourcePriceId];
                      const scopeName = price.scope.dossierId
                        ? 'Dossier ' + price.scope.dossierId
                        : price.scope.workspaceId
                          ? 'Espace ' + price.scope.workspaceId
                          : 'Référentiel global';
                      return (
                        <fieldset
                          className="space-y-3 rounded-lg border border-border p-4"
                          key={price.sourcePriceId}
                        >
                          <legend className="px-1 text-sm font-medium">{scopeName}</legend>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="flex cursor-pointer gap-2 rounded-md border p-3">
                              <input
                                checked={decision?.action === 'KEEP_RETAINED'}
                                name={'price-' + price.sourcePriceId}
                                onChange={() => setPriceResolutions((current) => ({
                                  ...current,
                                  [price.sourcePriceId]: { action: 'KEEP_RETAINED' },
                                }))}
                                type="radio"
                              />
                              <span className="text-sm">
                                <span className="block font-medium">Prix conservé</span>
                                {price.retained.amount} {price.retained.currency}
                                {' / '}{price.retained.unit}
                              </span>
                            </label>
                            <label className="flex cursor-pointer gap-2 rounded-md border p-3">
                              <input
                                checked={decision?.action === 'KEEP_REPLACED'}
                                name={'price-' + price.sourcePriceId}
                                onChange={() => setPriceResolutions((current) => ({
                                  ...current,
                                  [price.sourcePriceId]: { action: 'KEEP_REPLACED' },
                                }))}
                                type="radio"
                              />
                              <span className="text-sm">
                                <span className="block font-medium">Prix remplacé</span>
                                {price.replaced.amount} {price.replaced.currency}
                                {' / '}{price.replaced.unit}
                              </span>
                            </label>
                          </div>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              checked={decision?.action === 'MANUAL'}
                              disabled={price.retained.unit !== price.replaced.unit
                                || price.retained.currency !== price.replaced.currency}
                              name={'price-' + price.sourcePriceId}
                              onChange={() => setPriceResolutions((current) => ({
                                ...current,
                                [price.sourcePriceId]: {
                                  action: 'MANUAL',
                                  manualAmount: '',
                                },
                              }))}
                              type="radio"
                            />
                            Définir un montant manuel
                          </label>
                          {decision?.action === 'MANUAL' ? (
                            <div className="max-w-xs">
                              <label
                                className="mb-1 block text-sm font-medium"
                                htmlFor={'manual-price-' + price.sourcePriceId}
                              >
                                Montant ({price.retained.currency} / {price.retained.unit})
                              </label>
                              <Input
                                id={'manual-price-' + price.sourcePriceId}
                                inputMode="decimal"
                                onChange={(event) => setPriceResolutions((current) => ({
                                  ...current,
                                  [price.sourcePriceId]: {
                                    action: 'MANUAL',
                                    manualAmount: event.target.value.replace(',', '.'),
                                  },
                                }))}
                                placeholder="0,00"
                                value={decision.manualAmount ?? ''}
                              />
                            </div>
                          ) : null}
                        </fieldset>
                      );
                    })}
                  </section>
                ) : null}

                <section>
                  <h3 className="text-sm font-semibold">
                    Dépendances concernées
                  </h3>
                  <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                    {Object.entries(preview.dependencies ?? {}).map(
                      ([key, value]) => (
                        <div
                          className="flex justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
                          key={key}
                        >
                          <dt className="text-muted-foreground">
                            {DEPENDENCY_LABELS[key] ?? key}
                          </dt>
                          <dd className="font-medium">{value}</dd>
                        </div>
                      ),
                    )}
                  </dl>
                </section>

                {hasBlockingConflicts ? (
                  <section
                    className="rounded-lg border border-destructive/40 bg-destructive/5 p-4"
                    role="alert"
                  >
                    <h3 className="font-semibold">
                      Fusion impossible dans cet état
                    </h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                      {preview.conflicts.map((conflict, index) => (
                        <li key={conflict.code + ':' + index}>
                          {conflict.message}
                        </li>
                      ))}
                    </ul>
                  </section>
) : null}

                <div className="flex flex-wrap justify-between gap-2">
                  <Button
                    onClick={() => setStep(2)}
                    type="button"
                    variant="outline"
                  >
                    <ArrowLeft aria-hidden="true" className="mr-2 size-4" />
                    Modifier la comparaison
                  </Button>
                  <Button
                    disabled={hasBlockingConflicts || unresolvedPrices}
                    onClick={() => setConfirmOpen(true)}
                    type="button"
                  >
                    Confirmer la fusion
                  </Button>
                </div>
              </section>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {confirmOpen && preview ? (
        <ConfirmationDialog
          confirmLabel="Fusionner"
          confirmVariant="default"
          description={
            'Conserver « ' + preview.targetName + ' » et remplacer « '
            + preview.replaced.name
            + ' ». Cette opération est traçable et ne supprime pas '
            + 'physiquement l’ancienne Référence.'
          }
          errorMessage={mergeError}
          onCancel={() => {
            if (!mergeState.isLoading) {
              setConfirmOpen(false);
              setMergeError('');
            }
          }}
          onConfirm={confirmMerge}
          open
          pending={mergeState.isLoading}
          pendingLabel="Fusion…"
          title="Confirmer la fusion des Références ?"
        />
      ) : null}
    </>
  );
}

export { ProductVariantMergeDrawer };
