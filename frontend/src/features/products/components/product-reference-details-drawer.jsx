import { useEffect, useRef, useState } from 'react';
import {
  Archive,
  CircleCheck,
  Euro,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';

import { ActionIconButton } from '@/components/shared/action-icon-button';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  useDeleteProductReferenceDimensionMutation,
  useGetProductReferenceDetailQuery,
  useGetProductReferenceDimensionsQuery,
  useReviewProductReferenceContributionMutation,
  useReviewProductReferenceDimensionMutation,
  useUpdateProductReferenceCharacteristicStatusMutation,
  useUpdateProductReferenceStatusMutation,
  useUpdateProductReferenceVarietyStatusMutation,
  useUpdateProductReferenceVariantStatusMutation,
} from '@/features/products/api/product-reference-api';
import { ProductDimensionContributionDialog } from '@/features/products/components/product-dimension-contribution-dialog';
import { ProductDimensionEditDialog } from '@/features/products/components/product-dimension-edit-dialog';
import { ProductReferenceEditDialog } from '@/features/products/components/product-reference-edit-dialog';
import {
  ProductReferenceGovernanceReviewPanel,
} from '@/features/products/components/product-reference-governance-review-panel';
import { ProductReferenceVariantEditDialog } from '@/features/products/components/product-reference-variant-edit-dialog';
import { ProductVariantCreateDialog } from '@/features/products/components/product-variant-create-dialog';
import {
  GlobalIndicativePriceDialog,
} from '@/features/suppliers/components/global-indicative-price-dialog';
import {
  useListGlobalIndicativePricesQuery,
} from '@/features/suppliers/api/supplier-api';
import {
  formatPrice,
} from '@/features/suppliers/lib/supplier-presentation';
import {
  formatYield,
  getApiErrorMessage,
  getConservationTypeLabel,
  getProductEventLabel,
  getProductStatusLabel,
  getProductStatusTone,
  getReferenceUnitLabel,
  getVariantLabel,
} from '@/features/products/lib/product-presentation';

function AdminDetailRow({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[160px_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium sm:text-right">{value || 'Non renseigné'}</dd>
    </div>
  );
}


function normalizeDimensionSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('fr-FR');
}

