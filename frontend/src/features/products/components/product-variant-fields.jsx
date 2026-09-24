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

function createEmptyVariantDraft(metadata, { structured = false } = {}) {
  return {
    name: '',
    presentation: '',
    varietyId: '',
    characteristicIdsByKind: {},
    processingState: '',
    conservationType: metadata?.conservationTypes?.[0]?.value ?? '',
    foodRange: '',
    referenceUnit: metadata?.referenceUnits?.[0]?.value ?? '',
    yieldPercent: '',
    structured,
  };
}

function optionalText(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function variantDraftToPayload(draft, { structured = draft.structured } = {}) {
  const common = {
    name: String(draft.name ?? '').trim(),
    processingState: optionalText(draft.processingState),
    conservationType: draft.conservationType,
    foodRange: draft.foodRange ? Number(draft.foodRange) : null,
    referenceUnit: draft.referenceUnit,
    yieldPercent: draft.yieldPercent ? Number(draft.yieldPercent) : null,
  };

  if (!structured) {
    return {
      presentation: optionalText(draft.presentation),
      ...common,
    };
  }

  return {
    varietyId: draft.varietyId || null,
    characteristicIds: Object.values(
      draft.characteristicIdsByKind ?? {},
    ).filter(Boolean),
    ...common,
  };
}

function ProductVariantFields({
  dimensions = null,
  disabled = false,
  metadata,
  onChange,
  showName = true,
  structured = false,
  value,
}) {
  const unitItems = metadata?.referenceUnits ?? [];
  const conservationItems = metadata?.conservationTypes ?? [];
  const foodRanges = metadata?.foodRanges ?? [];
  const foodRangeItems = [
    { value: EMPTY_OPTION, label: 'Aucune gamme' },
    ...foodRanges.map((range) => ({
      value: String(range.value),
      label: range.label + (range.name ? ' — ' + range.name : ''),
    })),
  ];
  const varieties = (dimensions?.varieties ?? []).filter(
    (variety) => variety.status === 'ACTIVE',
  );
  const characteristics = (dimensions?.characteristics ?? []).filter(
    (characteristic) => characteristic.status === 'ACTIVE',
  );
  const characteristicKinds = metadata?.productCharacteristicKinds ?? [];

  function change(field, nextValue) {
    onChange({
      ...value,
      [field]: nextValue,
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {showName && (
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="product-variant-name">Nom de la référence *</FieldLabel>
          <Input
            disabled={disabled}
            id="product-variant-name"
            maxLength={160}
            onChange={(event) => change('name', event.target.value)}
            placeholder="Ex. Carotte râpée"
            value={value.name ?? ''}
          />
        </Field>
      )}

      {structured ? (
        <>
          <Field>
            <FieldLabel htmlFor="product-variant-variety">Variété</FieldLabel>
            <Select
              disabled={disabled}
              items={[
                { value: EMPTY_OPTION, label: 'Aucune variété' },
                ...varieties.map((variety) => ({
                  value: variety.id,
                  label: variety.name,
                })),
              ]}
              onValueChange={(nextValue) => change(
                'varietyId',
                nextValue === EMPTY_OPTION ? '' : nextValue,
              )}
              value={value.varietyId || EMPTY_OPTION}
            >
              <SelectTrigger id="product-variant-variety">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_OPTION}>Aucune variété</SelectItem>
                {varieties.map((variety) => (
                  <SelectItem key={variety.id} value={variety.id}>
                    {variety.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {characteristicKinds.map((kind) => {
            const options = characteristics.filter(
              (characteristic) => characteristic.kind === kind.value,
            );
            const fieldId = 'product-variant-characteristic-' + kind.value;
            const selected = value.characteristicIdsByKind?.[kind.value]
              ?? EMPTY_OPTION;

            return (
              <Field key={kind.value}>
                <FieldLabel htmlFor={fieldId}>{kind.label}</FieldLabel>
                <Select
                  disabled={disabled}
                  items={[
                    { value: EMPTY_OPTION, label: 'Non renseigné' },
                    ...options.map((option) => ({
                      value: option.id,
                      label: option.name,
                    })),
                  ]}
                  onValueChange={(nextValue) => onChange({
                    ...value,
                    characteristicIdsByKind: {
                      ...(value.characteristicIdsByKind ?? {}),
                      [kind.value]:
                        nextValue === EMPTY_OPTION ? '' : nextValue,
                    },
                  })}
                  value={selected}
                >
                  <SelectTrigger id={fieldId}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_OPTION}>Non renseigné</SelectItem>
                    {options.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            );
          })}
        </>
      ) : (
        <Field>
          <FieldLabel htmlFor="product-variant-presentation">Présentation</FieldLabel>
          <Input
            disabled={disabled}
            id="product-variant-presentation"
            maxLength={120}
            onChange={(event) => change('presentation', event.target.value)}
            placeholder="Facultatif"
            value={value.presentation}
          />
        </Field>
      )}

      <Field>
        <FieldLabel htmlFor="product-variant-conservation">Conservation *</FieldLabel>
        <Select
          disabled={disabled}
          items={conservationItems}
          onValueChange={(nextValue) => change('conservationType', nextValue)}
          value={value.conservationType || null}
        >
          <SelectTrigger id="product-variant-conservation">
            <SelectValue placeholder="Sélectionner une conservation" />
          </SelectTrigger>
          <SelectContent>
            {conservationItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor="product-variant-unit">Unité de référence *</FieldLabel>
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
        <FieldLabel htmlFor="product-variant-processing">
          État / transformation
        </FieldLabel>
        <Input
          disabled={disabled}
          id="product-variant-processing"
          maxLength={80}
          onChange={(event) => change('processingState', event.target.value)}
          placeholder="Facultatif"
          value={value.processingState}
        />
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
