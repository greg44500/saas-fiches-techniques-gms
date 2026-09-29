import { useMemo, useState } from 'react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useLazyGetApplicableSupplierPriceQuery,
  useListDossierSupplierReferencesQuery,
  useListSupplierArticlesQuery,
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

const NONE = '__NONE__';

function normalizeArticle(article) {
  return {
    id: article.id,
    supplierName: article.supplier?.name ?? article.supplierName ?? 'Fournisseur',
    supplierReference: article.supplierReference,
  };
}

function getPricingSourceLabel(source) {
  return {
    SUPPLIER_TARIFF: 'Tarif fournisseur',
    NEGOTIATED_PRICE: 'Tarif négocié',
    INVOICED_PRICE: 'Prix facturé',
  }[source] ?? 'Source non disponible';
}

function DossierApplicablePriceCard({
  dossierId,
  workspaceId,
}) {
  const { can } = useWorkspaceContext();
  const [selectedArticleId, setSelectedArticleId] = useState(NONE);

  const referencesQuery = useListDossierSupplierReferencesQuery(
    { workspaceId, dossierId },
    {
      skip: (
        can(SUPPLIER_PERMISSION.ARTICLE_READ)
        || !can(SUPPLIER_PERMISSION.DOSSIER_REFERENCE_READ)
      ),
    },
  );
  const articlesQuery = useListSupplierArticlesQuery(
    { workspaceId, limit: 100 },
    { skip: !can(SUPPLIER_PERMISSION.ARTICLE_READ) },
  );
  const [loadApplicablePrice, applicablePriceQuery] =
    useLazyGetApplicableSupplierPriceQuery();

  const visibleArticles = useMemo(
    () => (
      can(SUPPLIER_PERMISSION.ARTICLE_READ)
        ? (articlesQuery.data?.articles ?? []).map(normalizeArticle)
        : (referencesQuery.data ?? [])
          .map(({ supplierArticle }) => normalizeArticle(supplierArticle))
    ),
    [
      articlesQuery.data?.articles,
      can,
      referencesQuery.data,
    ],
  );

  async function chooseArticle(articleId) {
    setSelectedArticleId(articleId);

    if (articleId === NONE) {
      applicablePriceQuery.reset();
      return;
    }

    try {
      await loadApplicablePrice({
        workspaceId,
        dossierId,
        articleId,
      }).unwrap();
    } catch {
      // L'état RTK Query est présenté de façon compacte dans la carte.
    }
  }

  const applicable = applicablePriceQuery.data;

  const showResult = selectedArticleId !== NONE;

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
        <Select
          items={[
            { value: NONE, label: 'Sélectionner' },
            ...visibleArticles.map((article) => ({
              value: article.id,
              label: article.supplierName + ' · ' + article.supplierReference,
            })),
          ]}
          onValueChange={chooseArticle}
          value={selectedArticleId}
        >
          <SelectTrigger aria-label="Article fournisseur à vérifier">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Sélectionner</SelectItem>
            {visibleArticles.map((article) => (
              <SelectItem key={article.id} value={article.id}>
                {article.supplierName} · {article.supplierReference}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                ? formatPrice(applicable.price)
                : 'Aucun prix applicable'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Source : {getPricingSourceLabel(applicable.resolvedSource)}
              {applicable.fallbackApplied ? ' · source de remplacement' : ''}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

export { DossierApplicablePriceCard };
