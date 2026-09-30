import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  APPLICATION_PLATFORM_NAVIGATION,
} from '@/app/application-platform-navigation';
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
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';
import {
  getPlatformQuickAccessItems,
} from '@/features/platform/lib/platform-navigation';

function normalizeQuickAccessText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr')
    .trim();
}

function searchPlatformQuickAccessItems(items, query, limit = 6) {
  const normalizedQuery = normalizeQuickAccessText(query);

  if (!normalizedQuery) {
    return items.slice(0, limit);
  }

  return items
    .map((item) => {
      const label = normalizeQuickAccessText(item.label);
      const groupLabel = normalizeQuickAccessText(item.groupLabel);

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

/**
 * Accès rapide aux vues d'administration réellement autorisées.
 *
 * La recherche reste volontairement limitée aux destinations de navigation :
 * les recherches de données (utilisateurs, workspaces, abonnements ou objets
 * métier) restent dans leurs pages dédiées afin de conserver leurs filtres,
 * permissions et contrats API spécifiques.
 */
function PlatformQuickAccess() {
  const navigate = useNavigate();
  const { data: platformAccess } = useGetCurrentPlatformContextQuery();
  const [query, setQuery] = useState('');

  const items = useMemo(
    () => getPlatformQuickAccessItems(
      platformAccess,
      APPLICATION_PLATFORM_NAVIGATION,
    ),
    [platformAccess],
  );
  const suggestions = useMemo(
    () => searchPlatformQuickAccessItems(items, query),
    [items, query],
  );

  return (
    <div
      aria-label="Accès rapide aux vues d’administration"
      className="w-48 md:w-64 lg:w-72"
      role="search"
    >
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
            aria-label="Accès rapide Platform"
            className="h-10"
            placeholder="Accéder à une vue…"
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
                  Vues autorisées
                </p>
              </div>
              <AutocompleteStatus>
                {suggestions.length} vue(s) proposée(s)
              </AutocompleteStatus>
              <AutocompleteEmpty>
                {query.trim()
                  ? 'Aucune vue autorisée ne correspond à cette recherche.'
                  : 'Aucune vue d’administration disponible.'}
              </AutocompleteEmpty>
              <AutocompleteList>
                {(item, index) => (
                  <AutocompleteItem
                    index={index}
                    key={item.id}
                    onClick={() => {
                      setQuery('');
                      navigate(item.to);
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
  PlatformQuickAccess,
  normalizeQuickAccessText,
  searchPlatformQuickAccessItems,
};
