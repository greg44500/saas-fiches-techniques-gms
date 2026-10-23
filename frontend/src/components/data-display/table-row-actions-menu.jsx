import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * Menu d'actions des lignes de tableau.
 * Les features fournissent uniquement les actions déjà autorisées et leurs
 * callbacks. Ce composant n'accorde jamais de permission métier.
 */
function TableRowActionsMenu({ actions = [], label }) {
  const [open, setOpen] = useState(false);

  if (actions.length === 0) return null;

  const accessibleLabel = 'Actions de ' + label;

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={(
          <Button
            aria-label={accessibleLabel}
            size="icon"
            type="button"
            variant="ghost"
          />
        )}
      >
        <MoreHorizontal aria-hidden="true" className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <div aria-label={accessibleLabel} className="space-y-0.5" role="group">
          {actions.map(({
            key,
            Icon,
            label: actionLabel,
            destructive = false,
            disabled = false,
            tone = 'neutral',
            onClick,
            to,
          }) => {
            const toneClassName = destructive
              ? 'text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive'
              : tone === 'success'
                ? 'hover:bg-success/15 hover:text-success focus-visible:bg-success/15 focus-visible:text-success'
                : tone === 'warning'
                  ? 'hover:bg-warning/15 hover:text-warning focus-visible:bg-warning/15 focus-visible:text-warning'
                  : '';
            const itemClassName = 'w-full justify-start gap-2 ' + toneClassName;
            const content = (
              <>
                {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
                {actionLabel}
              </>
            );

            return (
              <div key={key}>
                {destructive && (
                  <div aria-hidden="true" className="my-1 border-t border-border" />
                )}
                {to && !disabled ? (
                  <Button
                    asChild
                    className={itemClassName}
                    size="sm"
                    variant="ghost"
                  >
                    <Link onClick={() => setOpen(false)} to={to}>
                      {content}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    className={itemClassName}
                    disabled={disabled}
                    onClick={() => {
                      setOpen(false);
                      onClick?.();
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    {content}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { TableRowActionsMenu };
