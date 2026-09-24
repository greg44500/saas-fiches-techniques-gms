import {
  Autocomplete,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteInputGroup,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
  AutocompletePortal,
  AutocompletePositioner,
  AutocompleteStatus,
} from '@/components/ui/autocomplete';
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
    presentation: '',
    varietyId: '',
    characteristicIdsByKind: {},
    processingState: '',
    foodRange: '',
    referenceUnit: metadata?.referenceUnits?.[0]?.value ?? '',
    yieldPercent: '',
    structured,
  };
}

function optionalText(value) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function variantDraftToPayload(draft, { structured = draft.structured } = {}) {
  const common = {
    processingState: optionalText(draft.processingState),
    foodRange: Number(draft.foodRange),
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
  structured = false,
  value,
}) {
  const unitItems = metadata?.referenceUnits ?? [];
  const foodRanges = metadata?.foodRanges ?? [];
  const foodRangeItems = [
    { value: EMPTY_OPTION, label: 'Sélectionner une gamme' },
    ...foodRanges.map((range) => ({
      value: String(range.value),
      label: range.label + ' — ' + range.name,
    })),
  ];
  const selectedFoodRange = foodRanges.find(
    (range) => String(range.value) === String(value.foodRange),
  );
  const processingStateItems = selectedFoodRange?.processingStates ?? [];
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

  function changeFoodRange(nextValue) {
    if (nextValue === EMPTY_OPTION) {
      onChange({
        ...value,
        foodRange: '',
        processingState: '',
      });
      return;
    }

    const definition = foodRanges.find(
      (range) => String(range.value) === String(nextValue),
    );

    onChange({
      ...value,
      foodRange: nextValue,
      processingState: definition?.defaultProcessingState ?? '',
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
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
            placeholder="Ex. entière, râpée, émincée"
            value={value.presentation}
          />
        </Field>
      )}

      <Field>
        <FieldLabel htmlFor="product-variant-food-range">Gamme *</FieldLabel>
        <Select
          disabled={disabled}
          items={foodRangeItems}
          onValueChange={changeFoodRange}
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
          État / transformation *
        </FieldLabel>
        <Autocomplete
          filter={null}
          items={processingStateItems}
          itemToStringValue={(item) => item}
          onValueChange={(nextValue) => change('processingState', nextValue)}
          value={value.processingState}
        >
          <AutocompleteInputGroup>
            <AutocompleteInput
              aria-label="État / transformation"
              disabled={disabled || !selectedFoodRange}
              id="product-variant-processing"
              maxLength={80}
              placeholder={
                selectedFoodRange
                  ? 'État lié à la gamme'
                  : 'Sélectionnez d’abord une gamme'
              }
            />
          </AutocompleteInputGroup>
          <AutocompletePortal>
            <AutocompletePositioner>
              <AutocompletePopup>
                <AutocompleteStatus>
                  {processingStateItems.length} état(s) proposé(s)
                </AutocompleteStatus>
                <AutocompleteEmpty>
                  Aucun état n’est défini pour cette gamme.
                </AutocompleteEmpty>
                <AutocompleteList>
                  {(item, index) => (
                    <AutocompleteItem
                      index={index}
                      key={item}
                      value={item}
                    >
                      {item}
                    </AutocompleteItem>
                  )}
                </AutocompleteList>
              </AutocompletePopup>
            </AutocompletePositioner>
          </AutocompletePortal>
        </Autocomplete>
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
