import { Field, FieldLabel } from '@/components/ui/field';
import {
  getReferenceUnitLabel,
} from '@/features/products/lib/product-presentation';
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
    referenceUnit: metadata?.referenceUnits?.[0]?.value ?? '',
    countUnitLabelSingular: '',
    countUnitLabelPlural: '',
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
    referenceUnit: draft.referenceUnit,
    countUnitLabelSingular:
      draft.referenceUnit === 'UNIT'
        ? optionalText(draft.countUnitLabelSingular) || 'pièce'
        : null,
    countUnitLabelPlural:
      draft.referenceUnit === 'UNIT'
        ? optionalText(draft.countUnitLabelPlural) || 'pièces'
        : null,
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
  const unitItems = (metadata?.referenceUnits ?? []).map((item) => ({
    ...item,
    label: getReferenceUnitLabel(metadata, item.value),
  }));
  const conservationItems = metadata?.conservationTypes ?? [];
  const varieties = (dimensions?.varieties ?? []).filter(
    (variety) => variety.status === 'ACTIVE',
  );
  const characteristics = (dimensions?.characteristics ?? []).filter(
    (characteristic) => characteristic.status === 'ACTIVE',
  );
  const characteristicKinds = metadata?.productCharacteristicKinds ?? [];
  const varietyEmptyLabel = varieties.length === 0
    ? 'Aucune variété disponible'
    : 'Non renseigné';

  function change(field, nextValue) {
    const next = {
      ...value,
      [field]: nextValue,
    };

    if (field === 'referenceUnit' && nextValue === 'UNIT') {
      next.countUnitLabelSingular =
        value.countUnitLabelSingular || 'pièce';
      next.countUnitLabelPlural =
        value.countUnitLabelPlural || 'pièces';
    }

    onChange(next);
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
              disabled={disabled || varieties.length === 0}
              items={[
                { value: EMPTY_OPTION, label: varietyEmptyLabel },
                ...varieties.map((variety) => ({
                  value: variety.id,
                  label: variety.name
                    + (variety.governanceStatus === 'PROVISIONAL'
                      ? ' · À valider'
                      : ''),
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
                <SelectItem value={EMPTY_OPTION}>
                  {varietyEmptyLabel}
                </SelectItem>
                {varieties.map((variety) => (
                  <SelectItem key={variety.id} value={variety.id}>
                    {variety.name}
                    {variety.governanceStatus === 'PROVISIONAL'
                      ? ' · À valider'
                      : ''}
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
            const emptyLabel = options.length === 0
              ? 'Aucune valeur disponible'
              : 'Non renseigné';

            return (
              <Field key={kind.value}>
                <FieldLabel htmlFor={fieldId}>{kind.label}</FieldLabel>
                <Select
                  disabled={disabled || options.length === 0}
                  items={[
                    { value: EMPTY_OPTION, label: emptyLabel },
                    ...options.map((option) => ({
                      value: option.id,
                      label: option.name
                        + (option.governanceStatus === 'PROVISIONAL'
                          ? ' · À valider'
                          : ''),
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
                    <SelectItem value={EMPTY_OPTION}>{emptyLabel}</SelectItem>
                    {options.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                        {option.governanceStatus === 'PROVISIONAL'
                          ? ' · À valider'
                          : ''}
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

      {value.referenceUnit === 'UNIT' && (
        <>
          <Field>
            <FieldLabel htmlFor="product-variant-count-unit-singular">
              Nom d’une unité
            </FieldLabel>
            <Input
              disabled={disabled}
              id="product-variant-count-unit-singular"
              maxLength={40}
              onChange={(event) => change(
                'countUnitLabelSingular',
                event.target.value,
              )}
              placeholder="Ex. tranche, pain, œuf"
              value={value.countUnitLabelSingular ?? ''}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="product-variant-count-unit-plural">
              Nom de plusieurs unités
            </FieldLabel>
            <Input
              disabled={disabled}
              id="product-variant-count-unit-plural"
              maxLength={40}
              onChange={(event) => change(
                'countUnitLabelPlural',
                event.target.value,
              )}
              placeholder="Ex. tranches, pains, œufs"
              value={value.countUnitLabelPlural ?? ''}
            />
          </Field>
        </>
      )}

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
