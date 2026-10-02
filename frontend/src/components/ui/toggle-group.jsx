import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const toggleGroupItemVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center rounded-md font-medium text-muted-foreground outline-none',
    'transition-colors motion-reduce:transition-none',
    'hover:bg-accent hover:text-accent-foreground',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:shadow-sm',
    'data-disabled:pointer-events-none data-disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-8 px-2.5 text-xs',
        default: 'h-9 px-3 text-sm',
        lg: 'h-10 px-4 text-sm',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

function ToggleGroup({ className, ...props }) {
  return (
    <BaseToggleGroup
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1',
        'data-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

function ToggleGroupItem({ className, size = 'default', ...props }) {
  return (
    <Toggle
      className={cn(toggleGroupItemVariants({ size }), className)}
      {...props}
    />
  );
}

export {
  ToggleGroup,
  ToggleGroupItem,
  toggleGroupItemVariants,
};
