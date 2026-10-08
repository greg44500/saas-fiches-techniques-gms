import { useState } from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Carte réversible générique : aucune connaissance des données métier.
 * Les deux faces partagent un gabarit ; seule la face visible est interactive.
 */
function FlippableCard({
  front,
  back,
  backAction,
  frontAction,
  title,
  className,
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className={cn('group relative min-w-0 [perspective:1200px]', className)}>
      <div
        className={cn(
          'relative min-h-[18rem] w-full rounded-xl transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none',
          flipped && '[transform:rotateY(180deg)]',
        )}
      >
        <section
          aria-hidden={flipped}
          className="absolute inset-0 flex flex-col overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm [backface-visibility:hidden]"
          inert={flipped}
        >
          <div className="min-h-0 flex-1">{front}</div>
          <div className="mt-3 flex items-center gap-2">
            {frontAction && <div className="flex shrink-0 items-center">{frontAction}</div>}
            <Button
              aria-label={`Afficher les détails de ${title}`}
              className="min-w-0 flex-1"
              onClick={() => setFlipped(true)}
              type="button"
              variant="outline"
            >
              <RotateCw aria-hidden="true" className="size-4" />
              Détails
            </Button>
          </div>
        </section>
        <section
          aria-hidden={!flipped}
          className="absolute inset-0 flex flex-col overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]"
          inert={!flipped}
        >
          <div className="min-h-0 flex-1">{back}</div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              aria-label={`Revenir à ${title}`}
              className="min-w-0 flex-1"
              onClick={() => setFlipped(false)}
              type="button"
              variant="outline"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Retour
            </Button>
            {backAction && <div className="flex shrink-0 items-center">{backAction}</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

export { FlippableCard };
