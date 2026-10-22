import { ProductVariantField } from '@/features/products/components/product-variant-field';
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

const PRESENTATION_HELP = 'Décrit la forme de présentation du Produit : '
  + 'entier, en tranches, en quartiers, râpé. '
  + 'Ne saisissez pas le carton, le sachet ou d’autres conditionnements fournisseur.';
const PROCESSING_HELP = 'Indique l’état du Produit ou une transformation déjà réalisée : '
  + 'cru, précuit, cuit, blanchi ou prêt à cuire. '
  + 'Ce champ est facultatif et ne doit pas être déduit automatiquement de la gamme.';

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
  floatingLabels = false,
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
    <div className={floatingLabels ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-4 sm:grid-cols-2'}>
      {showName && (
        <ProductVariantField
          className="sm:col-span-2"
          filled={Boolean(value.name)}
          floating={floatingLabels}
          id="product-variant-name"
          label="Nom de la référence *"
        >
          <Input
            className={floatingLabels ? 'h-12 placeholder:text-transparent focus:placeholder:text-muted-foreground' : undefined}
            disabled={disabled}
            id="product-variant-name"
            maxLength={160}
            onChange={(event) => change('name', event.target.value)}
            placeholder="Ex. Carotte râpée"
            value={value.name ?? ''}
          />
        </ProductVariantField>
      )}

      {structured ? (
        <>
          <ProductVariantField
            filled={Boolean(value.varietyId)}
            floating={floatingLabels}
            id="product-variant-variety"
            label="Variété"
            unavailable={varieties.length === 0}
          >
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
              <SelectTrigger className={floatingLabels ? 'h-12 pt-3' : undefined} id="product-variant-variety">
                <SelectValue
                  className={floatingLabels && !value.varietyId
                    ? varieties.length === 0
                      ? 'opacity-0 transition-opacity duration-200 group-hover:opacity-100'
                      : 'opacity-0 transition-opacity duration-200 group-focus-within:opacity-100'
                    : undefined}
                />
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
          </ProductVariantField>

          {characteristicKinds.map((kind) => {
            const options = characteristics.filter(
              (characteristic) => characteristic.kind === kind.value,
            );
            const fieldId = 'product-variant-characteristic-' + kind.value;
            const selected = value.characteristicIdsByKind?.[kind.value]
              || EMPTY_OPTION;
            const emptyLabel = options.length === 0
              ? 'Aucune valeur disponible'
              : 'Non renseigné';

            return (
              <ProductVariantField
                filled={selected !== EMPTY_OPTION}
                floating={floatingLabels}
                helpContent={kind.value === 'PRESENTATION' ? PRESENTATION_HELP : null}
                helpLabel="Aide sur la présentation de la Référence Produit"
                id={fieldId}
                key={kind.value}
                label={kind.label}
                unavailable={options.length === 0}
              >
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
                  <SelectTrigger className={floatingLabels ? 'h-12 pt-3' : undefined} id={fieldId}>
                    <SelectValue
                      className={floatingLabels && selected === EMPTY_OPTION
                        ? options.length === 0
                          ? 'opacity-0 transition-opacity duration-200 group-hover:opacity-100'
                          : 'opacity-0 transition-opacity duration-200 group-focus-within:opacity-100'
                        : undefined}
                    />
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
              </ProductVariantField>
            );
          })}
        </>
      ) : (
        <ProductVariantField
          filled={Boolean(value.presentation)}
          floating={floatingLabels}
          helpContent={PRESENTATION_HELP}
          helpLabel="Aide sur la présentation de la Référence Produit"
          id="product-variant-presentation"
          label="Présentation"
        >
          <Input
            className={floatingLabels ? 'h-12 placeholder:text-transparent focus:placeholder:text-muted-foreground' : undefined}
            disabled={disabled}
            id="product-variant-presentation"
            maxLength={120}
            onChange={(event) => change('presentation', event.target.value)}
            placeholder="Ex. entier, en tranches, râpé"
            value={value.presentation}
          />
        </ProductVariantField>
      )}

      <ProductVariantField
        filled={Boolean(value.conservationType)}
        floating={floatingLabels}
        id="product-variant-conservation"
        label="Conservation *"
      >
        <Select
          disabled={disabled}
          items={conservationItems}
          onValueChange={(nextValue) => change('conservationType', nextValue)}
          value={value.conservationType || null}
        >
          <SelectTrigger className={floatingLabels ? 'h-12 pt-3' : undefined} id="product-variant-conservation">
            <SelectValue
              className={floatingLabels && !value.conservationType
                ? 'opacity-0 transition-opacity duration-200 group-focus-within:opacity-100'
                : undefined}
              placeholder="Sélectionner une conservation"
            />
          </SelectTrigger>
          <SelectContent>
            {conservationItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ProductVariantField>

      <ProductVariantField
        filled={Boolean(value.referenceUnit)}
        floating={floatingLabels}
        id="product-variant-unit"
        label="Unité de référence *"
      >
        <Select
          disabled={disabled}
          items={unitItems}
          onValueChange={(nextValue) => change('referenceUnit', nextValue)}
          value={value.referenceUnit || null}
        >
          <SelectTrigger className={floatingLabels ? 'h-12 pt-3' : undefined} id="product-variant-unit">
            <SelectValue
              className={floatingLabels && !value.referenceUnit
                ? 'opacity-0 transition-opacity duration-200 group-focus-within:opacity-100'
                : undefined}
              placeholder="Sélectionner une unité"
            />
          </SelectTrigger>
          <SelectContent>
            {unitItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ProductVariantField>

      {value.referenceUnit === 'UNIT' && (
        <>
          <ProductVariantField
            filled={Boolean(value.countUnitLabelSingular)}
            floating={floatingLabels}
            id="product-variant-count-unit-singular"
            label="Nom d’une unité"
          >
            <Input
              className={floatingLabels ? 'h-12 placeholder:text-transparent focus:placeholder:text-muted-foreground' : undefined}
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
          </ProductVariantField>

          <ProductVariantField
            filled={Boolean(value.countUnitLabelPlural)}
            floating={floatingLabels}
            id="product-variant-count-unit-plural"
            label="Nom de plusieurs unités"
          >
            <Input
              className={floatingLabels ? 'h-12 placeholder:text-transparent focus:placeholder:text-muted-foreground' : undefined}
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
          </ProductVariantField>
        </>
      )}

      <ProductVariantField
        filled={Boolean(value.processingState)}
        floating={floatingLabels}
        helpContent={PROCESSING_HELP}
        helpLabel="Aide sur l’état ou la transformation du Produit"
        id="product-variant-processing"
        label="État / transformation"
      >
        <Input
          className={floatingLabels ? 'h-12 placeholder:text-transparent focus:placeholder:text-muted-foreground' : undefined}
          disabled={disabled}
          id="product-variant-processing"
          maxLength={80}
          onChange={(event) => change('processingState', event.target.value)}
          placeholder="Ex. cru, précuit, cuit, prêt à cuire"
          value={value.processingState}
        />
      </ProductVariantField>

      <ProductVariantField
        filled={Boolean(value.yieldPercent)}
        floating={floatingLabels}
        id="product-variant-yield"
        label="Rendement (%)"
      >
        <Input
          className={floatingLabels ? 'h-12 placeholder:text-transparent focus:placeholder:text-muted-foreground' : undefined}
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
      </ProductVariantField>
    </div>
  );
}

export {
  EMPTY_OPTION,
  ProductVariantFields,
  createEmptyVariantDraft,
  variantDraftToPayload,
};
