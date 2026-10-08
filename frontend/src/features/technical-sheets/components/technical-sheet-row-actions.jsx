import { Eye, MoreHorizontal, Pencil, Trash2, WandSparkles } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function TechnicalSheetRowActions({
  sheet,
  canModify,
  canOptimize,
  canDelete,
  hasValidatedState,
  isDeleting,
  isOptimizing,
  isStartingDraft,
  onPreview,
  onOptimize,
  onModify,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const actions = [
    ...(hasValidatedState ? [{
      key: 'preview',
      Icon: Eye,
      label: 'Prévisualiser',
      onClick: onPreview,
    }] : []),
    ...(canOptimize ? [{
      key: 'optimize',
      Icon: WandSparkles,
      label: 'Optimiser',
      disabled: isOptimizing,
      onClick: onOptimize,
    }] : []),
    ...(canModify ? [{
      key: 'modify',
      Icon: Pencil,
      label: 'Modifier',
      disabled: isStartingDraft,
      onClick: onModify,
    }] : []),
    ...(canDelete ? [{
      key: 'delete',
      Icon: Trash2,
      label: 'Supprimer',
      destructive: true,
      disabled: isDeleting,
      onClick: onDelete,
    }] : []),
  ];

  if (actions.length === 0) return null;

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-label={'Actions de ' + sheet.name}
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <MoreHorizontal aria-hidden="true" className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <div aria-label={'Actions de ' + sheet.name} className="space-y-0.5" role="group">
          {actions.map(({ key, Icon, label, destructive, disabled, onClick }) => (
            <div key={key}>
              {destructive && <div aria-hidden="true" className="my-1 border-t border-border" />}
              <Button
                className={destructive
                  ? 'w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive'
                  : 'w-full justify-start gap-2'}
                disabled={disabled}
                onClick={() => {
                  setOpen(false);
                  onClick();
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                {label}
              </Button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { TechnicalSheetRowActions };