function ProductReferenceDetailsDrawer({
  canManage,
  initialDimensionFilter = 'active',
  initialReferenceFilter = 'all',
  initialTab = 'product',
  metadata,
  onClose,
  open,
  productId,
  reviewContext = null,
}) {
  const { toast } = useToast();
  const retainedRef = useRef(null);
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [editVariant, setEditVariant] = useState(null);
  const [editDimension, setEditDimension] = useState(null);
  const [createVariantOpen, setCreateVariantOpen] = useState(false);
  const [createDimensionOpen, setCreateDimensionOpen] = useState(false);
  const [dimensionSearch, setDimensionSearch] = useState('');
  const [dimensionFilter, setDimensionFilter] = useState(
    initialDimensionFilter,
  );
  const [referenceFilter, setReferenceFilter] = useState(
    initialReferenceFilter,
  );
  const [deleteDimension, setDeleteDimension] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [priceVariant, setPriceVariant] = useState(null);

  const query = useGetProductReferenceDetailQuery(productId, { skip: !productId });
  const dimensionsQuery = useGetProductReferenceDimensionsQuery(productId, {
    skip: !productId,
  });
  const globalPricesQuery = useListGlobalIndicativePricesQuery(
    { productId, status: 'ACTIVE' },
    { skip: !productId },
  );
  const [updateProductStatus, productStatusState] = useUpdateProductReferenceStatusMutation();
  const [updateVariantStatus, variantStatusState] = useUpdateProductReferenceVariantStatusMutation();
  const [updateVarietyStatus, varietyStatusState] =
    useUpdateProductReferenceVarietyStatusMutation();
  const [updateCharacteristicStatus, characteristicStatusState] =
    useUpdateProductReferenceCharacteristicStatusMutation();
  const [reviewContribution, reviewContributionState] =
    useReviewProductReferenceContributionMutation();
  const [reviewDimension, reviewDimensionState] =
    useReviewProductReferenceDimensionMutation();
  const [deleteDimensionMutation, deleteDimensionState] =
    useDeleteProductReferenceDimensionMutation();

  useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab);
    setDimensionFilter(initialDimensionFilter);
    setReferenceFilter(initialReferenceFilter);
    setDimensionSearch('');
    setPriceVariant(null);
  }, [
    initialDimensionFilter,
    initialReferenceFilter,
    initialTab,
    open,
    productId,
  ]);

  if (query.data) retainedRef.current = query.data;
  const detail = query.data ?? retainedRef.current;
  const product = detail?.product;
  const variants = detail?.variants ?? [];
  const events = detail?.events ?? [];
  const globalPriceByVariantId = new Map(
    (globalPricesQuery.data ?? []).map((price) => [
      price.productVariant.id,
      price,
    ]),
  );
  const varieties = dimensionsQuery.data?.varieties ?? [];
  const characteristics = dimensionsQuery.data?.characteristics ?? [];
  const characteristicKindLabels = new Map(
    (metadata?.productCharacteristicKinds ?? []).map(
      ({ value, label }) => [value, label],
    ),
  );
  const dimensionCount = varieties.length + characteristics.length;
  const pendingDimensionCount = [
    ...varieties,
    ...characteristics,
  ].filter((dimension) => (
    dimension.status === 'ACTIVE'
    && dimension.qualityReviewStatus === 'PENDING'
  )).length;
  const activeDimensionCount = [
    ...varieties,
    ...characteristics,
  ].filter((dimension) => dimension.status === 'ACTIVE').length;
  const archivedDimensionCount = dimensionCount - activeDimensionCount;
  const pendingReferenceCount = variants.filter((variant) => (
    variant.status === 'ACTIVE'
    && variant.governanceStatus === 'PROVISIONAL'
  )).length;
  const visibleVariants = referenceFilter === 'pending'
    ? variants.filter((variant) => (
      variant.status === 'ACTIVE'
      && variant.governanceStatus === 'PROVISIONAL'
    ))
    : variants;

  const matchesDimensionFilter = (dimension) => {
    if (dimensionFilter === 'pending') {
      return (
        dimension.status === 'ACTIVE'
        && dimension.qualityReviewStatus === 'PENDING'
      );
    }
    if (dimensionFilter === 'active') {
      return dimension.status === 'ACTIVE';
    }
    if (dimensionFilter === 'archived') {
      return dimension.status === 'ARCHIVED';
    }
    return true;
  };

  const visibleVarieties = varieties.filter(matchesDimensionFilter);
  const visibleCharacteristics = characteristics.filter(matchesDimensionFilter);
  const visibleDimensionCount =
    visibleVarieties.length + visibleCharacteristics.length;
  const normalizedDimensionSearch = normalizeDimensionSearch(dimensionSearch);
  const dimensionEntries = [
    ...visibleVarieties.map((variety) => ({
      key: 'VARIETY:' + variety.id,
      name: variety.name,
      typeLabel: 'Variété',
      searchText: normalizeDimensionSearch([
        variety.name,
        ...(variety.aliases ?? []),
        'Variété',
      ].join(' ')),
    })),
    ...visibleCharacteristics.map((characteristic) => ({
      key: 'CHARACTERISTIC:' + characteristic.id,
      name: characteristic.name,
      typeLabel:
        characteristicKindLabels.get(characteristic.kind)
        ?? characteristic.kind,
      searchText: normalizeDimensionSearch([
        characteristic.name,
        ...(characteristic.aliases ?? []),
        characteristicKindLabels.get(characteristic.kind)
          ?? characteristic.kind,
      ].join(' ')),
    })),
  ];
  const matchingDimensionEntries = normalizedDimensionSearch
    ? dimensionEntries.filter(({ searchText }) => (
      searchText.includes(normalizedDimensionSearch)
    ))
    : dimensionEntries;
  const matchingDimensionKeys = new Set(
    matchingDimensionEntries.map(({ key }) => key),
  );
  const filteredVarieties = normalizedDimensionSearch
    ? visibleVarieties.filter((variety) => (
      matchingDimensionKeys.has('VARIETY:' + variety.id)
    ))
    : visibleVarieties;
  const filteredCharacteristics = normalizedDimensionSearch
    ? visibleCharacteristics.filter((characteristic) => (
      matchingDimensionKeys.has('CHARACTERISTIC:' + characteristic.id)
    ))
    : visibleCharacteristics;
  const dimensionSuggestions = normalizedDimensionSearch
    ? matchingDimensionEntries.slice(0, 6)
    : [];
  const dimensionResultCount =
    filteredVarieties.length + filteredCharacteristics.length;
  const pending = (
    productStatusState.isLoading
    || variantStatusState.isLoading
    || varietyStatusState.isLoading
    || characteristicStatusState.isLoading
    || reviewContributionState.isLoading
    || reviewDimensionState.isLoading
    || deleteDimensionState.isLoading
  );
  if (!detail && !open) return null;

  async function run(action, successMessage) {
    try {
      await action();
      toast({ title: successMessage, variant: 'success' });
    } catch (error) {
      toast({
        title: 'Action impossible',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  function changeProductStatus(status) {
    run(
      () => updateProductStatus({ productId: product.id, status }).unwrap(),
      status === 'ARCHIVED' ? 'Produit archivé' : 'Produit réactivé',
    );
  }

  function changeVariantStatus(variant, status) {
    run(
      () => updateVariantStatus({
        productId: product.id,
        variantId: variant.id,
        status,
      }).unwrap(),
      status === 'ARCHIVED' ? 'Référence archivée' : 'Référence réactivée',
    );
  }

  function changeDimensionStatus(type, dimension, status) {
    const action = type === 'VARIETY'
      ? () => updateVarietyStatus({
        productId: product.id,
        varietyId: dimension.id,
        status,
      }).unwrap()
      : () => updateCharacteristicStatus({
        productId: product.id,
        characteristicId: dimension.id,
        status,
      }).unwrap();

    run(
      action,
      status === 'ARCHIVED'
        ? 'Dimension archivée'
        : 'Dimension réactivée',
    );
  }

  async function markDimensionReviewed(type, dimension) {
    try {
      await reviewDimension({
        productId: product.id,
        dimensionType: type,
        dimensionId: dimension.id,
      }).unwrap();
      toast({
        title: 'Dimension validée',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Revue impossible',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  async function decideContribution(
    decision,
    targetReferenceId = null,
  ) {
    if (!reviewContext?.sourceId) return;

    try {
      await reviewContribution({
        contributionId: reviewContext.sourceId,
        decision,
        targetReferenceId,
      }).unwrap();

      const subject = reviewContext.dataType === 'PRODUCT'
        ? 'Produit'
        : reviewContext.dataType === 'REFERENCE'
          ? 'Référence'
          : 'Dimension';
      const actionLabel = decision === 'MERGE'
        ? (subject === 'Produit' ? 'fusionné' : 'fusionnée')
        : decision === 'REJECT'
          ? (subject === 'Produit' ? 'refusé' : 'refusée')
          : (subject === 'Produit' ? 'validé' : 'validée');

      toast({
        title: subject + ' ' + actionLabel,
        description: reviewContext.value,
        variant: 'success',
      });

      if (
        reviewContext.dataType === 'PRODUCT'
        && decision !== 'APPROVE'
      ) {
        onClose();
      }
    } catch (error) {
      toast({
        title: 'Décision impossible',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  function approveReviewTarget() {
    if (reviewContext?.type === 'DIMENSION_REVIEW') {
      const dimension = reviewContext.dimensionType === 'VARIETY'
        ? varieties.find(({ id }) => id === reviewContext.targetId)
        : characteristics.find(({ id }) => id === reviewContext.targetId);

      if (dimension) {
        markDimensionReviewed(reviewContext.dimensionType, dimension);
      }
      return;
    }

    decideContribution('APPROVE');
  }

  function rejectReviewTarget() {
    if (reviewContext?.type === 'DIMENSION_REVIEW') return;
    decideContribution('REJECT');
  }

  function mergeReviewTarget(candidate) {
    if (reviewContext?.type === 'DIMENSION_REVIEW') return;
    decideContribution('MERGE', candidate.id);
  }

  function requestDimensionDeletion(type, dimension) {
    setDeleteError('');
    setDeleteDimension({ type, dimension });
  }

  async function confirmDimensionDeletion() {
    if (!deleteDimension) return;

    try {
      await deleteDimensionMutation({
        productId: product.id,
        dimensionType: deleteDimension.type,
        dimensionId: deleteDimension.dimension.id,
      }).unwrap();
      setDeleteDimension(null);
      setDeleteError('');
      toast({
        title: 'Valeur supprimée du référentiel',
        variant: 'success',
      });
    } catch (error) {
      setDeleteError(getApiErrorMessage(
        error,
        'Cette valeur ne peut pas être supprimée.',
      ));
    }
  }

  return (
    <>
      <EntityDetailsDrawer
        description="Administration métier du Produit partagé et de son historique."
        onClose={onClose}
        open={open}
        title={product?.name ?? 'Produit'}
      >
        {query.isLoading && !detail ? (
          <p className="text-sm text-muted-foreground">Chargement du Produit…</p>
        ) : query.isError && !detail ? (
          <ErrorState
            className="p-0"
            description="Le Produit n’a pas pu être chargé."
            onRetry={query.refetch}
            title="Produit indisponible"
          />
        ) : product ? (
          <Tabs onValueChange={setActiveTab} value={activeTab}>
            <TabsList aria-label="Administration du Produit" variant="section">
              <TabsTrigger value="product" variant="section">Produit</TabsTrigger>
              <TabsTrigger value="dimensions" variant="section">Dimensions ({dimensionCount})</TabsTrigger>
              <TabsTrigger value="variants" variant="section">Références ({variants.length})</TabsTrigger>
              <TabsTrigger value="history" variant="section">Historique</TabsTrigger>
            </TabsList>

            <TabsContent value="product" variant="section">
              <div className="space-y-4">
                {canManage && (
                  <div className="flex flex-wrap justify-end gap-2">
                    <ActionIconButton
                      Icon={Pencil}
                      label="Corriger le Produit"
                      tooltipLabel="Corriger"
                      onClick={() => setEditProductOpen(true)}
                      variant="outline"
                    />
                    {product.status === 'ACTIVE' && (
                      <ActionIconButton
                        disabled={pending}
                        Icon={Archive}
                        label="Archiver le Produit"
                        onClick={() => changeProductStatus('ARCHIVED')}
                        tooltipLabel="Archiver"
                        variant="outline"
                      />
                    )}
                    {product.status === 'ARCHIVED' && (
                      <ActionIconButton
                        disabled={pending}
                        Icon={RotateCcw}
                        label="Réactiver le Produit"
                        onClick={() => changeProductStatus('ACTIVE')}
                        tooltipLabel="Réactiver"
                        variant="outline"
                      />
                    )}
                  </div>
                )}

                <div className="rounded-lg border border-border px-4">
                  <dl>
                    <AdminDetailRow label="Nom" value={product.name} />
                    <AdminDetailRow label="Catégorie" value={product.category?.name} />
                    <div className="grid gap-1 border-b border-border py-3 sm:grid-cols-[160px_1fr]">
                      <dt className="text-sm text-muted-foreground">
                        Contrôle
                      </dt>
                      <dd className="sm:text-right">
                        <StatusBadge
                          tone={
                            product.governanceStatus === 'PROVISIONAL'
                              ? 'warning'
                              : 'success'
                          }
                        >
                          {product.governanceStatus === 'PROVISIONAL'
                            ? 'À contrôler'
                            : 'Validé'}
                        </StatusBadge>
                      </dd>
                    </div>
                    <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr]">
                      <dt className="text-sm text-muted-foreground">Statut</dt>
                      <dd className="sm:text-right">
                        <StatusBadge tone={getProductStatusTone(product.status)}>
                          {getProductStatusLabel(metadata, product.status)}
                        </StatusBadge>
                      </dd>
                    </div>
                  </dl>
                </div>

                {canManage
                  && reviewContext?.dataType === 'PRODUCT'
                  && product.governanceStatus === 'PROVISIONAL' && (
                  <ProductReferenceGovernanceReviewPanel
                    context={reviewContext}
                    onApprove={approveReviewTarget}
                    onEdit={() => setEditProductOpen(true)}
                    onMerge={mergeReviewTarget}
                    onReject={rejectReviewTarget}
                    pending={pending}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="dimensions" variant="section">
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  {dimensionCount > 0 && (
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="relative">
                        <Search
                          aria-hidden="true"
                          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                          aria-label="Rechercher une caractéristique"
                          className="pl-9 pr-10"
                          onChange={(event) => setDimensionSearch(event.target.value)}
                          placeholder="Rechercher une caractéristique"
                          value={dimensionSearch}
                        />
                        {dimensionSearch && (
                          <button
                            aria-label="Effacer la recherche"
                            className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            onClick={() => setDimensionSearch('')}
                            type="button"
                          >
                            <X aria-hidden="true" className="size-4" />
                          </button>
                        )}
                      </div>

                      {normalizedDimensionSearch && dimensionSuggestions.length > 0 && (
                        <ul
                          aria-label="Suggestions de dimensions"
                          className="overflow-hidden rounded-lg border border-border bg-background"
                        >
                          {dimensionSuggestions.map((suggestion) => (
                            <li key={suggestion.key}>
                              <button
                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                                onClick={() => setDimensionSearch(suggestion.name)}
                                type="button"
                              >
                                <span className="font-medium">
                                  {suggestion.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {suggestion.typeLabel}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {canManage && product.status === 'ACTIVE' && (
                    <Button
                      className="shrink-0"
                      onClick={() => setCreateDimensionOpen(true)}
                      type="button"
                      variant="outline"
                    >
                      <Plus aria-hidden="true" className="size-4" />
                      Enrichir le référentiel
                    </Button>
                  )}
                </div>

                <div
                  aria-label="Filtrer les Dimensions"
                  className="flex flex-wrap gap-2"
                  role="group"
                >
                  {[
                    {
                      value: 'pending',
                      label: 'À contrôler',
                      count: pendingDimensionCount,
                    },
                    {
                      value: 'active',
                      label: 'Actives',
                      count: activeDimensionCount,
                    },
                    {
                      value: 'archived',
                      label: 'Archivées',
                      count: archivedDimensionCount,
                    },
                    {
                      value: 'all',
                      label: 'Toutes',
                      count: dimensionCount,
                    },
                  ].map((filter) => (
                    <Button
                      aria-pressed={dimensionFilter === filter.value}
                      key={filter.value}
                      onClick={() => {
                        setDimensionFilter(filter.value);
                        setDimensionSearch('');
                      }}
                      size="sm"
                      type="button"
                      variant={
                        dimensionFilter === filter.value
                          ? 'default'
                          : 'outline'
                      }
                    >
                      {filter.label} ({filter.count})
                    </Button>
                  ))}
                </div>

                {normalizedDimensionSearch && (
                  <p className="text-xs text-muted-foreground">
                    {dimensionResultCount}{' '}
                    {dimensionResultCount > 1 ? 'résultats' : 'résultat'}
                    {' '}sur {visibleDimensionCount} dimensions
                  </p>
                )}

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">
                    Variétés ({visibleVarieties.length})
                  </h3>
                  {filteredVarieties.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {normalizedDimensionSearch
                        ? 'Aucune variété ne correspond à cette recherche.'
                        : dimensionFilter === 'pending'
                          ? 'Aucune variété à contrôler.'
                          : 'Aucune variété dans cette vue.'}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {filteredVarieties.map((variety) => (
                        <li
                          className={
                            'rounded-lg border px-3 py-2 '
                            + (
                              reviewContext?.dataType === 'DIMENSION'
                              && reviewContext.targetId === variety.id
                                ? 'border-warning/50 bg-warning/5'
                                : 'border-border'
                            )
                          }
                          key={variety.id}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="truncate font-medium">
                                {variety.name}
                              </p>
                              <StatusBadge
                                className="shrink-0 py-0.5"
                                tone={getProductStatusTone(variety.status)}
                              >
                                {getProductStatusLabel(metadata, variety.status)}
                              </StatusBadge>
                              {variety.qualityReviewStatus === 'PENDING'
                                && variety.status === 'ACTIVE' && (
                                <StatusBadge
                                  className="shrink-0 py-0.5"
                                  tone="warning"
                                >
                                  À contrôler
                                </StatusBadge>
                              )}
                              {variety.qualityReviewStatus === 'REVIEWED'
                                && variety.status === 'ACTIVE' && (
                                <StatusBadge
                                  className="shrink-0 py-0.5"
                                  tone="success"
                                >
                                  Validée
                                </StatusBadge>
                              )}
                            </div>
                            {canManage
                              && !(
                                reviewContext?.dataType === 'DIMENSION'
                                && reviewContext.targetId === variety.id
                              ) && (
                              <div className="flex shrink-0 items-center gap-2">
                                {variety.qualityReviewStatus === 'PENDING'
                                  && variety.status === 'ACTIVE' && (
                                  <ActionIconButton
                                    disabled={pending}
                                    Icon={CircleCheck}
                                    label={
                                      'Marquer la variété '
                                      + variety.name
                                      + ' comme vérifiée'
                                    }
                                    onClick={() => markDimensionReviewed(
                                      'VARIETY',
                                      variety,
                                    )}
                                    tooltipLabel="Marquer comme vérifiée"
                                    variant="outline"
                                  />
                                )}
                                <ActionIconButton
                                  disabled={pending}
                                  Icon={Pencil}
                                  label={'Corriger la variété ' + variety.name}
                                  onClick={() => setEditDimension({
                                    type: 'VARIETY',
                                    dimension: variety,
                                  })}
                                  tooltipLabel="Corriger"
                                  variant="outline"
                                />
                                {variety.status === 'ACTIVE' && (
                                  <ActionIconButton
                                    disabled={pending}
                                    Icon={Archive}
                                    label={'Archiver la variété ' + variety.name}
                                    onClick={() => changeDimensionStatus(
                                      'VARIETY',
                                      variety,
                                      'ARCHIVED',
                                    )}
                                    tooltipLabel="Archiver"
                                    variant="outline"
                                  />
                                )}
                                {variety.status === 'ARCHIVED'
                                  && product.status === 'ACTIVE' && (
                                  <ActionIconButton
                                    disabled={pending}
                                    Icon={RotateCcw}
                                    label={'Réactiver la variété ' + variety.name}
                                    onClick={() => changeDimensionStatus(
                                      'VARIETY',
                                      variety,
                                      'ACTIVE',
                                    )}
                                    tooltipLabel="Réactiver"
                                    variant="outline"
                                  />
                                )}
                                <ActionIconButton
                                  disabled={pending}
                                  Icon={Trash2}
                                  label={'Supprimer la variété ' + variety.name}
                                  onClick={() => requestDimensionDeletion(
                                    'VARIETY',
                                    variety,
                                  )}
                                  tooltipLabel="Supprimer"
                                  variant="outline"
                                />
                              </div>
                            )}
                          </div>

                          {canManage
                            && reviewContext?.dataType === 'DIMENSION'
                            && reviewContext.targetId === variety.id
                            && variety.qualityReviewStatus === 'PENDING' && (
                            <div className="mt-3 border-t border-border pt-3">
                              <ProductReferenceGovernanceReviewPanel
                                context={reviewContext}
                                onApprove={approveReviewTarget}
                                onEdit={() => setEditDimension({
                                  type: 'VARIETY',
                                  dimension: variety,
                                })}
                                onMerge={
                                  reviewContext.type === 'CONTRIBUTION'
                                    ? mergeReviewTarget
                                    : undefined
                                }
                                onReject={
                                  reviewContext.type === 'CONTRIBUTION'
                                    ? rejectReviewTarget
                                    : undefined
                                }
                                pending={pending}
                              />
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">
                    Caractéristiques ({visibleCharacteristics.length})
                  </h3>
                  {filteredCharacteristics.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {normalizedDimensionSearch
                        ? 'Aucune caractéristique ne correspond à cette recherche.'
                        : dimensionFilter === 'pending'
                          ? 'Aucune caractéristique à contrôler.'
                          : 'Aucune caractéristique dans cette vue.'}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {filteredCharacteristics.map((characteristic) => (
                        <li
                          className={
                            'rounded-lg border px-3 py-2 '
                            + (
                              reviewContext?.dataType === 'DIMENSION'
                              && reviewContext.targetId === characteristic.id
                                ? 'border-warning/50 bg-warning/5'
                                : 'border-border'
                            )
                          }
                          key={characteristic.id}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="truncate font-medium">
                                {characteristic.name}
                              </p>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {characteristicKindLabels.get(characteristic.kind)
                                  ?? characteristic.kind}
                              </span>
                              <StatusBadge
                                className="shrink-0 py-0.5"
                                tone={getProductStatusTone(characteristic.status)}
                              >
                                {getProductStatusLabel(
                                  metadata,
                                  characteristic.status,
                                )}
                              </StatusBadge>
                              {characteristic.qualityReviewStatus === 'PENDING'
                                && characteristic.status === 'ACTIVE' && (
                                <StatusBadge
                                  className="shrink-0 py-0.5"
                                  tone="warning"
                                >
                                  À contrôler
                                </StatusBadge>
                              )}
                              {characteristic.qualityReviewStatus === 'REVIEWED'
                                && characteristic.status === 'ACTIVE' && (
                                <StatusBadge
                                  className="shrink-0 py-0.5"
                                  tone="success"
                                >
                                  Validée
                                </StatusBadge>
                              )}
                            </div>
                            {canManage
                              && !(
                                reviewContext?.dataType === 'DIMENSION'
                                && reviewContext.targetId === characteristic.id
                              ) && (
                              <div className="flex shrink-0 items-center gap-2">
                                {characteristic.qualityReviewStatus === 'PENDING'
                                  && characteristic.status === 'ACTIVE' && (
                                  <ActionIconButton
                                    disabled={pending}
                                    Icon={CircleCheck}
                                    label={
                                      'Marquer la caractéristique '
                                      + characteristic.name
                                      + ' comme vérifiée'
                                    }
                                    onClick={() => markDimensionReviewed(
                                      'CHARACTERISTIC',
                                      characteristic,
                                    )}
                                    tooltipLabel="Marquer comme vérifiée"
                                    variant="outline"
                                  />
                                )}
                                <ActionIconButton
                                  disabled={pending}
                                  Icon={Pencil}
                                  label={
                                    'Corriger la caractéristique '
                                    + characteristic.name
                                  }
                                  onClick={() => setEditDimension({
                                    type: 'CHARACTERISTIC',
                                    dimension: characteristic,
                                  })}
                                  tooltipLabel="Corriger"
                                  variant="outline"
                                />
                                {characteristic.status === 'ACTIVE' && (
                                  <ActionIconButton
                                    disabled={pending}
                                    Icon={Archive}
                                    label={
                                      'Archiver la caractéristique '
                                      + characteristic.name
                                    }
                                    onClick={() => changeDimensionStatus(
                                      'CHARACTERISTIC',
                                      characteristic,
                                      'ARCHIVED',
                                    )}
                                    tooltipLabel="Archiver"
                                    variant="outline"
                                  />
                                )}
                                {characteristic.status === 'ARCHIVED'
                                  && product.status === 'ACTIVE' && (
                                  <ActionIconButton
                                    disabled={pending}
                                    Icon={RotateCcw}
                                    label={
                                      'Réactiver la caractéristique '
                                      + characteristic.name
                                    }
                                    onClick={() => changeDimensionStatus(
                                      'CHARACTERISTIC',
                                      characteristic,
                                      'ACTIVE',
                                    )}
                                    tooltipLabel="Réactiver"
                                    variant="outline"
                                  />
                                )}
                                <ActionIconButton
                                  disabled={pending}
                                  Icon={Trash2}
                                  label={
                                    'Supprimer la caractéristique '
                                    + characteristic.name
                                  }
                                  onClick={() => requestDimensionDeletion(
                                    'CHARACTERISTIC',
                                    characteristic,
                                  )}
                                  tooltipLabel="Supprimer"
                                  variant="outline"
                                />
                              </div>
                            )}
                          </div>

                          {canManage
                            && reviewContext?.dataType === 'DIMENSION'
                            && reviewContext.targetId === characteristic.id
                            && characteristic.qualityReviewStatus === 'PENDING' && (
                            <div className="mt-3 border-t border-border pt-3">
                              <ProductReferenceGovernanceReviewPanel
                                context={reviewContext}
                                onApprove={approveReviewTarget}
                                onEdit={() => setEditDimension({
                                  type: 'CHARACTERISTIC',
                                  dimension: characteristic,
                                })}
                                onMerge={
                                  reviewContext.type === 'CONTRIBUTION'
                                    ? mergeReviewTarget
                                    : undefined
                                }
                                onReject={
                                  reviewContext.type === 'CONTRIBUTION'
                                    ? rejectReviewTarget
                                    : undefined
                                }
                                pending={pending}
                              />
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </TabsContent>

            <TabsContent value="variants" variant="section">
              <div className="space-y-4">
                {canManage && product.status === 'ACTIVE' && (
                  <div className="flex justify-end">
                    <Button
                      onClick={() => setCreateVariantOpen(true)}
                      type="button"
                      variant="outline"
                    >
                      <Plus aria-hidden="true" className="size-4" />
                      Créer une référence
                    </Button>
                  </div>
                )}

                <div
                  aria-label="Filtrer les Références"
                  className="flex flex-wrap items-center gap-2"
                  role="group"
                >
                  <Button
                    aria-pressed={referenceFilter === 'pending'}
                    onClick={() => setReferenceFilter('pending')}
                    size="sm"
                    type="button"
                    variant={
                      referenceFilter === 'pending'
                        ? 'default'
                        : 'outline'
                    }
                  >
                    À contrôler ({pendingReferenceCount})
                  </Button>
                  <Button
                    aria-pressed={referenceFilter === 'all'}
                    onClick={() => setReferenceFilter('all')}
                    size="sm"
                    type="button"
                    variant={
                      referenceFilter === 'all'
                        ? 'default'
                        : 'outline'
                    }
                  >
                    Toutes ({variants.length})
                  </Button>
                </div>

                {visibleVariants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {referenceFilter === 'pending'
                      ? 'Aucune Référence à contrôler.'
                      : 'Aucune Référence Produit.'}
                  </p>
                ) : (
                <ul className="space-y-3">
                  {visibleVariants.map((variant) => {
                    const globalPrice =
                      globalPriceByVariantId.get(variant.id) ?? null;

                    return (
                    <li
                      className={
                        'rounded-lg border p-4 '
                        + (
                          reviewContext?.dataType === 'REFERENCE'
                          && reviewContext.targetId === variant.id
                            ? 'border-warning/50 bg-warning/5'
                            : 'border-border'
                        )
                      }
                      key={variant.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{getVariantLabel(variant)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Conservation : {getConservationTypeLabel(
                              metadata,
                              variant.conservationType,
                            )}
                            {' · '}Unité : {getReferenceUnitLabel(metadata, variant.referenceUnit)}
                            {variant.yieldPercent
                              ? ' · Rendement : ' + formatYield(variant.yieldPercent)
                              : ''}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Prix repère global : {
                              globalPrice
                                ? formatPrice(
                                  globalPrice,
                                  { hideDefaultCurrency: true },
                                )
                                : 'Non renseigné'
                            }
                          </p>
                          {globalPrice?.updatedAt && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Mis à jour le {
                                new Date(globalPrice.updatedAt)
                                  .toLocaleDateString('fr-FR')
                              }
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={getProductStatusTone(variant.status)}>
                            {getProductStatusLabel(metadata, variant.status)}
                          </StatusBadge>
                          <StatusBadge
                            tone={
                              variant.governanceStatus === 'PROVISIONAL'
                                ? 'warning'
                                : 'success'
                            }
                          >
                            {variant.governanceStatus === 'PROVISIONAL'
                              ? 'À contrôler'
                              : 'Validée'}
                          </StatusBadge>
                        </div>
                      </div>

                      {canManage
                        && reviewContext?.dataType === 'REFERENCE'
                        && reviewContext.targetId === variant.id
                        && variant.governanceStatus === 'PROVISIONAL' && (
                        <div className="mt-4 border-t border-border pt-4">
                          <ProductReferenceGovernanceReviewPanel
                            context={reviewContext}
                            onApprove={approveReviewTarget}
                            onEdit={() => setEditVariant(variant)}
                            onMerge={mergeReviewTarget}
                            onReject={rejectReviewTarget}
                            pending={pending}
                          />
                        </div>
                      )}

                      {canManage && (
                        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                          {variant.status === 'ACTIVE' && (
                            <ActionIconButton
                              disabled={pending}
                              Icon={Euro}
                              label={
                                (globalPrice ? 'Modifier' : 'Ajouter')
                                + ' le Prix repère global de '
                                + getVariantLabel(variant)
                              }
                              onClick={() => setPriceVariant(variant)}
                              tooltipLabel={
                                globalPrice
                                  ? 'Modifier le Prix repère'
                                  : 'Ajouter un Prix repère'
                              }
                              variant="outline"
                            />
                          )}
                          <ActionIconButton
                            disabled={pending}
                            Icon={Pencil}
                            label={'Corriger la référence ' + getVariantLabel(variant)}
                            onClick={() => setEditVariant(variant)}
                            tooltipLabel="Corriger"
                            variant="outline"
                          />
                          {variant.status === 'ACTIVE' && (
                            <ActionIconButton
                              disabled={pending}
                              Icon={Archive}
                              label={'Archiver la référence ' + getVariantLabel(variant)}
                              onClick={() => changeVariantStatus(variant, 'ARCHIVED')}
                              tooltipLabel="Archiver"
                              variant="outline"
                            />
                          )}
                          {variant.status === 'ARCHIVED' && product.status === 'ACTIVE' && (
                            <ActionIconButton
                              disabled={pending}
                              Icon={RotateCcw}
                              label={'Réactiver la référence ' + getVariantLabel(variant)}
                              onClick={() => changeVariantStatus(variant, 'ACTIVE')}
                              tooltipLabel="Réactiver"
                              variant="outline"
                            />
                          )}
                        </div>
                      )}
                    </li>
                    );
                  })}
                </ul>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" variant="section">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun événement Produit enregistré.
                </p>
              ) : (
                <ol className="space-y-3">
                  {events.map((event) => (
                    <li className="rounded-lg border border-border p-4" key={event.id}>
                      <p className="font-medium">{getProductEventLabel(event.action)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {event.actor
                          ? [event.actor.firstName, event.actor.lastName].filter(Boolean).join(' ')
                          : 'Acteur non disponible'}
                        {' · '}
                        {new Date(event.createdAt).toLocaleString('fr-FR')}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </EntityDetailsDrawer>

      {product && (
        <ProductReferenceEditDialog
          metadata={metadata}
          onClose={() => setEditProductOpen(false)}
          onSaved={() => {
            setEditProductOpen(false);
            toast({ title: 'Produit corrigé', variant: 'success' });
          }}
          open={editProductOpen}
          product={product}
        />
      )}

      {product && (
        <ProductDimensionContributionDialog
          metadata={metadata}
          mode="global"
          onClose={() => setCreateDimensionOpen(false)}
          onResolved={() => dimensionsQuery.refetch?.()}
          open={createDimensionOpen}
          product={product}
        />
      )}

      {product && editDimension && (
        <ProductDimensionEditDialog
          dimension={editDimension.dimension}
          onClose={() => setEditDimension(null)}
          onSaved={() => {
            dimensionsQuery.refetch?.();
            toast({ title: 'Dimension corrigée', variant: 'success' });
          }}
          open={Boolean(editDimension)}
          productId={product.id}
          type={editDimension.type}
        />
      )}

      {product && editVariant && (
        <ProductReferenceVariantEditDialog
          metadata={metadata}
          onClose={() => setEditVariant(null)}
          onSaved={() => {
            setEditVariant(null);
            toast({ title: 'Référence corrigée', variant: 'success' });
          }}
          open={Boolean(editVariant)}
          productId={product.id}
          variant={editVariant}
        />
      )}

      {deleteDimension && (
        <ConfirmationDialog
          confirmLabel="Supprimer"
          description={
            'Supprimer « '
            + deleteDimension.dimension.name
            + ' » ? Cette action retire cette valeur du référentiel actif. '
            + 'Elle sera refusée si une Référence Produit l’utilise.'
          }
          errorMessage={deleteError}
          onCancel={() => {
            setDeleteDimension(null);
            setDeleteError('');
          }}
          onConfirm={confirmDimensionDeletion}
          open
          pending={deleteDimensionState.isLoading}
          pendingLabel="Suppression…"
          title="Supprimer cette valeur ?"
        />
      )}

      <GlobalIndicativePriceDialog
        onClose={() => setPriceVariant(null)}
        onSaved={() => {
          setPriceVariant(null);
          toast({
            title: 'Prix repère global actualisé',
            variant: 'success',
          });
        }}
        open={Boolean(priceVariant)}
        variant={priceVariant}
      />

      {product && (
        <ProductVariantCreateDialog
          existingVariants={variants}
          metadata={metadata}
          mode="global"
          onClose={() => setCreateVariantOpen(false)}
          onCreated={() => {
            setCreateVariantOpen(false);
            toast({ title: 'Référence créée', variant: 'success' });
          }}
          open={createVariantOpen}
          product={product}
        />
      )}
    </>
  );
}

export { AdminDetailRow, ProductReferenceDetailsDrawer };
