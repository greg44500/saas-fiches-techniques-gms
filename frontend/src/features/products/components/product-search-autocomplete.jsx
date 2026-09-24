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
  useSearchProductsQuery,
} from '@/features/products/api/product-catalog-api';
import {
  getFoodRangeLabel,
  getFoodRangeName,
  getReferenceLabel,
} from '@/features/products/lib/product-presentation';

const PRODUCT_SEARCH_AUTOCOMPLETE_MIN_LENGTH = 3;
const PRODUCT_SEARCH_AUTOCOMPLETE_DEBOUNCE_MS = 300;
const PRODUCT_SEARCH_AUTOCOMPLETE_LIMIT = 6;

function ProductSearchAutocomplete({
  categoryId,
  conservationType,
  foodRange,
  metadata,
  onSelect,
  onValueChange,
  scope,
  status,
  value,
  workspaceId,
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

  const suggestionsQuery = useSearchProductsQuery(
    {
      workspaceId,
      scope,
      q: debouncedQuery || undefined,
      categoryId,
      status,
      conservationType,
      foodRange,
      sort: 'NAME',
      page: 1,
      limit: PRODUCT_SEARCH_AUTOCOMPLETE_LIMIT,
    },
    {
      skip: debouncedQuery.length < PRODUCT_SEARCH_AUTOCOMPLETE_MIN_LENGTH,
    },
  );

  const suggestions = useMemo(() => {
    if (debouncedQuery.length < PRODUCT_SEARCH_AUTOCOMPLETE_MIN_LENGTH) {
      return [];
    }

    return (suggestionsQuery.data?.results ?? [])
      .slice(0, PRODUCT_SEARCH_AUTOCOMPLETE_LIMIT);
  }, [debouncedQuery.length, suggestionsQuery.data?.results]);

  function selectSuggestion(result) {
    const nextSearch = getReferenceLabel(
      metadata,
      result.product,
      result.variant,
    );

    onValueChange(nextSearch);
    onSelect(result);
  }

  const normalizedValue = value.trim();
  const waitingForMinimum = (
    normalizedValue.length > 0
    && normalizedValue.length < PRODUCT_SEARCH_AUTOCOMPLETE_MIN_LENGTH
  );

  return (
    <Autocomplete
      autoHighlight
      filter={null}
      items={suggestions}
      itemToStringValue={(result) => getReferenceLabel(
        metadata,
        result.product,
        result.variant,
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
          aria-label="Rechercher un Produit"
          className="h-10"
          maxLength={120}
          placeholder="Rechercher un produit…"
        />
        <AutocompleteClear aria-label="Effacer la recherche">
          <X aria-hidden="true" className="size-4" />
        </AutocompleteClear>
      </AutocompleteInputGroup>

      <AutocompletePortal>
        <AutocompletePositioner>
          <AutocompletePopup className="border-primary/25 bg-popover/95 shadow-2xl ring-1 ring-foreground/5 backdrop-blur-md">
            <div className="border-b border-border bg-muted/35 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Suggestions Produits
              </p>
            </div>

            <AutocompleteStatus>
              {suggestionsQuery.isFetching
                ? 'Recherche des Produits en cours'
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
                      ? 'Commencez à saisir un produit.'
                      : 'Aucun Produit ne correspond à cette recherche.'}
            </AutocompleteEmpty>

            <AutocompleteList>
              {(result, index) => (
                <AutocompleteItem
                  aria-label={[
                    getReferenceLabel(metadata, result.product, result.variant),
                    result.product.category?.name,
                    result.variant
                      ? [
                          getFoodRangeLabel(metadata, result.variant.foodRange),
                          getFoodRangeName(metadata, result.variant.foodRange),
                        ].filter(Boolean).join(' ')
                      : 'À enrichir',
                  ].filter(Boolean).join('. ')}
                  className="border-b border-border/50 last:border-b-0 data-highlighted:bg-accent/70"
                  index={index}
                  key={result.variant?.id ?? result.product.id}
                  onClick={() => selectSuggestion(result)}
                  value={result}
                >
                  <span className="font-medium">
                    {getReferenceLabel(metadata, result.product, result.variant)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {[
                      result.product.category?.name,
                      result.variant
                        ? [
                            getFoodRangeLabel(metadata, result.variant.foodRange),
                            getFoodRangeName(metadata, result.variant.foodRange),
                          ].filter(Boolean).join(' · ')
                        : 'Référence à enrichir',
                    ].filter(Boolean).join(' · ')}
                  </span>
                </AutocompleteItem>
              )}
            </AutocompleteList>
          </AutocompletePopup>
        </AutocompletePositioner>
      </AutocompletePortal>
    </Autocomplete>
  );
}

export {
  PRODUCT_SEARCH_AUTOCOMPLETE_DEBOUNCE_MS,
  PRODUCT_SEARCH_AUTOCOMPLETE_LIMIT,
  PRODUCT_SEARCH_AUTOCOMPLETE_MIN_LENGTH,
  ProductSearchAutocomplete,
};
