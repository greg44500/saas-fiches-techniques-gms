import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  Autocomplete,
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
import { Button } from '@/components/ui/button';
import {
  useListTechnicalSheetRangesQuery,
} from '@/features/technical-sheets/api/technical-sheets-api';

const SEARCH_MIN_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 8;

/**
 * Recherche prédictive métier : le référentiel reste interrogé côté serveur,
 * le panneau utilise les primitives Autocomplete communes et le champ prend
 * la largeur disponible uniquement après activation de la loupe.
 */
function TechnicalSheetRangeSearch({ workspaceId, onSearchChange, status }) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState('');
  const [debounced, setDebounced] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    const normalized = value.trim();
    if (normalized.length < SEARCH_MIN_LENGTH) {
      setDebounced('');
      onSearchChange('');
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      setDebounced(normalized);
      onSearchChange(normalized);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [value, onSearchChange]);

  const ready = debounced.length >= SEARCH_MIN_LENGTH;
  const suggestionsQuery = useListTechnicalSheetRangesQuery({
    workspaceId,
    page: 1,
    limit: SEARCH_LIMIT,
    search: ready ? debounced : undefined,
    status: status || undefined,
  }, { skip: !expanded || !ready });

  const suggestions = ready ? (suggestionsQuery.data?.ranges ?? []) : [];

  function closeSearch() {
    setValue('');
    setDebounced('');
    onSearchChange('');
    setExpanded(false);
  }

  return (
    <div
      className={[
        'relative h-10 shrink-0 transition-[width] duration-300 ease-out',
        'motion-reduce:transition-none',
        expanded ? 'w-64 sm:w-72' : 'w-10',
      ].join(' ')}
    >
      {!expanded ? (
        <Button
          aria-label="Ouvrir la recherche de gammes"
          onClick={() => setExpanded(true)}
          size="icon"
          title="Rechercher une gamme"
          type="button"
          variant="outline"
        >
          <Search aria-hidden="true" className="size-4" />
        </Button>
      ) : (
        <Autocomplete
          autoHighlight
          filter={null}
          items={suggestions}
          itemToStringValue={(range) => range.name}
          limit={SEARCH_LIMIT}
          onValueChange={setValue}
          value={value}
        >
          <AutocompleteInputGroup className="h-10 min-h-10">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
            />
            <AutocompleteInput
              aria-label="Rechercher une gamme"
              className="h-10 pr-9"
              maxLength={100}
              onKeyDown={(event) => {
                if (event.key === 'Escape') closeSearch();
              }}
              placeholder="Rechercher une gamme…"
              ref={inputRef}
            />
            <Button
              aria-label="Fermer la recherche de gammes"
              className="absolute right-1 top-1 size-8"
              onClick={closeSearch}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </AutocompleteInputGroup>
          <AutocompletePortal>
            <AutocompletePositioner>
              <AutocompletePopup>
                <AutocompleteStatus>
                  {suggestionsQuery.isFetching
                    ? 'Recherche en cours'
                    : suggestions.length + ' gamme(s) proposées'}
                </AutocompleteStatus>
                <AutocompleteEmpty>
                  {suggestionsQuery.isError
                    ? 'La recherche est momentanément indisponible.'
                    : value.trim().length < SEARCH_MIN_LENGTH
                      ? 'Saisissez au moins deux caractères.'
                      : suggestionsQuery.isFetching
                        ? 'Recherche des gammes…'
                        : 'Aucune gamme correspondante.'}
                </AutocompleteEmpty>
                <AutocompleteList>
                  {(range, index) => (
                    <AutocompleteItem
                      index={index}
                      key={range.id}
                      onClick={() => {
                        setValue(range.name);
                        onSearchChange(range.name);
                      }}
                      value={range}
                    >
                      <span className="font-medium">{range.name}</span>
                      {range.status === 'ARCHIVED' && (
                        <span className="text-xs text-muted-foreground">
                          Archivée
                        </span>
                      )}
                    </AutocompleteItem>
                  )}
                </AutocompleteList>
              </AutocompletePopup>
            </AutocompletePositioner>
          </AutocompletePortal>
        </Autocomplete>
      )}
    </div>
  );
}

export {
  SEARCH_DEBOUNCE_MS,
  SEARCH_LIMIT,
  SEARCH_MIN_LENGTH,
  TechnicalSheetRangeSearch,
};
