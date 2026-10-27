import { Button } from '@/components/ui/button';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';

// Consistent icon actions: same name for keyboard/screen reader and tooltip.
function ProcessIconAction({
  label, tooltip = label, icon: Icon, className = '', disabled = false,
  onClick, variant = 'ghost',
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            className={'size-8 shrink-0 ' + className}
            disabled={disabled}
            onClick={onClick}
            size="icon"
            type="button"
            variant={variant}
          />
        }
      >
        <Icon aria-hidden="true" className="size-4" />
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export { ProcessIconAction };
