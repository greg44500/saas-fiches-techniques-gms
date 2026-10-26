import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ARTICLE_MODES = Object.freeze([
  { value: 'all', label: 'Tous les articles' },
  { value: 'favorites', label: 'Favoris' },
]);

/**
 * Filtre M-003 : animation du curseur identique à la recherche de Produits
 * des Fiches M-004, sans modifier le composant segmenté générique du Core.
 */
function DossierSupplierArticleToolbar({
  favoriteCount,
  onFilterChange,
  onSearchChange,
  search,
  selectedFilter,
  showFavoriteFilter,
}) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const buttonRef = useRef(null);
  const restoreButtonFocusRef = useRef(false);
  const selectedIndex = selectedFilter === 'favorites' ? 1 : 0;

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus();
    } else if (restoreButtonFocusRef.current) {
      buttonRef.current?.focus();
      restoreButtonFocusRef.current = false;
    }
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return undefined;

    function handleOutsidePointer(event) {
      if (containerRef.current?.contains(event.target) || search.trim()) return;
      setExpanded(false);
    }

    document.addEventListener('pointerdown', handleOutsidePointer);
    return () => document.removeEventListener('pointerdown', handleOutsidePointer);
  }, [expanded, search]);

  function handleEscape(event) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();

    if (search.trim()) {
      onSearchChange('');
      return;
    }

    restoreButtonFocusRef.current = true;
    setExpanded(false);
  }

  return (
    <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
      {showFavoriteFilter && (
        <div
          aria-label="Filtrer les Articles fournisseur"
          className="relative grid h-10 w-fit shrink-0 grid-cols-2 rounded-lg border border-border bg-muted/40 p-1"
          role="group"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1 left-1 top-1 w-[calc((100%-0.5rem)/2)] rounded-md bg-primary/15 shadow-sm ring-1 ring-primary/25 transition-transform duration-200 ease-out motion-reduce:transition-none"
            data-slot="article-filter-indicator"
            style={{ transform: 'translateX(' + selectedIndex * 100 + '%)' }}
          />
          {ARTICLE_MODES.map((mode) => (
            <button
              aria-pressed={selectedFilter === mode.value}
              className={[
                'relative z-10 min-w-0 rounded-md px-3 text-sm font-medium transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selectedFilter === mode.value
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
              key={mode.value}
              onClick={() => onFilterChange(mode.value)}
              type="button"
            >
              {mode.value === 'favorites' ? 'Favoris (' + favoriteCount + ')' : mode.label}
            </button>
          ))}
        </div>
      )}
      <div
        className={[
          'relative h-10 shrink-0 rounded-md border border-input bg-background shadow-xs sm:ml-auto',
          'transition-[width] duration-300 ease-out motion-reduce:transition-none',
          'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20',
          expanded ? 'w-[min(22rem,calc(100vw-3rem))]' : 'w-10',
        ].join(' ')}
        data-slot="dossier-article-search"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget) && !search.trim()) {
            setExpanded(false);
          }
        }}
        onKeyDown={handleEscape}
        ref={containerRef}
        role="search"
        aria-label="Recherche d'Articles fournisseur"
      >
        <div className="h-full overflow-hidden rounded-[inherit]">
          <div
            aria-hidden={!expanded}
            className={[
              'relative h-10 w-[min(22rem,calc(100vw-3rem))]',
              'transition-opacity duration-300 ease-out motion-reduce:transition-none',
              expanded ? 'opacity-100' : 'pointer-events-none opacity-0',
            ].join(' ')}
            inert={!expanded}
          >
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
            />
            <Input
              aria-label="Rechercher un Article fournisseur"
              className="h-10 border-0 bg-transparent pl-10 pr-3 shadow-none focus-visible:ring-0"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Rechercher un article fournisseur…"
              ref={inputRef}
              type="search"
              value={search}
            />
          </div>
        </div>
        {!expanded && (
          <Button
            aria-expanded={false}
            aria-label="Ouvrir la recherche d'Articles fournisseur"
            className="absolute inset-0 h-full w-full rounded-[inherit]"
            onClick={() => setExpanded(true)}
            ref={buttonRef}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Search aria-hidden="true" className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export { DossierSupplierArticleToolbar };
