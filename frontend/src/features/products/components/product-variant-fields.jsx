import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const EMPTY_OPTION = '__NONE__';

function createEmptyVariantDraft(metadata) {
  return {
    form: '',
    processingState: '',
    preservation: '',
    foodRange: '',
    referenceUnit: metadata?.referenceUnits?.[0]?.value ?? '',
    yieldPercent: '',
  };
}

function optionalText(value) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function variantDraftToPayload(draft) {
  return {
    form: optionalText(draft.form),
    processingState: optionalText(draft.processingState),
    preservation: optionalText(draft.preservation),
    foodRange: draft.foodRange ? Number(draft.foodRange) : null,
    referenceUnit: draft.referenceUnit,
    yieldPercent: draft.yieldPercent ? Number(draft.yieldPercent) : null,
  };
}

function ProductVariantFields({
  disabled = false,
  metadata,
  onChange,
  value,
}) {
  const unitItems = metadata?.referenceUnits ?? [];
  const foodRangeItems = [
    { value: EMPTY_OPTION, label: 'Non renseignée' },
    ...(metadata?.foodRanges ?? []).map((range) => ({
      value: String(range),
      label: 'Gamme ' + range,
    })),
  ];

  function change(field, nextValue) {
    onChange({
      ...value,
      [field]: nextValue,
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor="product-variant-form">Forme</FieldLabel>
        <Input
          disabled={disabled}
          id="product-variant-form"
          maxLength={80}
          onChange={(event) => change('form', event.target.value)}
          placeholder="Ex. râpée, entière"
          value={value.form}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="product-variant-processing">État / transformation</FieldLabel>
        <Input
          disabled={disabled}
          id="product-variant-processing"
          maxLength={80}
          onChange={(event) => change('processingState', event.target.value)}
          placeholder="Ex. prête à l’emploi"
          value={value.processingState}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="product-variant-preservation">Conservation</FieldLabel>
        <Input
          disabled={disabled}
          id="product-variant-preservation"
          maxLength={80}
          onChange={(event) => change('preservation', event.target.value)}
          placeholder="Ex. fraîche, surgelée"
          value={value.preservation}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="product-variant-food-range">Gamme</FieldLabel>
        <Select
          disabled={disabled}
          items={foodRangeItems}
          onValueChange={(nextValue) => change(
            'foodRange',
            nextValue === EMPTY_OPTION ? '' : nextValue,
          )}
          value={value.foodRange || EMPTY_OPTION}
        >
          <SelectTrigger id="product-variant-food-range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {foodRangeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor="product-variant-unit">Unité de référence</FieldLabel>
        <Select
          disabled={disabled}
          items={unitItems}
          onValueChange={(nextValue) => change('referenceUnit', nextValue)}
          value={value.referenceUnit || null}
        >
          <SelectTrigger id="product-variant-unit">
            <SelectValue placeholder="Sélectionner une unité" />
          </SelectTrigger>
          <SelectContent>
            {unitItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor="product-variant-yield">Rendement (%)</FieldLabel>
        <Input
          disabled={disabled}
          id="product-variant-yield"
          max="100"
          min="0.01"
          onChange={(event) => change('yieldPercent', event.target.value)}
          placeholder="Facultatif"
          step="0.01"
          type="number"
          value={value.yieldPercent}
        />
      </Field>
    </div>
  );
}

export {
  EMPTY_OPTION,
  ProductVariantFields,
  createEmptyVariantDraft,
  variantDraftToPayload,
};
