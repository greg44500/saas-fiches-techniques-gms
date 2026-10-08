import { Eye, MoreHorizontal, Pencil, WandSparkles } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EXPORT_FORMATS } from '@/features/technical-sheets/components/technical-sheet-export-menu';

function TechnicalSheetRowActions({
  sheet,
  canModify,
  canOptimize,
  canExport,
  hasValidatedState,
  exportQuotaReached,
  isExporting,
  isOptimizing,
  isStartingDraft,
  onPreview,
  onOptimize,
  onModify,
  onExport,
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
    ...(hasValidatedState && canExport ? EXPORT_FORMATS.map(({ format, label, Icon }) => ({
      key: format,
      Icon,
      label: 'Exporter ' + label,
      disabled: exportQuotaReached || isExporting,
      onClick: () => onExport(format),
    })) : []),
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
          {actions.map(({ key, Icon, label, disabled, onClick }) => (
            <Button
              className="w-full justify-start gap-2"
              disabled={disabled}
              key={key}
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
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { TechnicalSheetRowActions };
