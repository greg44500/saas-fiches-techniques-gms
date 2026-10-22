import { useMemo, useState } from 'react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { SupplierArticleSearchAutocomplete } from '@/features/suppliers/components/supplier-article-search-autocomplete';
import {
  useGetSupplierPricingMetadataQuery,
  useLazyGetApplicableSupplierPriceQuery,
  useListDossierSupplierReferencesQuery,
} from '@/features/suppliers/api/supplier-api';
import {
  SUPPLIER_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  formatPrice,
} from '@/features/suppliers/lib/supplier-presentation';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

function normalizeArticle(article) {
  return {
    id: article.id,
    supplierName: article.supplier?.name ?? article.supplierName ?? 'Fournisseur',
    supplierReference: article.supplierReference,
    supplierDesignation: article.supplierDesignation,
    productVariantName: article.productVariantName ?? article.productVariant?.name,
  };
}

function getPricingSourceLabel(definitions, source) {
  return (definitions ?? [])
    .find((definition) => definition.value === source)
    ?.label ?? 'Source non disponible';
}

function DossierApplicablePriceCard({
  dossierId,
  workspaceId,
}) {
  const { can } = useWorkspaceContext();
  const [selectedArticle, setSelectedArticle] = useState(null);
  const pricingMetadataQuery =
    useGetSupplierPricingMetadataQuery(
      { workspaceId, dossierId },
      {
        skip: !can(
          SUPPLIER_PERMISSION.APPLICABLE_PRICE_READ,
        ),
      },
    );

  const referencesQuery = useListDossierSupplierReferencesQuery(
    { workspaceId, dossierId },
    {
      skip: (
        can(SUPPLIER_PERMISSION.ARTICLE_READ)
        || !can(SUPPLIER_PERMISSION.DOSSIER_REFERENCE_READ)
      ),
    },
  );
  const [loadApplicablePrice, applicablePriceQuery] =
    useLazyGetApplicableSupplierPriceQuery();

  const fallbackArticles = useMemo(
    () => (referencesQuery.data ?? [])
      .map(({ supplierArticle }) => normalizeArticle(supplierArticle)),
    [referencesQuery.data],
  );

  async function chooseArticle(article) {
    setSelectedArticle(article);
    if (!article) {
      applicablePriceQuery.reset();
      return;
    }

    try {
      await loadApplicablePrice({
        workspaceId,
        dossierId,
        articleId: article.id,
      }).unwrap();
    } catch {
      // L'état RTK Query est présenté de façon compacte dans la carte.
    }
  }

  const applicable = applicablePriceQuery.data;

  const showResult = Boolean(selectedArticle);

  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card px-5 py-4 lg:h-56">
      <div className="flex items-start gap-2">
        <h2 className="font-semibold">Vérifier un prix applicable</h2>
        <InfoTooltip
          content="Sélectionnez un Article fournisseur pour voir le prix que l’application utiliserait dans ce Dossier selon la politique de prix définie."
          label="À propos de la vérification du prix applicable"
        />
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          Article fournisseur
        </p>
        <SupplierArticleSearchAutocomplete
          ariaLabel="Article fournisseur à vérifier"
          fallbackArticles={fallbackArticles}
          onSelect={chooseArticle}
          selectedArticle={selectedArticle}
          serverSearch={can(SUPPLIER_PERMISSION.ARTICLE_READ)}
          workspaceId={workspaceId}
        />
      </div>

      <div
        aria-live="polite"
        className="mt-auto min-h-14 border-t border-border pt-3"
      >
        {showResult && applicablePriceQuery.isFetching && (
          <p className="text-sm text-muted-foreground">
            Vérification du prix…
          </p>
        )}

        {showResult && applicablePriceQuery.isError && (
          <p className="text-sm text-destructive">
            Le prix applicable n’a pas pu être déterminé.
          </p>
        )}

        {showResult
        && !applicablePriceQuery.isFetching
        && !applicablePriceQuery.isError
        && applicable && (
          <>
            <p className="font-medium">
              {applicable.price
                ? formatPrice(applicable.price, {
                    hideDefaultCurrency: true,
                    productVariant: applicable.productVariant,
                  })
                : 'Aucun prix applicable'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Source : {getPricingSourceLabel(
                pricingMetadataQuery.data
                  ?.applicablePriceSources,
                applicable.resolvedSource,
              )}
            </p>
            {applicable.price?.validityStatus === 'EXPIRED' && (
              <p className="mt-1 text-xs font-medium text-warning" role="note">
                Dernier prix connu — tarif expiré, à confirmer auprès du fournisseur.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export { DossierApplicablePriceCard };
