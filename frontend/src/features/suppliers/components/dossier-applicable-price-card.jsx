import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

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
  const [resultVisible, setResultVisible] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchButtonRef = useRef(null);
  const returnFocusToButtonRef = useRef(false);
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
    setResultVisible(Boolean(article));
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
      // L'état RTK Query est présenté dans le panneau contextuel.
    }
  }

  const applicable = applicablePriceQuery.data;

  const showResult = Boolean(selectedArticle) && resultVisible;

  useEffect(() => {
    if (searchExpanded) {
      searchInputRef.current?.focus();
    } else if (returnFocusToButtonRef.current) {
      searchButtonRef.current?.focus();
      returnFocusToButtonRef.current = false;
    }
  }, [searchExpanded]);

  useEffect(() => {
    if (!searchExpanded) return undefined;

    function onOutsidePointer(event) {
      // Les suggestions de l'Article sont rendues dans un Portal.
      if (
        searchContainerRef.current?.contains(event.target)
        || event.target.closest?.('[data-supplier-article-suggestions]')
      ) return;
      setResultVisible(false);
      setSearchExpanded(false);
    }

    function onEscape(event) {
      if (event.key !== 'Escape') return;
      if (showResult) {
        setResultVisible(false);
      } else {
        returnFocusToButtonRef.current = true;
        setSearchExpanded(false);
      }
    }

    document.addEventListener('pointerdown', onOutsidePointer);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onOutsidePointer);
      document.removeEventListener('keydown', onEscape);
    };
  }, [searchExpanded, showResult]);

  return (
    <div
      data-slot="dossier-price-search"
      className={[
        'relative h-10 shrink-0 rounded-md border border-input bg-background shadow-xs',
        'transition-[width] duration-300 ease-out motion-reduce:transition-none',
        'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20',
        searchExpanded ? 'w-[min(22rem,calc(100vw-3rem))]' : 'w-10',
      ].join(' ')}
      ref={searchContainerRef}
      onFocusCapture={(event) => {
        if (selectedArticle && event.target.getAttribute('role') === 'combobox') {
          setResultVisible(true);
        }
      }}
      onKeyDownCapture={(event) => {
        if (event.key === 'Escape' && selectedArticle) setResultVisible(false);
      }}
    >
      <div className="h-full overflow-hidden rounded-[inherit]">
        <div
          aria-hidden={!searchExpanded}
          className={[
            'w-[min(22rem,calc(100vw-3rem))]',
            'transition-opacity duration-300 ease-out motion-reduce:transition-none',
            searchExpanded ? 'opacity-100' : 'pointer-events-none opacity-0',
          ].join(' ')}
          inert={!searchExpanded}
        >
          <SupplierArticleSearchAutocomplete
            ariaLabel="Article fournisseur à vérifier"
            fallbackArticles={fallbackArticles}
            inputGroupClassName="h-10 min-h-10 border-0 shadow-none focus-within:border-0 focus-within:ring-0"
            inputRef={searchInputRef}
            onSelect={chooseArticle}
            placeholder="Rechercher le prix d'un article"
            selectedArticle={selectedArticle}
            serverSearch={can(SUPPLIER_PERMISSION.ARTICLE_READ)}
            workspaceId={workspaceId}
          />
        </div>
      </div>
      {!searchExpanded && (
        <Button
          aria-label="Rechercher un Article fournisseur"
          className="absolute inset-0 h-full w-full rounded-[inherit]"
          onClick={() => setSearchExpanded(true)}
          ref={searchButtonRef}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Search aria-hidden="true" className="size-4" />
        </Button>
      )}
      {showResult && (
        <section
          aria-label="Résultat du prix applicable"
          aria-live="polite"
          className="absolute left-0 top-full z-[var(--layer-flyout)] mt-2 w-[min(26rem,calc(100vw-2rem))] rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Prix applicable</h2>
              <InfoTooltip
                content="Prix que l’application utiliserait dans ce Dossier selon la politique de prix définie."
                label="À propos de la vérification du prix applicable"
              />
            </div>
            <Button
              aria-label="Fermer le résultat du prix applicable"
              className="size-7 shrink-0"
              onClick={() => setResultVisible(false)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </div>
          {applicablePriceQuery.isFetching ? (
            <p className="text-sm text-muted-foreground">Vérification du prix…</p>
          ) : applicablePriceQuery.isError ? (
            <p className="text-sm text-destructive">
              Le prix applicable n’a pas pu être déterminé.
            </p>
          ) : applicable ? (
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
                  pricingMetadataQuery.data?.applicablePriceSources,
                  applicable.resolvedSource,
                )}
              </p>
              {applicable.price?.validityStatus === 'EXPIRED' && (
                <p className="mt-2 text-xs font-medium text-warning" role="note">
                  Dernier prix connu — tarif expiré, à confirmer auprès du fournisseur.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun résultat reçu pour cet Article.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export { DossierApplicablePriceCard };
