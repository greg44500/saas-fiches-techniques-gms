import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';

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
  useArchiveProductVariantMutation,
  useAttachProductVariantMutation,
  useGetWorkspaceProductDetailQuery,
} from '@/features/products/api/product-catalog-api';
import { ProductVariantCreateDialog } from '@/features/products/components/product-variant-create-dialog';
import {
  PRODUCT_CAPABILITY,
  PRODUCT_PERMISSION,
} from '@/features/products/constants/product-permissions';
import {
  formatYield,
  getApiErrorMessage,
  getFoodRangeLabel,
  getFoodRangeName,
  getProductStatusLabel,
  getProductStatusTone,
  getReferenceUnitLabel,
  getVariantLabel,
  getWorkspaceProductStatusLabel,
} from '@/features/products/lib/product-presentation';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[160px_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium sm:text-right">{value || 'Non renseigné'}</dd>
    </div>
  );
}

function ProductDetailsDrawer({
  metadata,
  onClose,
  open,
  productId,
  workspaceId,
}) {
  const { can, hasFeature } = useWorkspaceContext();
  const { toast } = useToast();
  const retainedRef = useRef(null);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const query = useGetWorkspaceProductDetailQuery(
    { workspaceId, productId },
    { skip: !productId },
  );
  const [attachVariant, attachState] = useAttachProductVariantMutation();
  const [archiveVariant, archiveState] = useArchiveProductVariantMutation();

  if (query.data) retainedRef.current = query.data;
  const detail = query.data ?? retainedRef.current;
  const product = detail?.product;
  const variants = detail?.variants ?? [];
  const mutationPending = attachState.isLoading || archiveState.isLoading;

  if (!detail && !open) return null;

  async function changeCatalog(variant, shouldAttach) {
    try {
      if (shouldAttach) {
        await attachVariant({
          workspaceId,
          variantId: variant.id,
        }).unwrap();
        toast({ title: 'Référence ajoutée à mon référentiel', variant: 'success' });
      } else {
        await archiveVariant({
          workspaceId,
          variantId: variant.id,
        }).unwrap();
        toast({ title: 'Référence retirée de mon référentiel', variant: 'success' });
      }
    } catch (error) {
      toast({
        title: 'Action impossible',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  return (
    <>
      <EntityDetailsDrawer
        description="Identité Produit, déclinaisons et présence dans votre référentiel Workspace."
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
            <TabsList aria-label="Détails du Produit" variant="section">
              <TabsTrigger value="product" variant="section">Produit</TabsTrigger>
              <TabsTrigger value="variants" variant="section">Déclinaisons</TabsTrigger>
              <TabsTrigger value="catalog" variant="section">Mon référentiel</TabsTrigger>
            </TabsList>

            <TabsContent value="product" variant="section">
              <div className="rounded-lg border border-border px-4">
                <dl>
                  <DetailRow label="Nom" value={product.name} />
                  <DetailRow
                    label="Alias"
                    value={product.aliases?.length ? product.aliases.join(', ') : null}
                  />
                  <DetailRow label="Catégorie" value={product.category?.name} />
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
            </TabsContent>

            <TabsContent value="variants" variant="section">
              <div className="space-y-4">
                {can(PRODUCT_PERMISSION.CONTRIBUTE)
                  && hasFeature(PRODUCT_CAPABILITY.CONTRIBUTION)
                  && product.status === 'ACTIVE' && (
                  <div className="flex justify-end">
                    <Button
                      onClick={() => setVariantDialogOpen(true)}
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
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="catalog" variant="section">
              <ul className="space-y-3">
                {variants.map((variant) => {
                  const inCatalog = variant.workspaceEntry?.status === 'ACTIVE';
                  const canAttach = (
                    can(PRODUCT_PERMISSION.CATALOG_MANAGE)
                    && product.status === 'ACTIVE'
                    && variant.status === 'ACTIVE'
                  );

                  return (
                    <li className="rounded-lg border border-border p-4" key={variant.id}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{getVariantLabel(variant)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {variant.workspaceEntry
                              ? getWorkspaceProductStatusLabel(
                                metadata,
                                variant.workspaceEntry.status,
                              )
                              : 'Absente de mon référentiel'}
                          </p>
                        </div>
                        {can(PRODUCT_PERMISSION.CATALOG_MANAGE) && (
                          inCatalog ? (
                            <Button
                              disabled={mutationPending}
                              onClick={() => changeCatalog(variant, false)}
                              type="button"
                              variant="outline"
                            >
                              Retirer de mon référentiel
                            </Button>
                          ) : canAttach ? (
                            <Button
                              disabled={mutationPending}
                              onClick={() => changeCatalog(variant, true)}
                              type="button"
                            >
                              Ajouter à mon référentiel
                            </Button>
                          ) : null
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </TabsContent>
          </Tabs>
        ) : null}
      </EntityDetailsDrawer>

      {product && (
        <ProductVariantCreateDialog
          existingVariants={variants}
          metadata={metadata}
          onClose={() => setVariantDialogOpen(false)}
          onCreated={() => {
            setVariantDialogOpen(false);
            toast({
              title: 'Déclinaison créée',
              variant: 'success',
            });
          }}
          open={variantDialogOpen}
          product={product}
          workspaceId={workspaceId}
        />
      )}
    </>
  );
}

export { DetailRow, ProductDetailsDrawer };
