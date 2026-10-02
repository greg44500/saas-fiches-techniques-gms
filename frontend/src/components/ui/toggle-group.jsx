import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const toggleGroupItemVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md text-sm font-medium',
    'outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'data-disabled:pointer-events-none data-disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'text-muted-foreground hover:bg-accent hover:text-accent-foreground data-pressed:bg-background data-pressed:text-foreground data-pressed:shadow-sm',
        outline:
          'border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground data-pressed:border-primary/50 data-pressed:bg-primary data-pressed:text-primary-foreground',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-9 px-3',
        lg: 'h-10 px-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function normalizeGroupValue(value, multiple) {
  if (value === undefined) return undefined;
  if (multiple) return Array.isArray(value) ? value : [];
  return value ? [value] : [];
}

function ToggleGroup({
  className,
  defaultValue,
  disabled = false,
  onValueChange,
  orientation = 'horizontal',
  type = 'single',
  value,
  ...props
}) {
  const multiple = type === 'multiple';

  return (
    <BaseToggleGroup
      className={cn(
        'inline-flex items-center gap-2',
        orientation === 'vertical' && 'flex-col items-stretch',
        className,
      )}
      defaultValue={normalizeGroupValue(defaultValue, multiple)}
      disabled={disabled}
      multiple={multiple}
      onValueChange={(nextValue, eventDetails) => {
        onValueChange?.(
          multiple
            ? nextValue
            : nextValue[0] ?? '',
          eventDetails,
        );
      }}
      orientation={orientation}
      value={normalizeGroupValue(value, multiple)}
      {...props}
    />
  );
}

function ToggleGroupItem({
  className,
  size = 'default',
  variant = 'default',
  ...props
}) {
  return (
    <BaseToggle
      className={cn(
        toggleGroupItemVariants({
          size,
          variant,
        }),
        className,
      )}
      {...props}
    />
  );
}

export {
  ToggleGroup,
  ToggleGroupItem,
  toggleGroupItemVariants,
};
