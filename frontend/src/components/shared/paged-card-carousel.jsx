import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Défilement horizontal carte par carte, avec snap et pagination serveur.
 * La navigation est fluide ; les groupes suivants sont chargés à la demande.
 */
function PagedCardCarousel({
  children,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  disabled = false,
  label = 'Cartes',
}) {
  const viewportRef = useRef(null);
  const [index, setIndex] = useState(0);
  const items = Array.isArray(children) ? children : [children];
  const count = items.filter(Boolean).length;

  useEffect(() => {
    setIndex(0);
    viewportRef.current?.scrollTo({ left: 0, behavior: 'instant' });
  }, [page]);

  function move(direction) {
    if (disabled) return;
    const next = index + direction;
    if (next < 0) {
      if (page > 1) onPageChange(page - 1);
      return;
    }
    if (next >= count) {
      if (page < totalPages) onPageChange(page + 1);
      return;
    }
    setIndex(next);
    const node = viewportRef.current;
    const target = node?.children[next];
    if (node && target) {
      node.scrollTo({
        left: target.offsetLeft - node.offsetLeft,
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
    }
  }

  const overallIndex = (page - 1) * pageSize + index + 1;

  return (
    <div className="space-y-4">
      <div
        aria-label={label}
        className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ref={viewportRef}
        role="region"
      >
        {items.map((item, itemIndex) => (
          <div
            className="relative w-full shrink-0 snap-start md:w-[calc((100%-1rem)/2)] xl:w-[calc((100%-2rem)/3)]"
            key={item?.key ?? itemIndex}
          >
            {item}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {total > 0 ? overallIndex : 0} sur {total}
        </p>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Cartes précédentes"
            disabled={disabled || (page <= 1 && index === 0)}
            onClick={() => move(-1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label="Cartes suivantes"
            disabled={disabled || (page >= totalPages && index >= count - 1)}
            onClick={() => move(1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export { PagedCardCarousel };
