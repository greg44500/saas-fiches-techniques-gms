import {
  ArrowUpRight,
  Globe2,
  Star,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  DataTable,
  DataTableActions,
} from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ProductSearchAutocomplete,
} from '@/features/products/components/product-search-autocomplete';
import {
  TechnicalSheetSourcingSelect,
} from '@/features/technical-sheets/components/technical-sheet-sourcing-select';
import {
  TechnicalSheetStatusBadge,
} from '@/features/technical-sheets/components/technical-sheet-status-badge';
import {
  formatDecimalCurrency,
  getLineValuationPresentation,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

const LINE_KIND_ITEMS = Object.freeze([
  { value: 'INGREDIENT', label: 'Ingrédient' },
  { value: 'ECONOMAT', label: 'Économat' },
]);

const PRODUCT_SOURCE = Object.freeze({
  REFERENCE: 'REFERENCE',
  FAVORITES: 'WORKSPACE',
});

const PRICING_SOURCE_LABEL = Object.freeze({
  SUPPLIER_TARIFF: 'Tarif fournisseur',
  NEGOTIATED_PRICE: 'Tarif négocié',
  INVOICED_PRICE: 'Prix facturé',
});

function normalizeDraftLine(line, index) {
  return {
    id: line.id,
    kind: line.kind ?? 'INGREDIENT',
    productVariantId:
      line.productVariantId
      ?? line.productVariant?.id,
    productVariantName:
      line.productVariant?.name
      ?? line.productVariantName
      ?? 'Référence Produit',
    productVariant:
      line.productVariant ?? (
        line.productVariantId
          ? {
              id: line.productVariantId,
              name: line.productVariantName ?? 'Référence Produit',
              referenceUnit: line.referenceUnit ?? line.inputUnit,
            }
          : null
      ),
    referenceUnit:
      line.productVariant?.referenceUnit
      ?? line.referenceUnit
      ?? line.inputUnit,
    netQuantity:
      line.netQuantity ?? '1',
    inputUnit:
      line.inputUnit
      ?? line.productVariant?.referenceUnit,
    order: index,
    note:
      line.note ?? '',
    selectedSupplierArticleId:
      line.selectedSupplierArticleId
      ?? line.valuation?.supplierArticleId
      ?? null,
    calculation: line.calculation ?? null,
    valuation: line.valuation ?? null,
  };
}

function getPricingSourceLabel(source) {
  return PRICING_SOURCE_LABEL[source] ?? null;
}

function TechnicalSheetLineEditor({
  canManageSourcing = false,
  disabled,
  dossierId,
  draftRevision,
  lines,
  metadata,
  onChange,
  onOpenPricing,
  onSourcingError,
  onSourcingPendingChange,
  onSourcingSelected,
  productMetadata,
  canOpenPricing = false,
  sourcingDisabled = false,
  sourcingDisabledReason = '',
  technicalSheetId,
  workspaceId,
}) {
  const [search, setSearch] = useState('');
  const [addError, setAddError] = useState('');
  const [productScope, setProductScope] = useState(PRODUCT_SOURCE.REFERENCE);

  const unitItems = useMemo(
    () => (metadata?.units ?? []).map((unit) => ({
      value: unit.value,
      label: unit.label,
    })),
    [metadata?.units],
  );
  const unitLabelByValue = useMemo(
    () => new Map(unitItems.map((unit) => [unit.value, unit.label])),
    [unitItems],
  );

  function updateLine(index, patch) {
    onChange(
      lines.map((line, currentIndex) => (
        currentIndex === index
          ? { ...line, ...patch }
          : line
      )),
    );
  }

  function removeLine(index) {
    onChange(
      lines
        .filter((_, currentIndex) => currentIndex !== index)
        .map((line, order) => ({ ...line, order })),
    );
  }

  function addProduct(result) {
    if (!result?.variant?.id) {
      setAddError(
        'Cette référence doit être enrichie avant de pouvoir être utilisée dans une Fiche technique.',
      );
      return;
    }

    setAddError('');
    onChange([
      ...lines,
      {
        id: undefined,
        kind: 'INGREDIENT',
        productVariantId: result.variant.id,
        productVariantName:
          result.variant.name
          ?? result.product?.name
          ?? 'Référence Produit',
        productVariant: result.variant,
        referenceUnit:
          result.variant.referenceUnit,
        netQuantity: '1',
        inputUnit:
          result.variant.referenceUnit,
        order: lines.length,
        note: '',
        selectedSupplierArticleId: null,
        calculation: null,
        valuation: null,
      },
    ]);
    setSearch('');
  }

  const columns = [
    {
      id: 'reference',
      header: 'Produit',
      headerClassName: 'min-w-48',
      cell: (line) => (
        <div className="min-w-44">
          <p className="font-medium">{line.productVariantName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Unité de référence : {
              unitLabelByValue.get(line.referenceUnit)
              ?? line.referenceUnit
              ?? '—'
            }
          </p>
        </div>
      ),
    },
    {
      id: 'kind',
      header: 'Type',
      headerClassName: 'min-w-36',
      cell: (line, index) => (
        <Select
          disabled={disabled}
          items={LINE_KIND_ITEMS}
          onValueChange={(value) => updateLine(index, { kind: value })}
          value={line.kind}
        >
          <SelectTrigger aria-label={'Type de ligne ' + (index + 1)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LINE_KIND_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      id: 'sourcing',
      header: 'Article / Fournisseur',
      headerClassName: 'min-w-72',
      cell: (line) => {
        if (!line.id) {
          return (
            <p className="max-w-64 text-xs text-muted-foreground">
              Enregistrez le brouillon pour choisir l’Article fournisseur.
            </p>
          );
        }

        return (
          <TechnicalSheetSourcingSelect
            canManage={canManageSourcing}
            disabled={
              disabled
              || sourcingDisabled
              || draftRevision === null
              || draftRevision === undefined
            }
            dossierId={dossierId}
            draftRevision={draftRevision}
            line={line}
            onError={onSourcingError}
            onPendingChange={onSourcingPendingChange}
            onSelected={onSourcingSelected}
            technicalSheetId={technicalSheetId}
            workspaceId={workspaceId}
          />
        );
      },
    },
    {
      id: 'quantity',
      header: 'Qté nette',
      headerClassName: 'min-w-28',
      cell: (line, index) => (
        <Input
          aria-label={'Quantité nette ligne ' + (index + 1)}
          className="min-w-24"
          disabled={disabled}
          inputMode="decimal"
          onChange={(event) => updateLine(index, {
            netQuantity: event.target.value,
          })}
          value={line.netQuantity}
        />
      ),
    },
    {
      id: 'grossQuantity',
      header: 'Qté brute',
      headerClassName: 'min-w-28',
      cell: (line) => (
        <span className="whitespace-nowrap tabular-nums">
          {line.calculation?.grossQuantity ?? '—'}{' '}
          {
            unitLabelByValue.get(line.calculation?.grossUnit)
            ?? line.calculation?.grossUnit
            ?? ''
          }
        </span>
      ),
    },
    {
      id: 'unit',
      header: 'Unité',
      headerClassName: 'min-w-28',
      cell: (line, index) => (
        <Select
          disabled={disabled}
          items={unitItems}
          onValueChange={(value) => updateLine(index, { inputUnit: value })}
          value={line.inputUnit}
        >
          <SelectTrigger aria-label={'Unité ligne ' + (index + 1)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {unitItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      id: 'price',
      header: 'Prix applicable',
      headerClassName: 'min-w-44',
      cell: (line) => {
        const valuationPresentation = line.id
          ? getLineValuationPresentation(line.valuation?.status)
          : { label: 'À enregistrer', tone: 'warning' };
        const sourceLabel = getPricingSourceLabel(
          line.valuation?.applicableSource,
        );
        const normalizedUnit = (
          unitLabelByValue.get(line.valuation?.normalizedUnit)
          ?? line.valuation?.normalizedUnit
        );

        return (
          <div className="space-y-1">
            <p className="whitespace-nowrap font-medium tabular-nums">
              {line.valuation?.normalizedAmount
                ? (
                    formatDecimalCurrency(line.valuation.normalizedAmount)
                    + (normalizedUnit ? ' / ' + normalizedUnit : '')
                  )
                : '—'}
            </p>
            {sourceLabel && (
              <p className="text-xs text-muted-foreground">
                {sourceLabel}
              </p>
            )}
            <div className="flex items-center gap-1">
              <TechnicalSheetStatusBadge tone={valuationPresentation.tone}>
                {valuationPresentation.label}
              </TechnicalSheetStatusBadge>
              {canOpenPricing
              && line.valuation?.status === 'NO_PRICE' && (
                <ActionIconButton
                  Icon={ArrowUpRight}
                  label={'Ouvrir Fournisseurs et prix pour ' + line.productVariantName}
                  onClick={() => onOpenPricing?.(line)}
                  tooltipLabel="Ouvrir Fournisseurs et prix"
                  variant="ghost"
                />
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'cost',
      header: 'Coût HT',
      headerClassName: 'min-w-28',
      cell: (line) => (
        <span className="whitespace-nowrap font-medium tabular-nums">
          {line.valuation?.lineCostHt
            ? formatDecimalCurrency(line.valuation.lineCostHt)
            : '—'}
        </span>
      ),
    },
    {
      id: 'note',
      header: 'Note',
      headerClassName: 'min-w-44',
      cell: (line, index) => (
        <Input
          aria-label={'Note ligne ' + (index + 1)}
          className="min-w-40"
          disabled={disabled}
          maxLength={500}
          onChange={(event) => updateLine(index, {
            note: event.target.value,
          })}
          value={line.note}
        />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (_line, index) => (
        <DataTableActions>
          <Button
            aria-label={'Supprimer la ligne ' + (index + 1)}
            disabled={disabled}
            onClick={() => removeLine(index)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        </DataTableActions>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {!disabled && (
        <div className="rounded-lg border border-border bg-muted/15 p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <div className="space-y-2">
              <p className="text-sm font-medium">Source Produit</p>
              <div
                aria-label="Source Produit"
                className="flex gap-2"
                role="group"
              >
                <Button
                  aria-pressed={productScope === PRODUCT_SOURCE.REFERENCE}
                  onClick={() => setProductScope(PRODUCT_SOURCE.REFERENCE)}
                  size="sm"
                  type="button"
                  variant={
                    productScope === PRODUCT_SOURCE.REFERENCE
                      ? 'default'
                      : 'outline'
                  }
                >
                  <Globe2 aria-hidden="true" className="size-4" />
                  Tous les produits
                </Button>
                <Button
                  aria-pressed={productScope === PRODUCT_SOURCE.FAVORITES}
                  onClick={() => setProductScope(PRODUCT_SOURCE.FAVORITES)}
                  size="sm"
                  type="button"
                  variant={
                    productScope === PRODUCT_SOURCE.FAVORITES
                      ? 'default'
                      : 'outline'
                  }
                >
                  <Star aria-hidden="true" className="size-4" />
                  Favoris
                </Button>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-medium">
                Ajouter une Référence Produit
              </p>
              <ProductSearchAutocomplete
                metadata={productMetadata}
                onSelect={addProduct}
                onValueChange={setSearch}
                scope={productScope}
                showWorkspaceFavorite={productScope === PRODUCT_SOURCE.REFERENCE}
                status="ACTIVE"
                value={search}
                workspaceId={workspaceId}
              />
            </div>
          </div>

          {addError && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {addError}
            </p>
          )}

          {sourcingDisabled && sourcingDisabledReason && (
            <p className="mt-2 text-xs text-muted-foreground">
              {sourcingDisabledReason}
            </p>
          )}
        </div>
      )}

      <DataTable
        aria-label="Composition de la Fiche technique"
        columns={columns}
        data={lines}
        density="compact"
        emptyContent={(
          <div className="space-y-1">
            <p className="font-medium">Aucune ligne</p>
            <p className="text-sm text-muted-foreground">
              Recherchez une Référence Produit pour commencer la composition.
            </p>
          </div>
        )}
        getRowKey={(line, index) => line.id ?? line.productVariantId + ':' + index}
        rowClassName="transition-colors hover:bg-muted/35"
        tableClassName="min-w-[1380px]"
      />
    </div>
  );
}

export {
  PRODUCT_SOURCE,
  TechnicalSheetLineEditor,
  getPricingSourceLabel,
  normalizeDraftLine,
};
