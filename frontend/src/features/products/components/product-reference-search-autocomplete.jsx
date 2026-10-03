import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  Autocomplete,
  AutocompleteClear,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteInputGroup,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
  AutocompletePortal,
  AutocompletePositioner,
  AutocompleteStatus,
} from '@/components/ui/autocomplete';
import {
  useListProductReferenceProductsQuery,
} from '@/features/products/api/product-reference-api';
import {
  PRODUCT_SEARCH_AUTOCOMPLETE_DEBOUNCE_MS,
  PRODUCT_SEARCH_AUTOCOMPLETE_LIMIT,
  PRODUCT_SEARCH_AUTOCOMPLETE_MIN_LENGTH,
} from '@/features/products/components/product-search-autocomplete';
import {
  getConservationTypeLabel,
  getVariantLabel,
} from '@/features/products/lib/product-presentation';

function buildSuggestions(products = []) {
  return products
    .flatMap((product) => {
      const variants = product.variants ?? [];

      if (variants.length === 0) {
        return [{
          key: 'product:' + product.id,
          product,
          variant: null,
        }];
      }

      return variants.map((variant) => ({
        key: 'variant:' + variant.id,
        product,
        variant,
      }));
    })
    .slice(0, PRODUCT_SEARCH_AUTOCOMPLETE_LIMIT);
}

function ProductReferenceSearchAutocomplete({
  categoryId,
  metadata,
  onSelect,
  onValueChange,
  status,
  value,
}) {
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const normalizedQuery = value.trim();

    if (normalizedQuery.length < PRODUCT_SEARCH_AUTOCOMPLETE_MIN_LENGTH) {
      setDebouncedQuery('');
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(normalizedQuery);
    }, PRODUCT_SEARCH_AUTOCOMPLETE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [value]);

  const suggestionsQuery = useListProductReferenceProductsQuery(
    {
      status,
      categoryId,
      q: debouncedQuery || undefined,
      page: 1,
      limit: PRODUCT_SEARCH_AUTOCOMPLETE_LIMIT,
    },
    {
      skip: debouncedQuery.length < PRODUCT_SEARCH_AUTOCOMPLETE_MIN_LENGTH,
    },
  );

  const suggestions = useMemo(
    () => (
      debouncedQuery.length < PRODUCT_SEARCH_AUTOCOMPLETE_MIN_LENGTH
        ? []
        : buildSuggestions(suggestionsQuery.data?.products)
    ),
    [debouncedQuery.length, suggestionsQuery.data?.products],
  );

  const normalizedValue = value.trim();
  const waitingForMinimum = (
    normalizedValue.length > 0
    && normalizedValue.length < PRODUCT_SEARCH_AUTOCOMPLETE_MIN_LENGTH
  );

  function selectSuggestion(result) {
    const nextSearch = result.variant
      ? getVariantLabel(result.variant)
      : result.product.name;

    onValueChange(nextSearch);
    onSelect(result, nextSearch);
  }

  return (
    <Autocomplete
      autoHighlight
      filter={null}
      items={suggestions}
      itemToStringValue={(result) => (
        result.variant
          ? getVariantLabel(result.variant)
          : result.product.name
      )}
      limit={PRODUCT_SEARCH_AUTOCOMPLETE_LIMIT}
      onValueChange={onValueChange}
      value={value}
    >
      <AutocompleteInputGroup className="h-10 min-h-10">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
        />
        <AutocompleteInput
          aria-label="Rechercher un Produit global"
          className="h-10"
          maxLength={120}
          placeholder="Rechercher un produit…"
        />
        <AutocompleteClear aria-label="Effacer la recherche">
          <X aria-hidden="true" className="size-4" />
        </AutocompleteClear>
      </AutocompleteInputGroup>

      <AutocompletePortal>
        <AutocompletePositioner className="z-[calc(var(--layer-modal)_+_1)]">
          <AutocompletePopup className="border-primary/25 bg-popover/95 shadow-2xl ring-1 ring-foreground/5 backdrop-blur-md">
            <div className="border-b border-border bg-muted/35 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Suggestions du référentiel
              </p>
            </div>

            <AutocompleteStatus>
              {suggestionsQuery.isFetching
                ? 'Recherche dans le référentiel en cours'
                : suggestions.length + ' résultat(s) proposé(s)'}
            </AutocompleteStatus>

            <AutocompleteEmpty>
              {suggestionsQuery.isFetching
                ? 'Recherche des Produits…'
                : suggestionsQuery.isError
                  ? 'La recherche prédictive est temporairement indisponible.'
                  : waitingForMinimum
                    ? 'Saisissez au moins 3 caractères.'
                    : normalizedValue.length === 0
                      ? 'Commencez à saisir un produit ou une référence.'
                      : 'Aucun Produit ou Référence ne correspond à cette recherche.'}
            </AutocompleteEmpty>

            <AutocompleteList>
              {(result, index) => {
                const referenceLabel = result.variant
                  ? getVariantLabel(result.variant)
                  : result.product.name;
                const details = [
                  result.variant
                  && referenceLabel !== result.product.name
                    ? result.product.name
                    : null,
                  result.product.category?.name,
                  result.variant?.conservationType
                    ? getConservationTypeLabel(
                        metadata,
                        result.variant.conservationType,
                      )
                    : null,
                  result.variant ? 'Référence Produit' : 'Produit',
                ].filter(Boolean);

                return (
                  <AutocompleteItem
                    aria-label={[
                      referenceLabel,
                      ...details,
                    ].join('. ')}
                    className="border-b border-border/50 last:border-b-0 data-highlighted:bg-accent/70"
                    index={index}
                    key={result.key}
                    onClick={() => selectSuggestion(result)}
                    value={result}
                  >
                    <span className="font-medium">{referenceLabel}</span>
                    <span className="text-xs text-muted-foreground">
                      {details.join(' · ')}
                    </span>
                  </AutocompleteItem>
                );
              }}
            </AutocompleteList>
          </AutocompletePopup>
        </AutocompletePositioner>
      </AutocompletePortal>
    </Autocomplete>
  );
}

export {
  ProductReferenceSearchAutocomplete,
  buildSuggestions,
};
