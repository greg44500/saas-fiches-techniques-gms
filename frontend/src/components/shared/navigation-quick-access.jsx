import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

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

function normalizeNavigationQuickAccessText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr')
    .trim();
}

function searchNavigationQuickAccessItems(items, query, limit = 6) {
  const normalizedQuery = normalizeNavigationQuickAccessText(query);

  if (!normalizedQuery) return items.slice(0, limit);

  return items
    .map((item) => {
      const label = normalizeNavigationQuickAccessText(item.label);
      const groupLabel = normalizeNavigationQuickAccessText(item.groupLabel);

      let score = 0;
      if (label === normalizedQuery) score = 4;
      else if (label.startsWith(normalizedQuery)) score = 3;
      else if (label.includes(normalizedQuery)) score = 2;
      else if (groupLabel.includes(normalizedQuery)) score = 1;

      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => (
      right.score - left.score
      || left.item.label.localeCompare(right.item.label, 'fr')
    ))
    .slice(0, limit)
    .map(({ item }) => item);
}

function NavigationQuickAccess({
  ariaLabel,
  emptyLabel = 'Aucune vue disponible.',
  items,
  noResultsLabel = 'Aucune vue autorisée ne correspond à cette recherche.',
  onSelect,
  placeholder = 'Accéder à une vue…',
  sectionLabel = 'Vues autorisées',
}) {
  const [query, setQuery] = useState('');
  const suggestions = useMemo(
    () => searchNavigationQuickAccessItems(items, query),
    [items, query],
  );

  return (
    <div aria-label={ariaLabel} className="w-48 md:w-64 lg:w-72" role="search">
      <Autocomplete
        autoHighlight
        filter={null}
        items={suggestions}
        itemToStringValue={(item) => item.label}
        limit={6}
        onValueChange={setQuery}
        value={query}
      >
        <AutocompleteInputGroup className="min-h-10">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
          />
          <AutocompleteInput
            aria-label={ariaLabel}
            className="h-10"
            placeholder={placeholder}
          />
          <AutocompleteClear aria-label="Effacer l’accès rapide">
            <X aria-hidden="true" className="size-4" />
          </AutocompleteClear>
        </AutocompleteInputGroup>

        <AutocompletePortal>
          <AutocompletePositioner>
            <AutocompletePopup>
              <div className="border-b border-border bg-muted/35 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {sectionLabel}
                </p>
              </div>
              <AutocompleteStatus>
                {suggestions.length} vue(s) proposée(s)
              </AutocompleteStatus>
              <AutocompleteEmpty>
                {query.trim() ? noResultsLabel : emptyLabel}
              </AutocompleteEmpty>
              <AutocompleteList>
                {(item, index) => (
                  <AutocompleteItem
                    index={index}
                    key={item.id}
                    onClick={() => {
                      setQuery('');
                      onSelect(item);
                    }}
                    value={item}
                  >
                    <span className="font-medium">{item.label}</span>
                    {item.groupLabel ? (
                      <span className="text-xs text-muted-foreground">
                        {item.groupLabel}
                      </span>
                    ) : null}
                  </AutocompleteItem>
                )}
              </AutocompleteList>
            </AutocompletePopup>
          </AutocompletePositioner>
        </AutocompletePortal>
      </Autocomplete>
    </div>
  );
}

export {
  NavigationQuickAccess,
  normalizeNavigationQuickAccessText,
  searchNavigationQuickAccessItems,
};
