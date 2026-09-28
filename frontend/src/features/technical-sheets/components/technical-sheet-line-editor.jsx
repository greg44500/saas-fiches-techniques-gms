import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  DataTable,
  DataTableActions,
} from '@/components/data-display/data-table';
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

const LINE_KIND_ITEMS = Object.freeze([
  { value: 'INGREDIENT', label: 'Ingrédient' },
  { value: 'ECONOMAT', label: 'Économat' },
]);

function normalizeDraftLine(line, index) {
  return {
    id: line.id,
    kind: line.kind ?? 'INGREDIENT',
    productVariantId:
      line.productVariantId
      ?? line.productVariant?.id,
    productVariantName:
      line.productVariant?.name
      ?? 'Référence Produit',
    referenceUnit:
      line.productVariant?.referenceUnit
      ?? line.inputUnit,
    netQuantity:
      line.netQuantity ?? '1',
    inputUnit:
      line.inputUnit
      ?? line.productVariant?.referenceUnit,
    order: index,
    note:
      line.note ?? '',
  };
}

function TechnicalSheetLineEditor({
  disabled,
  lines,
  metadata,
  onChange,
  productMetadata,
  workspaceId,
}) {
  const [search, setSearch] = useState('');
  const [addError, setAddError] = useState('');

  const unitItems = useMemo(
    () => (metadata?.units ?? []).map((unit) => ({
      value: unit.value,
      label: unit.label,
    })),
    [metadata?.units],
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
        referenceUnit:
          result.variant.referenceUnit,
        netQuantity: '1',
        inputUnit:
          result.variant.referenceUnit,
        order: lines.length,
        note: '',
      },
    ]);
    setSearch('');
  }

  const columns = [
    {
      id: 'reference',
      header: 'Référence Produit',
      cell: (line) => (
        <div>
          <p className="font-medium">{line.productVariantName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Unité de référence : {line.referenceUnit ?? 'non renseignée'}
          </p>
        </div>
      ),
    },
    {
      id: 'kind',
      header: 'Type',
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
      id: 'quantity',
      header: 'Quantité nette',
      cell: (line, index) => (
        <Input
          aria-label={'Quantité nette ligne ' + (index + 1)}
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
      id: 'unit',
      header: 'Unité',
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
      id: 'note',
      header: 'Note',
      cell: (line, index) => (
        <Input
          aria-label={'Note ligne ' + (index + 1)}
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
        <div className="space-y-2">
          <p className="text-sm font-medium">Ajouter une Référence Produit</p>
          <div className="max-w-2xl">
            <ProductSearchAutocomplete
              metadata={productMetadata}
              onSelect={addProduct}
              onValueChange={setSearch}
              scope="WORKSPACE"
              status="ACTIVE"
              value={search}
              workspaceId={workspaceId}
            />
          </div>
          {addError && (
            <p className="text-sm text-destructive" role="alert">
              {addError}
            </p>
          )}
        </div>
      )}

      <DataTable
        aria-label="Composition de la Fiche technique"
        columns={columns}
        data={lines}
        emptyContent={(
          <div className="space-y-1">
            <p className="font-medium">Aucune ligne</p>
            <p className="text-sm text-muted-foreground">
              Recherchez une Référence Produit pour commencer la composition.
            </p>
          </div>
        )}
        getRowKey={(line, index) => line.id ?? line.productVariantId + ':' + index}
      />
    </div>
  );
}

export {
  TechnicalSheetLineEditor,
  normalizeDraftLine,
};
