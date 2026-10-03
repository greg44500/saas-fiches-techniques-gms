import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Euro,
  PackagePlus,
  Plus,
  Star,
} from 'lucide-react';

import { ActionIconButton } from '@/components/shared/action-icon-button';
import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  getConservationTypeLabel,
  getProductStatusLabel,
  getProductStatusTone,
  getReferenceUnitLabel,
  getVariantLabel,
} from '@/features/products/lib/product-presentation';
import {
  useListSupplierArticlesQuery,
  useListSuppliersQuery,
  useListWorkspaceIndicativePricesQuery,
} from '@/features/suppliers/api/supplier-api';
import {
  IndicativePriceDialog,
} from '@/features/suppliers/components/indicative-price-dialog';
import {
  SupplierArticleFormDialog,
} from '@/features/suppliers/components/supplier-article-form-dialog';
import {
  SUPPLIER_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  formatPackaging,
  formatPrice,
} from '@/features/suppliers/lib/supplier-presentation';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function FilledStarIcon(props) {
  return <Star {...props} fill="currentColor" />;
}

function FavoriteToggleIcon({
  disabled,
  favorite,
  label,
  onClick,
}) {
  const tooltipLabel = favorite
    ? 'Retirer des favoris'
    : 'Ajouter aux favoris';

  return (
    <Tooltip>
      <TooltipTrigger
        render={(
          <button
            aria-label={label}
            className="group relative inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            disabled={disabled}
            onClick={onClick}
            type="button"
          />
        )}
      >
        {favorite ? (
          <>
            <FilledStarIcon
              aria-hidden="true"
              className="size-4 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0"
              data-favorite-state-icon="filled"
            />
            <Star
              aria-hidden="true"
              className="absolute size-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              data-favorite-hover-icon="outline"
            />
          </>
        ) : (
          <>
            <Star
              aria-hidden="true"
              className="size-4 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0"
              data-favorite-state-icon="outline"
            />
            <FilledStarIcon
              aria-hidden="true"
              className="absolute size-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              data-favorite-hover-icon="filled"
            />
          </>
        )}
      </TooltipTrigger>
      <TooltipContent>{tooltipLabel}</TooltipContent>
    </Tooltip>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[160px_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium sm:text-right">{value || 'Non renseigné'}</dd>
    </div>
  );
}

function VariantIdentity({
  metadata,
  nameAction = null,
  variant,
}) {
  return (
    <>
      <div className="flex min-w-0 items-center gap-1.5">
        <p className="truncate font-medium">{getVariantLabel(variant)}</p>
        {nameAction}
      </div>
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
    </>
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
  const [section, setSection] = useState('product');
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [articleVariant, setArticleVariant] = useState(null);
  const [indicativeVariant, setIndicativeVariant] = useState(null);

  const canReadSupplierArticles = can(SUPPLIER_PERMISSION.ARTICLE_READ);
  const canManageSupplierArticles = can(SUPPLIER_PERMISSION.ARTICLE_MANAGE);
  const canReadSuppliers = can(SUPPLIER_PERMISSION.SUPPLIER_READ);
  const canReadIndicativePrices = can(
    SUPPLIER_PERMISSION.INDICATIVE_PRICE_READ,
  );
  const canManageIndicativePrices = can(
    SUPPLIER_PERMISSION.INDICATIVE_PRICE_MANAGE,
  );

  const query = useGetWorkspaceProductDetailQuery(
    { workspaceId, productId },
    { skip: !productId },
  );
  const articleQuery = useListSupplierArticlesQuery(
    {
      workspaceId,
      productId,
      status: 'ACTIVE',
      limit: 100,
    },
    {
      skip: !open || !productId || !canReadSupplierArticles,
    },
  );
  const indicativePriceQuery = useListWorkspaceIndicativePricesQuery(
    {
      workspaceId,
      productId,
      status: 'ACTIVE',
    },
    {
      skip: !open || !productId || !canReadIndicativePrices,
    },
  );
  const supplierQuery = useListSuppliersQuery(
    {
      workspaceId,
      status: 'ACTIVE',
      limit: 100,
    },
    {
      skip: (
        !open
        || !articleVariant
        || !canManageSupplierArticles
        || !canReadSuppliers
      ),
    },
  );

  const [attachVariant, attachState] = useAttachProductVariantMutation();
  const [archiveVariant, archiveState] = useArchiveProductVariantMutation();

  useEffect(() => {
    if (!open) return;

    setSection('product');
    setVariantDialogOpen(false);
    setArticleVariant(null);
    setIndicativeVariant(null);
  }, [open, productId]);

  if (query.data) retainedRef.current = query.data;
  const detail = query.data ?? retainedRef.current;
  const product = detail?.product;
  const variants = useMemo(
    () => detail?.variants ?? [],
    [detail?.variants],
  );
  const favoriteVariants = useMemo(
    () => variants.filter(
      (variant) => variant.workspaceEntry?.status === 'ACTIVE',
    ),
    [variants],
  );
  const articles = useMemo(
    () => articleQuery.data?.articles ?? [],
    [articleQuery.data?.articles],
  );
  const articlesByVariant = useMemo(() => {
    const grouped = new Map();

    articles.forEach((article) => {
      const variantId = article.productVariant?.id;
      if (!variantId) return;

      const current = grouped.get(variantId) ?? [];
      current.push(article);
      grouped.set(variantId, current);
    });

    return grouped;
  }, [articles]);
  const indicativePriceByVariant = useMemo(
    () => new Map(
      (indicativePriceQuery.data ?? [])
        .map((price) => [price.productVariant?.id, price])
        .filter(([variantId]) => Boolean(variantId)),
    ),
    [indicativePriceQuery.data],
  );
  const mutationPending = attachState.isLoading || archiveState.isLoading;

  if (!detail && !open) return null;

  async function changeCatalog(variant, shouldAttach) {
    try {
      if (shouldAttach) {
        await attachVariant({
          workspaceId,
          variantId: variant.id,
        }).unwrap();
        toast({
          title: 'Référence ajoutée aux favoris',
          description:
            'Vous pouvez maintenant compléter son prix indicatif ou son approvisionnement.',
          variant: 'success',
        });
      } else {
        await archiveVariant({
          workspaceId,
          variantId: variant.id,
        }).unwrap();
        toast({ title: 'Référence retirée des favoris', variant: 'success' });
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
        description="Identité Produit, Références, favoris et données commerciales disponibles dans cet espace de travail."
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
          <Tabs onValueChange={setSection} value={section}>
            <TabsList aria-label="Détails du Produit" variant="section">
              <TabsTrigger value="product" variant="section">Produit</TabsTrigger>
              <TabsTrigger value="variants" variant="section">
                Références ({variants.length})
              </TabsTrigger>
              <TabsTrigger value="catalog" variant="section">
                Favoris ({favoriteVariants.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="product" variant="section">
              <div className="rounded-lg border border-border px-4">
                <dl>
                  <DetailRow label="Nom" value={product.name} />
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
                      Créer une référence
                    </Button>
                  </div>
                )}

                <ul aria-label="Références Produit" className="space-y-3">
                  {variants.map((variant) => {
                    const inCatalog =
                      variant.workspaceEntry?.status === 'ACTIVE';
                    const canAttach = (
                      can(PRODUCT_PERMISSION.CATALOG_MANAGE)
                      && product.status === 'ACTIVE'
                      && variant.status === 'ACTIVE'
                    );

                    return (
                      <li
                        className="rounded-lg border border-border p-4"
                        key={variant.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <VariantIdentity
                              metadata={metadata}
                              nameAction={
                                can(PRODUCT_PERMISSION.CATALOG_MANAGE)
                                && (
                                  inCatalog
                                    ? (
                                      <FavoriteToggleIcon
                                        disabled={mutationPending}
                                        favorite
                                        label={
                                          'Retirer '
                                          + getVariantLabel(variant)
                                          + ' des favoris'
                                        }
                                        onClick={() => changeCatalog(
                                          variant,
                                          false,
                                        )}
                                      />
                                    )
                                    : canAttach
                                      ? (
                                        <FavoriteToggleIcon
                                          disabled={mutationPending}
                                          favorite={false}
                                          label={
                                            'Ajouter '
                                            + getVariantLabel(variant)
                                            + ' aux favoris'
                                          }
                                          onClick={() => changeCatalog(
                                            variant,
                                            true,
                                          )}
                                        />
                                      )
                                      : null
                                )
                              }
                              variant={variant}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <StatusBadge tone={getProductStatusTone(variant.status)}>
                              {getProductStatusLabel(metadata, variant.status)}
                            </StatusBadge>
                            {variant.governanceStatus === 'PROVISIONAL' && (
                              <StatusBadge tone="warning">
                                À contrôler
                              </StatusBadge>
                            )}

                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="catalog" variant="section">
              <div className="space-y-3">
                {canReadSupplierArticles
                && articleQuery.isError && (
                  <p className="text-sm text-destructive">
                    Les approvisionnements n’ont pas pu être chargés.
                  </p>
                )}

                {canReadIndicativePrices
                && indicativePriceQuery.isError && (
                  <p className="text-sm text-destructive">
                    Les Prix indicatifs n’ont pas pu être chargés.
                  </p>
                )}

                {favoriteVariants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune Référence n’est ajoutée aux favoris.
                  </p>
                ) : (
                  <ul aria-label="Références favorites" className="space-y-3">
                    {favoriteVariants.map((variant) => {
                      const variantArticles =
                        articlesByVariant.get(variant.id) ?? [];
                      const indicativePrice =
                        indicativePriceByVariant.get(variant.id) ?? null;

                      return (
                        <li
                          className="rounded-lg border border-border p-4"
                          key={variant.id}
                        >
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <VariantIdentity
                                  metadata={metadata}
                                  variant={variant}
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                {variant.governanceStatus === 'PROVISIONAL' && (
                                  <StatusBadge tone="warning">
                                    À contrôler
                                  </StatusBadge>
                                )}
                                {canManageIndicativePrices && (
                                  <ActionIconButton
                                    Icon={Euro}
                                    label={
                                      'Appliquer un prix indicatif à '
                                      + getVariantLabel(variant)
                                    }
                                    onClick={() => setIndicativeVariant(variant)}
                                    tooltipLabel="Appliquer un prix indicatif"
                                    variant="outline"
                                  />
                                )}

                                {canManageSupplierArticles
                                && canReadSuppliers && (
                                  <ActionIconButton
                                    Icon={PackagePlus}
                                    label={
                                      'Ajouter un Article fournisseur pour '
                                      + getVariantLabel(variant)
                                    }
                                    onClick={() => setArticleVariant(variant)}
                                    tooltipLabel="Ajouter un Article fournisseur"
                                    variant="outline"
                                  />
                                )}

                                {can(PRODUCT_PERMISSION.CATALOG_MANAGE) && (
                                  <ActionIconButton
                                    Icon={FilledStarIcon}
                                    disabled={mutationPending}
                                    label={
                                      'Retirer '
                                      + getVariantLabel(variant)
                                      + ' des favoris'
                                    }
                                    onClick={() => changeCatalog(variant, false)}
                                    tooltipLabel="Retirer des favoris"
                                    variant="outline"
                                  />
                                )}
                              </div>
                            </div>

                            <div className="grid gap-3 border-t border-border pt-3">
                              {canReadIndicativePrices && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">
                                    PU HT estimé
                                  </p>
                                  <p className="mt-1 text-sm font-medium">
                                    {indicativePriceQuery.isLoading
                                      && indicativePriceQuery.data === undefined
                                      ? 'Chargement…'
                                      : indicativePrice
                                        ? formatPrice(indicativePrice, {
                                            hideDefaultCurrency: true,
                                          })
                                        : 'Non renseigné'}
                                  </p>
                                  {indicativePrice?.source && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {indicativePrice.source}
                                    </p>
                                  )}
                                </div>
                              )}

                              {canReadSupplierArticles && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">
                                    Approvisionnements ({variantArticles.length})
                                  </p>

                                  {articleQuery.isLoading
                                  && articleQuery.data === undefined ? (
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      Chargement…
                                    </p>
                                  ) : variantArticles.length === 0 ? (
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      Aucun Article fournisseur actif.
                                    </p>
                                  ) : (
                                    <ul className="mt-2 space-y-2">
                                      {variantArticles.map((article) => (
                                        <li
                                          className="rounded-md bg-muted/30 px-3 py-2"
                                          key={article.id}
                                        >
                                          <p className="text-sm font-medium">
                                            {(article.supplier?.name ?? 'Fournisseur')
                                              + ' · '
                                              + article.supplierReference}
                                          </p>
                                          <p className="mt-1 text-xs text-muted-foreground">
                                            {formatPackaging(article.packaging)}
                                          </p>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : null}
      </EntityDetailsDrawer>

      {product && (
        <ProductVariantCreateDialog
          existingVariants={variants}
          metadata={metadata}
          onClose={() => setVariantDialogOpen(false)}
          onCreated={(result) => {
            setVariantDialogOpen(false);

            if (result?.classification === 'EXISTING') {
              setSection('catalog');
              toast({
                title: 'Référence existante utilisée',
                description:
                  'La Référence a été ajoutée à vos favoris sans créer de doublon.',
                variant: 'success',
              });
              return;
            }

            setSection('variants');
            toast({
              title: 'Référence créée · À contrôler',
              description:
                'Elle est utilisable dans cet espace de travail et attend la validation du référentiel global.',
              variant: 'success',
            });
          }}
          open={variantDialogOpen}
          product={product}
          workspaceId={workspaceId}
        />
      )}

      <IndicativePriceDialog
        onClose={() => setIndicativeVariant(null)}
        onSaved={(result) => {
          setIndicativeVariant(null);
          toast({
            title: result?.removed
              ? 'Prix indicatif retiré'
              : 'Prix indicatif enregistré',
            variant: 'success',
          });
        }}
        open={Boolean(indicativeVariant)}
        variant={indicativeVariant}
        workspaceId={workspaceId}
      />

      <SupplierArticleFormDialog
        initialProductVariant={articleVariant}
        onClose={() => setArticleVariant(null)}
        onSaved={() => {
          setArticleVariant(null);
          toast({
            title: 'Article fournisseur créé',
            variant: 'success',
          });
        }}
        open={Boolean(articleVariant)}
        suppliers={supplierQuery.data?.suppliers ?? []}
        suppliersLoading={supplierQuery.isLoading}
        workspaceId={workspaceId}
      />
    </>
  );
}

export { DetailRow, ProductDetailsDrawer };
