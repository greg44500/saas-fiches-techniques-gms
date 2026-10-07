import {
  FileSpreadsheet,
  FileText,
  FileUp,
  Table2,
} from 'lucide-react';
import { useState } from 'react';

import { ActionIconButton } from '@/components/shared/action-icon-button';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const EXPORT_FORMATS = Object.freeze([
  Object.freeze({
    format: 'PDF',
    label: '.pdf',
    Icon: FileText,
  }),
  Object.freeze({
    format: 'XLSX',
    label: '.xlsx',
    Icon: FileSpreadsheet,
  }),
  Object.freeze({
    format: 'CSV',
    label: '.csv',
    Icon: Table2,
  }),
]);

function TechnicalSheetExportMenu({
  disabledReason = null,
  exportingFormat = null,
  label = 'Exports',
  onExport,
  tooltipLabel = label,
}) {
  const [open, setOpen] = useState(false);

  if (disabledReason) {
    return (
      <ActionIconButton
        Icon={FileUp}
        disabled
        label={label}
        tooltipLabel={disabledReason}
        variant="ghost"
      />
    );
  }

  return (
    <Popover
      onOpenChange={setOpen}
      open={open}
    >
      <Tooltip>
        <PopoverTrigger
          render={(
            <TooltipTrigger
              render={(
                <Button
                  aria-label={label}
                  disabled={Boolean(exportingFormat)}
                  size="icon"
                  type="button"
                  variant="ghost"
                />
              )}
            />
          )}
        >
          <FileUp
            aria-hidden="true"
            className="size-4"
          />
        </PopoverTrigger>
        <TooltipContent>
          {tooltipLabel}
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        align="end"
        className="w-40 p-1"
        side="bottom"
      >
        <div
          aria-label="Formats d’export"
          className="space-y-0.5"
          role="group"
        >
          {EXPORT_FORMATS.map(({
            format,
            label,
            Icon,
          }) => (
            <Button
              className="w-full justify-start gap-2"
              disabled={Boolean(exportingFormat)}
              key={format}
              onClick={() => {
                setOpen(false);
                onExport?.(format);
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Icon
                aria-hidden="true"
                className="size-4"
              />
              {exportingFormat === format
                ? 'Export…'
                : label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export {
  EXPORT_FORMATS,
  TechnicalSheetExportMenu,
};
