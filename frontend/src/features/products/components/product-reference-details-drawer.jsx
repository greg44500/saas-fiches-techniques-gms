import { useRef, useState } from 'react';
import { Pencil } from 'lucide-react';

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
  useApproveProductReferenceMutation,
  useApproveProductReferenceVariantMutation,
  useGetProductReferenceDetailQuery,
  useUpdateProductReferenceStatusMutation,
  useUpdateProductReferenceVariantStatusMutation,
} from '@/features/products/api/product-reference-api';
import { ProductReferenceEditDialog } from '@/features/products/components/product-reference-edit-dialog';
import { ProductReferenceRejectDialog } from '@/features/products/components/product-reference-reject-dialog';
import { ProductReferenceVariantEditDialog } from '@/features/products/components/product-reference-variant-edit-dialog';
import {
  formatYield,
  getApiErrorMessage,
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
  const [rejectTarget, setRejectTarget] = useState(null);

  const query = useGetProductReferenceDetailQuery(productId, { skip: !productId });
  const [approveProduct, approveProductState] = useApproveProductReferenceMutation();
  const [approveVariant, approveVariantState] = useApproveProductReferenceVariantMutation();
  const [updateProductStatus, productStatusState] = useUpdateProductReferenceStatusMutation();
  const [updateVariantStatus, variantStatusState] = useUpdateProductReferenceVariantStatusMutation();

  if (query.data) retainedRef.current = query.data;
  const detail = query.data ?? retainedRef.current;
  const product = detail?.product;
  const variants = detail?.variants ?? [];
  const events = detail?.events ?? [];
  const pending = (
    approveProductState.isLoading
    || approveVariantState.isLoading
    || productStatusState.isLoading
    || variantStatusState.isLoading
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

  function approveCurrentProduct() {
    run(
      () => approveProduct(product.id).unwrap(),
      'Produit validé',
    );
  }

  function changeProductStatus(status) {
    run(
      () => updateProductStatus({ productId: product.id, status }).unwrap(),
      status === 'ARCHIVED' ? 'Produit archivé' : 'Produit réactivé',
    );
  }

  function approveCurrentVariant(variant) {
    run(
      () => approveVariant({
        productId: product.id,
        variantId: variant.id,
      }).unwrap(),
      'Déclinaison validée',
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

  return (
    <>
      <EntityDetailsDrawer
        description="Gouvernance globale du Produit, de ses déclinaisons et de leur historique."
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
                    {product.status === 'PENDING_REVIEW' && (
                      <>
                        <Button
                          disabled={pending}
                          onClick={approveCurrentProduct}
                          type="button"
                        >
                          Valider le Produit
                        </Button>
                        <Button
                          disabled={pending}
                          onClick={() => setRejectTarget({ variant: null })}
                          type="button"
                          variant="destructive"
                        >
                          Rejeter
                        </Button>
                      </>
                    )}
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
                      label="Alias"
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

            <TabsContent value="variants" variant="section">
              <ul className="space-y-3">
                {variants.map((variant) => (
                  <li className="rounded-lg border border-border p-4" key={variant.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{getVariantLabel(variant)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Unité : {getReferenceUnitLabel(metadata, variant.referenceUnit)}
                          {' · '}Rendement : {formatYield(variant.yieldPercent)}
                          {variant.foodRange ? ' · Gamme ' + variant.foodRange : ''}
                        </p>
                      </div>
                      <StatusBadge tone={getProductStatusTone(variant.status)}>
                        {getProductStatusLabel(metadata, variant.status)}
                      </StatusBadge>
                    </div>

                    {canManage && (
                      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                        {variant.status !== 'REJECTED' && (
                          <Button
                            disabled={pending}
                            onClick={() => setEditVariant(variant)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Corriger
                          </Button>
                        )}
                        {variant.status === 'PENDING_REVIEW' && product.status === 'ACTIVE' && (
                          <Button
                            disabled={pending}
                            onClick={() => approveCurrentVariant(variant)}
                            size="sm"
                            type="button"
                          >
                            Valider
                          </Button>
                        )}
                        {variant.status === 'PENDING_REVIEW' && (
                          <Button
                            disabled={pending}
                            onClick={() => setRejectTarget({ variant })}
                            size="sm"
                            type="button"
                            variant="destructive"
                          >
                            Rejeter
                          </Button>
                        )}
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
            </TabsContent>

            <TabsContent value="history" variant="section">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun événement de gouvernance enregistré.
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

      {product && rejectTarget && (
        <ProductReferenceRejectDialog
          metadata={metadata}
          onClose={() => setRejectTarget(null)}
          onRejected={() => {
            setRejectTarget(null);
            toast({
              title: rejectTarget.variant ? 'Déclinaison rejetée' : 'Produit rejeté',
              variant: 'success',
            });
          }}
          open={Boolean(rejectTarget)}
          product={product}
          variant={rejectTarget.variant}
        />
      )}
    </>
  );
}

export { AdminDetailRow, ProductReferenceDetailsDrawer };
