import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

/**
 * Sélecteur segmenté générique pour un choix exclusif court.
 * Les options restent fournies par le domaine appelant ; la primitive ne
 * connaît aucune valeur métier.
 */
function SegmentedControl({
  ariaLabel,
  className,
  disabled = false,
  items = [],
  onValueChange,
  size = 'default',
  value = '',
}) {
  return (
    <ToggleGroup
      aria-label={ariaLabel}
      className={cn(
        'rounded-lg border border-input bg-muted/30 p-1',
        className,
      )}
      disabled={disabled}
      onValueChange={(nextValue) => {
        if (!nextValue || nextValue === value) return;
        onValueChange?.(nextValue);
      }}
      type="single"
      value={value}
    >
      {items.map((item) => (
        <ToggleGroupItem
          aria-label={item.ariaLabel ?? item.label}
          className="min-w-16"
          key={item.value}
          size={size}
          value={item.value}
          variant="outline"
        >
          {item.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export { SegmentedControl };
