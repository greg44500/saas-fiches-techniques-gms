import { Check } from 'lucide-react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Étapes propres aux trois parcours métier Produits / Articles / Catalogues.
const IMPORT_STEPS = Object.freeze([
  { key: 'upload', label: 'Choisir' },
  { key: 'mapping', label: 'Associer' },
  { key: 'preview', label: 'Vérifier' },
  { key: 'done', label: 'Terminer' },
]);

function ImportWizardHeader({ title, helpText, step }) {
  const currentIndex = Math.max(
    0,
    IMPORT_STEPS.findIndex(({ key }) => key === step),
  );

  return (
    <>
      <DialogHeader>
        <div className="flex min-w-0 items-center gap-2">
          <DialogTitle>{title}</DialogTitle>
          <InfoTooltip content={helpText} label={'À propos de « ' + title + ' »'} />
        </div>
      </DialogHeader>
      <nav aria-label="Progression de l’import" className="mt-5 min-w-0">
        <ol className="grid grid-cols-4 gap-1 sm:gap-3">
          {IMPORT_STEPS.map(({ key, label }, index) => {
            const active = index === currentIndex;
            const completed = index < currentIndex;

            return (
              <li
                aria-current={active ? 'step' : undefined}
                className="flex min-w-0 flex-col items-center gap-1.5 text-center"
                key={key}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold',
                    active && 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-popover',
                    completed && 'border-success/50 bg-success/10 text-success',
                    !active && !completed && 'border-border bg-muted/40 text-muted-foreground',
                  )}
                >
                  {completed ? <Check className="size-5" /> : index + 1}
                </span>
                <span
                  className={cn(
                    'w-full text-xs leading-tight sm:text-sm',
                    active && 'font-bold text-primary',
                    completed && 'font-medium text-foreground',
                    !active && !completed && 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
                <span className="sr-only">
                  {active ? 'Étape en cours' : completed ? 'Étape terminée' : 'Étape à venir'}
                </span>
              </li>
            );
          })}
        </ol>
        <p aria-live="polite" className="sr-only">
          Étape {currentIndex + 1} sur {IMPORT_STEPS.length} : {IMPORT_STEPS[currentIndex].label}
        </p>
      </nav>
    </>
  );
}

export { IMPORT_STEPS, ImportWizardHeader };
