import { useRef, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';

import { ActionIconButton } from '@/components/shared/action-icon-button';
import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  useGetProductReferenceDetailQuery,
  useGetProductReferenceDimensionsQuery,
  useUpdateProductReferenceCharacteristicStatusMutation,
  useUpdateProductReferenceStatusMutation,
  useUpdateProductReferenceVarietyStatusMutation,
  useUpdateProductReferenceVariantStatusMutation,
} from '@/features/products/api/product-reference-api';
import { ProductDimensionContributionDialog } from '@/features/products/components/product-dimension-contribution-dialog';
import { ProductDimensionEditDialog } from '@/features/products/components/product-dimension-edit-dialog';
import { ProductReferenceEditDialog } from '@/features/products/components/product-reference-edit-dialog';
import { ProductReferenceVariantEditDialog } from '@/features/products/components/product-reference-variant-edit-dialog';
import { ProductVariantCreateDialog } from '@/features/products/components/product-variant-create-dialog';
import {
  formatYield,
  getApiErrorMessage,
  getFoodRangeLabel,
  getFoodRangeName,
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

function ProductReferenceDetailsDrawer({
  canManage,
  metadata,
  onClose,
  open,
  productId,
}) {
  const { toast } = useToast();
  const retainedRef = useRef(null);
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [editVariant, setEditVariant] = useState(null);
  const [editDimension, setEditDimension] = useState(null);
  const [createVariantOpen, setCreateVariantOpen] = useState(false);
  const [createDimensionOpen, setCreateDimensionOpen] = useState(false);

  const query = useGetProductReferenceDetailQuery(productId, { skip: !productId });
  const dimensionsQuery = useGetProductReferenceDimensionsQuery(productId, {
    skip: !productId,
  });
  const [updateProductStatus, productStatusState] = useUpdateProductReferenceStatusMutation();
  const [updateVariantStatus, variantStatusState] = useUpdateProductReferenceVariantStatusMutation();
  const [updateVarietyStatus, varietyStatusState] =
    useUpdateProductReferenceVarietyStatusMutation();
  const [updateCharacteristicStatus, characteristicStatusState] =
    useUpdateProductReferenceCharacteristicStatusMutation();

  if (query.data) retainedRef.current = query.data;
  const detail = query.data ?? retainedRef.current;
  const product = detail?.product;
  const variants = detail?.variants ?? [];
  const events = detail?.events ?? [];
  const varieties = dimensionsQuery.data?.varieties ?? [];
  const characteristics = dimensionsQuery.data?.characteristics ?? [];
  const characteristicKindLabels = new Map(
    (metadata?.productCharacteristicKinds ?? []).map(
      ({ value, label }) => [value, label],
    ),
  );
  const pending = (
    productStatusState.isLoading
    || variantStatusState.isLoading
    || varietyStatusState.isLoading
    || characteristicStatusState.isLoading
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
      status === 'ARCHIVED' ? 'Déclinaison archivée' : 'Déclinaison réactivée',
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
          <Tabs defaultValue="product">
            <TabsList aria-label="Administration du Produit" variant="section">
              <TabsTrigger value="product" variant="section">Produit</TabsTrigger>
              <TabsTrigger value="dimensions" variant="section">Dimensions</TabsTrigger>
              <TabsTrigger value="variants" variant="section">Déclinaisons</TabsTrigger>
              <TabsTrigger value="history" variant="section">Historique</TabsTrigger>
            </TabsList>

            <TabsContent value="product" variant="section">
              <div className="space-y-4">
                {canManage && (
                  <div className="flex flex-wrap justify-end gap-2">
                    <ActionIconButton
                      Icon={Pencil}
                      label="Corriger le Produit"
                      onClick={() => setEditProductOpen(true)}
                      variant="outline"
                    />
                    {product.status === 'ACTIVE' && (
                      <Button
                        disabled={pending}
                        onClick={() => changeProductStatus('ARCHIVED')}
                        type="button"
                        variant="outline"
                      >
                        Archiver
                      </Button>
                    )}
                    {product.status === 'ARCHIVED' && (
                      <Button
                        disabled={pending}
                        onClick={() => changeProductStatus('ACTIVE')}
                        type="button"
                      >
                        Réactiver
                      </Button>
                    )}
                  </div>
                )}

                <div className="rounded-lg border border-border px-4">
                  <dl>
                    <AdminDetailRow label="Nom" value={product.name} />
                    <AdminDetailRow
                      label="Synonymes métier"
                      value={product.aliases?.length ? product.aliases.join(', ') : null}
                    />
                    <AdminDetailRow label="Catégorie" value={product.category?.name} />
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
              </div>
            </TabsContent>

            <TabsContent value="dimensions" variant="section">
              <div className="space-y-5">
                {canManage && product.status === 'ACTIVE' && (
                  <div className="flex justify-end">
                    <Button
                      onClick={() => setCreateDimensionOpen(true)}
                      type="button"
                      variant="outline"
                    >
                      <Plus aria-hidden="true" className="size-4" />
                      Enrichir le référentiel
                    </Button>
                  </div>
                )}

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Variétés</h3>
                  {varieties.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune variété n’est définie pour ce Produit.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {varieties.map((variety) => (
                        <li
                          className="rounded-lg border border-border p-3"
                          key={variety.id}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{variety.name}</p>
                              {variety.aliases?.length > 0 && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Synonymes : {variety.aliases.join(', ')}
                                </p>
                              )}
                            </div>
                            <StatusBadge tone={getProductStatusTone(variety.status)}>
                              {getProductStatusLabel(metadata, variety.status)}
                            </StatusBadge>
                          </div>
                          {canManage && (
                            <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                              <Button
                                disabled={pending}
                                onClick={() => setEditDimension({
                                  type: 'VARIETY',
                                  dimension: variety,
                                })}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                Corriger
                              </Button>
                              {variety.status === 'ACTIVE' && (
                                <Button
                                  disabled={pending}
                                  onClick={() => changeDimensionStatus(
                                    'VARIETY',
                                    variety,
                                    'ARCHIVED',
                                  )}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  Archiver
                                </Button>
                              )}
                              {variety.status === 'ARCHIVED'
                                && product.status === 'ACTIVE' && (
                                <Button
                                  disabled={pending}
                                  onClick={() => changeDimensionStatus(
                                    'VARIETY',
                                    variety,
                                    'ACTIVE',
                                  )}
                                  size="sm"
                                  type="button"
                                >
                                  Réactiver
                                </Button>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Caractéristiques</h3>
                  {characteristics.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune caractéristique n’est définie pour ce Produit.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {characteristics.map((characteristic) => (
                        <li
                          className="rounded-lg border border-border p-3"
                          key={characteristic.id}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{characteristic.name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {characteristicKindLabels.get(characteristic.kind)
                                  ?? characteristic.kind}
                                {characteristic.aliases?.length
                                  ? ' · Synonymes : ' + characteristic.aliases.join(', ')
                                  : ''}
                              </p>
                            </div>
                            <StatusBadge tone={getProductStatusTone(characteristic.status)}>
                              {getProductStatusLabel(metadata, characteristic.status)}
                            </StatusBadge>
                          </div>
                          {canManage && (
                            <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                              <Button
                                disabled={pending}
                                onClick={() => setEditDimension({
                                  type: 'CHARACTERISTIC',
                                  dimension: characteristic,
                                })}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                Corriger
                              </Button>
                              {characteristic.status === 'ACTIVE' && (
                                <Button
                                  disabled={pending}
                                  onClick={() => changeDimensionStatus(
                                    'CHARACTERISTIC',
                                    characteristic,
                                    'ARCHIVED',
                                  )}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  Archiver
                                </Button>
                              )}
                              {characteristic.status === 'ARCHIVED'
                                && product.status === 'ACTIVE' && (
                                <Button
                                  disabled={pending}
                                  onClick={() => changeDimensionStatus(
                                    'CHARACTERISTIC',
                                    characteristic,
                                    'ACTIVE',
                                  )}
                                  size="sm"
                                  type="button"
                                >
                                  Réactiver
                                </Button>
                              )}
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
                      Créer une déclinaison
                    </Button>
                  </div>
                )}

                <ul className="space-y-3">
                  {variants.map((variant) => (
                    <li className="rounded-lg border border-border p-4" key={variant.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{getVariantLabel(variant)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Unité : {getReferenceUnitLabel(metadata, variant.referenceUnit)}
                            {' · '}Rendement : {formatYield(variant.yieldPercent)}
                            {variant.foodRange
                              ? ' · ' + getFoodRangeLabel(metadata, variant.foodRange)
                              : ''}
                            {getFoodRangeName(metadata, variant.foodRange)
                              ? ' · ' + getFoodRangeName(metadata, variant.foodRange)
                              : ''}
                          </p>
                        </div>
                        <StatusBadge tone={getProductStatusTone(variant.status)}>
                          {getProductStatusLabel(metadata, variant.status)}
                        </StatusBadge>
                      </div>

                      {canManage && (
                        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                          <Button
                            disabled={pending}
                            onClick={() => setEditVariant(variant)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Corriger
                          </Button>
                          {variant.status === 'ACTIVE' && (
                            <Button
                              disabled={pending}
                              onClick={() => changeVariantStatus(variant, 'ARCHIVED')}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              Archiver
                            </Button>
                          )}
                          {variant.status === 'ARCHIVED' && product.status === 'ACTIVE' && (
                            <Button
                              disabled={pending}
                              onClick={() => changeVariantStatus(variant, 'ACTIVE')}
                              size="sm"
                              type="button"
                            >
                              Réactiver
                            </Button>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
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
            toast({ title: 'Déclinaison corrigée', variant: 'success' });
          }}
          open={Boolean(editVariant)}
          productId={product.id}
          variant={editVariant}
        />
      )}

      {product && (
        <ProductVariantCreateDialog
          existingVariants={variants}
          metadata={metadata}
          mode="global"
          onClose={() => setCreateVariantOpen(false)}
          onCreated={() => {
            setCreateVariantOpen(false);
            toast({ title: 'Déclinaison créée', variant: 'success' });
          }}
          open={createVariantOpen}
          product={product}
        />
      )}
    </>
  );
}

export { AdminDetailRow, ProductReferenceDetailsDrawer };
