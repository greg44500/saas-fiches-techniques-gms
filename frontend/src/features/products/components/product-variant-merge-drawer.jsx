import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Search } from 'lucide-react';

import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

function VariantSummary({ metadata, title, variant }) {
  if (!variant) return null;

  return (
    <section className="rounded-lg border border-border p-4">
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

function StepIndicator({ step }) {
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Étapes de fusion">
      {STEP_LABELS.map((label, index) => {
        const number = index + 1;
        const active = number === step;
        const done = number < step;

        return (
          <li
            className={
              'rounded-md border px-3 py-2 text-sm '
              + (active
                ? 'border-primary bg-primary/5 font-medium'
                : 'border-border text-muted-foreground')
            }
            key={label}
          >
            <span className="mr-2">
              {done ? <Check aria-hidden="true" className="inline size-4" /> : number + '.'}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
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
    setPreviewError('');
    setMergeError('');
    setConfirmOpen(false);
  }, [open, sourceVariant?.id]);

  function chooseCandidate(nextCandidate) {
    const sourceApproved = sourceVariant.governanceStatus === 'APPROVED';
    const candidateApproved =
      nextCandidate.governanceStatus === 'APPROVED';
    const defaultRetainedId = sourceApproved
      ? sourceVariant.id
      : candidateApproved
        ? nextCandidate.id
        : null;

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
  const canChooseSourceAsRetained =
    sourceVariant?.governanceStatus === 'APPROVED';
  const canChooseCandidateAsRetained =
    candidate?.governanceStatus === 'APPROVED';
  const hasBlockingConflicts = Boolean(preview?.conflicts?.length);

  return (
    <>
      <Sheet onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
        <SheetContent
          className="w-[min(96vw,72rem)] max-w-none overflow-y-auto"
          side="right"
        >
          <SheetHeader className="border-b border-border pr-14">
            <SheetTitle>
              Fusionner des Références Produit
            </SheetTitle>
            <SheetDescription>
              {product?.name} · la Référence remplacée reste conservée dans
              l’historique et ses dépendances sont réconciliées par le serveur.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 p-4 sm:p-6">
            <StepIndicator step={step} />

            {step === 1 && (
              <section className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Référence de départ</p>
                  <div className="mt-2 rounded-lg border border-border p-3">
                    <p className="font-medium">{sourceVariant.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {getConservationTypeLabel(
                        metadata,
                        sourceVariant.conservationType,
                      )}
                      {' · '}
                      {getVariantReferenceUnitLabel(metadata, sourceVariant)}
                    </p>
                  </div>
                </div>

                <div>
                  <label
                    className="text-sm font-medium"
                    htmlFor="variant-merge-search"
                  >
                    Rechercher la seconde Référence
                  </label>
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
                  <p className="mt-1 text-xs text-muted-foreground">
                    La recherche interroge le serveur et ne dépend pas de la
                    pagination de la liste courante.
                  </p>
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

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">
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
                        {canChooseSourceAsRetained
                          ? 'Conserver cet identifiant.'
                          : 'Cette Référence provisoire ne peut pas être conservée.'}
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
                        {canChooseCandidateAsRetained
                          ? 'Conserver cet identifiant.'
                          : 'Cette Référence provisoire ne peut pas être conservée.'}
                      </span>
                    </span>
                  </label>
                </fieldset>

                <div>
                  <label className="text-sm font-medium" htmlFor="merge-target-name">
                    Nom après fusion
                  </label>
                  <Input
                    id="merge-target-name"
                    maxLength={160}
                    onChange={(event) => {
                      setTargetName(event.target.value);
                      setPreview(null);
                    }}
                    value={targetName}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Les autres caractéristiques métier restent celles de la
                    Référence explicitement conservée.
                  </p>
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

                {preview.differences?.length > 0 ? (
                  <section>
                    <h3 className="text-sm font-semibold">
                      Différences constatées
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {preview.differences.map((difference) => (
                        <li
                          className="rounded-lg border border-border p-3 text-sm"
                          key={difference.field}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">{difference.label}</span>
                            {difference.blocking ? (
                              <StatusBadge tone="destructive">Bloquante</StatusBadge>
                            ) : (
                              <StatusBadge tone="neutral">Arbitrée par la référence conservée</StatusBadge>
                            )}
                          </div>
                          <p className="mt-2 text-muted-foreground">
                            Conservée : {String(difference.retained ?? '—')}
                            {' · '}
                            Remplacée : {String(difference.replaced ?? '—')}
                          </p>
                        </li>
                      ))}
                    </ul>
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
                ) : (
                  <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                    Le serveur a vérifié les dépendances actuelles. Elles seront
                    vérifiées une nouvelle fois au moment de la confirmation.
                  </p>
                )}

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
                    disabled={hasBlockingConflicts}
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
