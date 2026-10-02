import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

/**
 * Sélecteur segmenté générique pour un choix exclusif contrôlé.
 *
 * Les items suivent la forme :
 * { value, label, disabled?, ariaLabel? }
 *
 * Lorsque `value` désigne un item, cliquer de nouveau sur cet item ne peut
 * pas vider la sélection : le contrôle conserve exactement une valeur.
 */
function SegmentedControl({
  ariaLabel,
  className,
  disabled = false,
  items = [],
  onValueChange,
  size = 'default',
  value,
}) {
  const itemByKey = new Map(
    items.map((item) => [String(item.value), item]),
  );
  const currentKey = value === undefined || value === null
    ? null
    : String(value);
  const selectedValue = currentKey && itemByKey.has(currentKey)
    ? [currentKey]
    : [];

  function handleValueChange(nextValues) {
    const nextKey = nextValues[0];

    if (!nextKey) return;

    const nextItem = itemByKey.get(nextKey);
    if (!nextItem || Object.is(nextItem.value, value)) return;

    onValueChange?.(nextItem.value);
  }

  return (
    <ToggleGroup
      aria-label={ariaLabel}
      className={cn('w-fit', className)}
      disabled={disabled}
      onValueChange={handleValueChange}
      value={selectedValue}
    >
      {items.map((item) => (
        <ToggleGroupItem
          aria-label={item.ariaLabel}
          disabled={item.disabled}
          key={String(item.value)}
          size={size}
          value={String(item.value)}
        >
          {item.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export { SegmentedControl };
