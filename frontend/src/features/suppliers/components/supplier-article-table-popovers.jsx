import { Calculator, PackageSearch } from 'lucide-react';

import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';

function DetailPopover({ Icon, label, title, warning = false, children }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={label}
        className={[
          'inline-flex size-7 shrink-0 items-center justify-center rounded-md',
          'transition-colors hover:bg-accent focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring',
          warning ? 'text-warning' : 'text-muted-foreground hover:text-foreground',
        ].join(' ')}
        closeDelay={150}
        delay={250}
        openOnHover
        type="button"
      >
        <Icon aria-hidden="true" className="size-4" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 max-w-[calc(100vw-2rem)] p-3"
        side="top"
      >
        <p className="mb-2 text-xs font-semibold">{title}</p>
        <div className="space-y-1 text-sm">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

// Le conditionnement et ses anomalies sont déjà projetés par le backend.
function SupplierArticlePackagingPopover({ presentation, supplierReference }) {
  if (!presentation?.totalLabel && !presentation?.warningLabel) return null;

  return (
    <DetailPopover
      Icon={PackageSearch}
      label={`Détails du conditionnement de ${supplierReference}${
        presentation.warningLabel ? ' — poids à vérifier' : ''
      }`}
      title="Détails du conditionnement"
      warning={Boolean(presentation.warningLabel)}
    >
      {presentation.totalLabel && <p>{presentation.totalLabel}</p>}
      {presentation.warningLabel && (
        <p className="text-warning" role="note">{presentation.warningLabel}</p>
      )}
    </DetailPopover>
  );
}

// Aucun calcul monétaire dans React : labels fournis par M-003.
function SupplierArticlePricePopover({ price, supplierReference }) {
  const mainPrice = price?.packagePriceLabel || price?.sourcePriceLabel;
  const normalizedPrice = price?.unitPriceLabel !== mainPrice
    ? price?.unitPriceLabel : null;
  if (!price?.piecePriceLabel && !normalizedPrice) return null;

  return (
    <DetailPopover
      Icon={Calculator}
      label={`Détails des prix de ${supplierReference}`}
      title="Prix complémentaires HT"
    >
      {price.piecePriceLabel && <p>{price.piecePriceLabel}</p>}
      {normalizedPrice && <p>{normalizedPrice}</p>}
    </DetailPopover>
  );
}

export {
  SupplierArticlePackagingPopover,
  SupplierArticlePricePopover,
};
