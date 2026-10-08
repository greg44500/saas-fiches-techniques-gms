import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

/** Navigation serveur par groupes ; le contenu de chaque carte est libre. */
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
  const from = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      <div
        aria-label={label}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {children}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {from}–{to} sur {total}
        </p>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Cartes précédentes"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label="Cartes suivantes"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
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
