import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  useListSupplierArticlesQuery,
} from '@/features/suppliers/api/supplier-api';
import {
  getSupplierArticleChoiceLabel,
  getSupplierArticleDetails,
  getSupplierArticleTitle,
  matchSupplierArticle,
} from '@/features/suppliers/lib/supplier-article-choice';

const SEARCH_MIN_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 10;

/**
 * Recherche contrôlée d'Articles fournisseurs. Le panneau est rendu dans un
 * Portal : il ne change ni la hauteur d'une carte ni celle d'une modale.
 * La requête serveur reste autorisée par le RBAC et la tenancy de M-003.
 */
function SupplierArticleSearchAutocomplete({
  ariaLabel,
  excludedIds = [],
  fallbackArticles = [],
  onSelect,
  placeholder = 'Rechercher un Article fournisseur…',
  selectedArticle = null,
  serverSearch = true,
  workspaceId,
}) {
  const [search, setSearch] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const ignoreExternalReset = useRef(false);

  useEffect(() => {
    if (ignoreExternalReset.current) {
      ignoreExternalReset.current = false;
      return;
    }
    setSearch(selectedArticle
      ? getSupplierArticleChoiceLabel(selectedArticle)
      : '');
    setDebouncedQuery('');
  }, [selectedArticle]);

  useEffect(() => {
    const term = search.trim();
    if (selectedArticle || term.length < SEARCH_MIN_LENGTH) {
      setDebouncedQuery('');
      return undefined;
    }
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(term);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [search, selectedArticle]);

  const term = search.trim();
  const ready = !selectedArticle
    && term.length >= SEARCH_MIN_LENGTH
    && debouncedQuery === term;
  const articleQuery = useListSupplierArticlesQuery(
    {
      workspaceId,
      search: debouncedQuery || undefined,
      status: 'ACTIVE',
      page: 1,
      limit: SEARCH_LIMIT,
    },
    {
      skip: !serverSearch || !workspaceId || !ready,
    },
  );

  const excludedSet = useMemo(
    () => new Set(excludedIds),
    [excludedIds],
  );
  const suggestions = useMemo(() => {
    if (!ready) return [];
    const articles = serverSearch
      ? articleQuery.data?.articles ?? []
      : fallbackArticles.filter((article) => matchSupplierArticle(article, term));
    return articles.filter((article) => !excludedSet.has(article.id))
      .slice(0, SEARCH_LIMIT);
  }, [
    articleQuery.data?.articles,
    excludedSet,
    fallbackArticles,
    ready,
    serverSearch,
    term,
  ]);

  function updateSearch(nextValue, eventDetails) {
    // Fermer les suggestions avec Échap ne retire pas l'Article déjà choisi.
    // Base UI émet aussi onValueChange lors de cette touche.
    if (selectedArticle && eventDetails?.reason === 'escape-key') {
      eventDetails.cancel();
      return;
    }

    setSearch(nextValue);
    if (selectedArticle && nextValue !== getSupplierArticleChoiceLabel(selectedArticle)) {
      ignoreExternalReset.current = true;
      onSelect(null);
    }
  }

  function choose(article) {
    setSearch(getSupplierArticleChoiceLabel(article));
    setDebouncedQuery('');
    onSelect(article);
  }

  const loading = serverSearch && ready && articleQuery.isFetching;
  const error = serverSearch && ready && articleQuery.isError;

  return (
    <Autocomplete
      autoHighlight
      filter={null}
      items={suggestions}
      itemToStringValue={getSupplierArticleChoiceLabel}
      limit={SEARCH_LIMIT}
      onValueChange={updateSearch}
      value={search}
    >
      <AutocompleteInputGroup className="h-10 min-h-10">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
        />
        <AutocompleteInput
          aria-label={ariaLabel}
          className="h-10"
          maxLength={120}
          placeholder={placeholder}
        />
        <AutocompleteClear aria-label="Effacer l’Article sélectionné">
          <X aria-hidden="true" className="size-4" />
        </AutocompleteClear>
      </AutocompleteInputGroup>
      <AutocompletePortal>
        <AutocompletePositioner className="z-[calc(var(--layer-modal)_+_1)]">
          <AutocompletePopup>
            <AutocompleteStatus>
              {loading
                ? 'Recherche des Articles en cours'
                : suggestions.length + ' Article(s) proposé(s)'}
            </AutocompleteStatus>
            <AutocompleteEmpty>
              {error
                ? 'La recherche des Articles est indisponible.'
                : loading
                  ? 'Recherche des Articles…'
                  : term.length < SEARCH_MIN_LENGTH
                    ? 'Saisissez au moins 3 caractères.'
                    : ready
                      ? 'Aucun Article ne correspond à cette recherche.'
                      : 'Recherche des Articles…'}
            </AutocompleteEmpty>
            {serverSearch
            && articleQuery.data?.pagination?.total > SEARCH_LIMIT && (
              <p className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                Affinez la recherche pour afficher d’autres Articles.
              </p>
            )}
            <AutocompleteList className="max-h-64">
              {(article, index) => (
                <AutocompleteItem
                  aria-label={getSupplierArticleChoiceLabel(article)}
                  index={index}
                  key={article.id}
                  onClick={() => choose(article)}
                  value={article}
                >
                  <span className="font-medium">
                    {getSupplierArticleTitle(article)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getSupplierArticleDetails(article)}
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
  SEARCH_DEBOUNCE_MS,
  SEARCH_LIMIT,
  SEARCH_MIN_LENGTH,
  SupplierArticleSearchAutocomplete,
};
