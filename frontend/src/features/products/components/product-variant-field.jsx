import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Field, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';

/**
 * Prototype d'habillage outlined réservé aux formulaires Produit M-002.
 * Réutilise les contrôles canoniques sans modifier les primitives Core.
 */
function ProductVariantField({
  children,
  className,
  filled = false,
  floating = false,
  helpContent = null,
  helpLabel,
  id,
  label,
}) {
  if (!floating) {
    return (
      <Field className={className}>
        {helpContent ? (
          <div className="flex items-center gap-1">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <InfoTooltip content={helpContent} label={helpLabel} />
          </div>
        ) : (
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
        )}
        {children}
      </Field>
    );
  }

  const raised = filled || Boolean(helpContent);

  return (
    <Field className={cn('group relative gap-0 pt-2', className)}>
      <div className={cn(
        'absolute left-3 z-10 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1 transition-all duration-150',
        raised
          ? 'top-2 -translate-y-1/2'
          : 'top-8 -translate-y-1/2 group-focus-within:top-2',
      )}
      >
        <FieldLabel
          className={cn(
            'max-w-full truncate whitespace-nowrap rounded-sm transition-all duration-150',
            raised
              ? 'bg-popover px-1 text-xs text-foreground'
              : 'text-sm text-muted-foreground group-focus-within:bg-popover group-focus-within:px-1 group-focus-within:text-xs group-focus-within:text-foreground',
          )}
          htmlFor={id}
        >
          {label}
        </FieldLabel>
        {helpContent && (
          <InfoTooltip
            className="size-5 bg-popover"
            content={helpContent}
            label={helpLabel}
          />
        )}
      </div>
      {children}
    </Field>
  );
}

export { ProductVariantField };
