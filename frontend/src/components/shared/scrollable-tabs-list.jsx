import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { TabsList } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const SCROLL_TOLERANCE = 1;

function ScrollableTabsList({
  activeValue,
  children,
  className,
  ...props
}) {
  const viewportRef = useRef(null);
  const listRef = useRef(null);
  const [scrollState, setScrollState] = useState({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
  });

  const updateScrollState = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    setScrollState({
      hasOverflow: maxScroll > SCROLL_TOLERANCE,
      canScrollLeft: viewport.scrollLeft > SCROLL_TOLERANCE,
      canScrollRight: viewport.scrollLeft < maxScroll - SCROLL_TOLERANCE,
    });
  }, []);

  const scrollToPosition = useCallback((left, behavior = 'auto') => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    viewport.scrollTo({
      left: Math.max(0, Math.min(left, maxScroll)),
      behavior,
    });
  }, []);

  const revealTab = useCallback((tab) => {
    const viewport = viewportRef.current;
    if (!viewport || !tab) return;

    const visibleBounds = viewport.getBoundingClientRect();
    const tabBounds = tab.getBoundingClientRect();
    if (tabBounds.left < visibleBounds.left - SCROLL_TOLERANCE) {
      scrollToPosition(viewport.scrollLeft + tabBounds.left - visibleBounds.left);
    } else if (tabBounds.right > visibleBounds.right + SCROLL_TOLERANCE) {
      scrollToPosition(viewport.scrollLeft + tabBounds.right - visibleBounds.right);
    }
  }, [scrollToPosition]);

  const scrollToHiddenTab = (direction) => {
    const viewport = viewportRef.current;
    const list = listRef.current;
    if (!viewport || !list) return;

    const viewportBounds = viewport.getBoundingClientRect();
    const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
    const orderedTabs = direction === 'right' ? tabs : tabs.reverse();
    const hiddenTab = orderedTabs.find((tab) => {
      const bounds = tab.getBoundingClientRect();
      return direction === 'right'
        ? bounds.right > viewportBounds.right + SCROLL_TOLERANCE
        : bounds.left < viewportBounds.left - SCROLL_TOLERANCE;
    });

    const bounds = hiddenTab?.getBoundingClientRect();
    const delta = bounds
      ? direction === 'right'
        ? bounds.right - viewportBounds.right
        : bounds.left - viewportBounds.left
      : (direction === 'right' ? 1 : -1) * viewport.clientWidth;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    scrollToPosition(viewport.scrollLeft + delta, reducedMotion ? 'auto' : 'smooth');
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    const list = listRef.current;
    if (!viewport || !list) return undefined;

    updateScrollState();

    // Le catalogue peut changer après un chargement ou une mise à jour des droits.
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateScrollState);
    observer?.observe(viewport);
    observer?.observe(list);
    window.addEventListener('resize', updateScrollState);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  useEffect(() => {
    const activeTab = listRef.current?.querySelector('[role="tab"][aria-selected="true"]');
    revealTab(activeTab);
  }, [activeValue, revealTab]);

  const { hasOverflow, canScrollLeft, canScrollRight } = scrollState;

  return (
    <div className="flex min-w-0 items-center gap-1 border-b border-border">
      {hasOverflow ? (
        <button
          aria-label="Faire défiler les onglets vers la gauche"
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-35 disabled:hover:bg-transparent"
          disabled={!canScrollLeft}
          onClick={() => scrollToHiddenTab('left')}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
      ) : null}
      <div
        className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onFocusCapture={(event) => {
          if (event.target.matches('[role="tab"]')) revealTab(event.target);
        }}
        onScroll={updateScrollState}
        ref={viewportRef}
      >
        <TabsList
          className={cn('w-max min-w-full overflow-visible border-b-0', className)}
          ref={listRef}
          variant="section"
          {...props}
        >
          {children}
        </TabsList>
      </div>
      {hasOverflow ? (
        <button
          aria-label="Faire défiler les onglets vers la droite"
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-35 disabled:hover:bg-transparent"
          disabled={!canScrollRight}
          onClick={() => scrollToHiddenTab('right')}
          type="button"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

export { ScrollableTabsList };
