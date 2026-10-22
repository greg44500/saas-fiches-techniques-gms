import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  ProductVariantFields,
  createEmptyVariantDraft,
  variantDraftToPayload,
} from '@/features/products/components/product-variant-fields';

const metadata = {
  productCharacteristicKinds: [
    { value: 'PRESENTATION', label: 'Présentation' },
    { value: 'SIZE_FORMAT', label: 'Calibre / format' },
  ],
  conservationTypes: [
    { value: 'FRAIS', label: 'Frais' },
    { value: 'SEC', label: 'Sec' },
  ],
  referenceUnits: [
    { value: 'KG', label: 'kg' },
    { value: 'UNIT', label: 'unité' },
  ],
  foodRanges: [
    { value: 1, label: 'Gamme 1', name: 'Frais' },
    { value: 6, label: 'Gamme 6', name: 'PAI / PAE' },
  ],
};

const dimensions = {
  varieties: [
    { id: 'variety-gala', name: 'Gala', status: 'ACTIVE' },
  ],
  characteristics: [
    {
      id: 'presentation-quartiers',
      kind: 'PRESENTATION',
      name: 'En quartiers',
      status: 'ACTIVE',
    },
    {
      id: 'size-mini',
      kind: 'SIZE_FORMAT',
      name: 'Mini',
      status: 'ACTIVE',
    },
  ],
};

async function openSelect(user, label) {
  const trigger = screen.getByLabelText(label);

  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 24, y: 24, width: 240, height: 40 }),
  );

  await user.click(trigger);

  return trigger;
}

function StructuredHarness({
  availableDimensions = dimensions,
  onPayload,
}) {
  const [value, setValue] = useState(() => createEmptyVariantDraft(
    metadata,
    { structured: true },
  ));

  return (
    <>
      <ProductVariantFields
        dimensions={availableDimensions}
        metadata={metadata}
        onChange={setValue}
        structured
        value={value}
      />
      <button
        onClick={() => onPayload(
          variantDraftToPayload(value, { structured: true }),
        )}
        type="button"
      >
        Exporter
      </button>
    </>
  );
}

describe('ProductVariantFields', () => {
  it('active les libellés outlined uniquement sur demande, sans changer les contrôles', () => {
    const onChange = vi.fn();
    render(
      <ProductVariantFields
        floatingLabels
        metadata={metadata}
        onChange={onChange}
        structured
        value={{
          ...createEmptyVariantDraft(metadata, { structured: true }),
          name: 'Croissant individuel PAI',
        }}
      />,
    );

    const name = screen.getByLabelText('Nom de la référence *');
    const label = screen.getByText('Nom de la référence *');
    const unit = screen.getByLabelText('Unité de référence *');
    const processing = screen.getByLabelText('État / transformation');

    expect(name).toHaveClass('h-12');
    expect(unit).toHaveClass('h-12');
    expect(label).toHaveClass('text-xs', 'bg-popover');
    expect(processing.closest('[data-slot="field"]'))
      .toHaveClass('group', 'relative', 'pt-2');
    expect(screen.getByRole('button', {
      name: 'Aide sur l’état ou la transformation du Produit',
    })).toBeInTheDocument();

    const processingField = processing.closest('[data-slot="field"]');
    const processingLabel = screen.getByText('État / transformation');
    expect(processingField).toHaveAttribute('data-label-state', 'empty');
    expect(processingLabel.parentElement).toHaveClass('top-8', 'group-focus-within:top-2');
    expect(processingLabel).toHaveClass('group-focus-within:text-xs');

    expect(name.closest('[data-slot="field"]')).toHaveAttribute('data-label-state', 'filled');
    const unavailableVariety = screen.getByLabelText('Variété');
    const unavailableField = unavailableVariety.closest('[data-slot="field"]');
    expect(unavailableVariety).toBeDisabled();
    expect(unavailableVariety).toHaveTextContent('Aucune variété disponible');
    expect(unavailableField).toHaveAttribute('data-label-state', 'empty');
    expect(screen.getByText('Variété').parentElement)
      .toHaveClass('top-8', 'group-hover:top-2');
    expect(screen.getByText('Variété'))
      .toHaveClass('group-hover:text-xs');
    expect(unavailableVariety.querySelector('span[class*="group-hover:opacity-100"]'))
      .toBeInTheDocument();
    const unavailableCharacteristic = screen.getByLabelText('Présentation');
    expect(unavailableCharacteristic).toBeDisabled();
    expect(unavailableCharacteristic.closest('[data-slot="field"]'))
      .toHaveAttribute('data-label-state', 'empty');
    expect(screen.getByText('Présentation').parentElement)
      .toHaveClass('top-8', 'group-hover:top-2');
  });

  it('remonte le libellé sur la bordure lorsqu’une sélection est renseignée', () => {
    const { rerender } = render(<StructuredHarness onPayload={vi.fn()} />);

    // Vérifier les deux modes successivement pour éviter deux champs
    // portant le même id HTML dans le DOM du test.
    const classic = screen.getByLabelText('Variété');
    expect(classic.closest('[data-slot="field"]')).not.toHaveAttribute('data-label-state');

    const value = createEmptyVariantDraft(metadata, { structured: true });
    const populated = {
      ...value,
      varietyId: dimensions.varieties[0].id,
    };
    rerender(
      <ProductVariantFields
        dimensions={dimensions}
        floatingLabels
        metadata={metadata}
        onChange={vi.fn()}
        structured
        value={populated}
      />,
    );
    expect(screen.getByLabelText('Variété').closest('[data-slot="field"]'))
      .toHaveAttribute('data-label-state', 'filled');
  });

  it('traite une caractéristique effacée comme un champ non renseigné', () => {
    render(
      <ProductVariantFields
        dimensions={dimensions}
        floatingLabels
        metadata={metadata}
        onChange={vi.fn()}
        structured
        value={{
          ...createEmptyVariantDraft(metadata, { structured: true }),
          characteristicIdsByKind: { PRESENTATION: '' },
        }}
      />,
    );

    const presentation = screen.getByLabelText('Présentation');
    expect(presentation).toHaveTextContent('Non renseigné');
    expect(presentation.closest('[data-slot="field"]'))
      .toHaveAttribute('data-label-state', 'empty');
    expect(screen.getByText('Présentation').parentElement)
      .toHaveClass('top-8', 'group-focus-within:top-2');
  });

  it('conserve les labels classiques en dehors du prototype', () => {
    render(
      <ProductVariantFields
        metadata={metadata}
        onChange={vi.fn()}
        value={createEmptyVariantDraft(metadata)}
      />,
    );

    expect(screen.getByLabelText('Nom de la référence *')).not.toHaveClass('h-12');
    expect(screen.getByText('Nom de la référence *')).not.toHaveClass('text-xs');
  });

  it('explique les dimensions métier sans imposer de valeur', () => {
    const onChange = vi.fn();
    const value = createEmptyVariantDraft(metadata);
    render(<ProductVariantFields
      metadata={metadata}
      onChange={onChange}
      value={value}
    />);
    expect(screen.getByRole('button', {
      name: 'Aide sur la présentation de la Référence Produit',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Aide sur l’état ou la transformation du Produit',
    })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ex. entier, en tranches, râpé'))
      .toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ex. cru, précuit, cuit, prêt à cuire'))
      .toBeInTheDocument();
  });

  it('porte un nom métier persistant et des dimensions facultatives', async () => {
    const user = userEvent.setup();
    const onPayload = vi.fn();

    render(<StructuredHarness onPayload={onPayload} />);

    await user.type(screen.getByLabelText('Nom de la référence *'), 'Pomme en quartiers');

    await openSelect(user, 'Variété');
    await user.click(await screen.findByRole('option', { name: 'Gala' }));

    await openSelect(user, 'Présentation');
    await user.click(await screen.findByRole('option', { name: 'En quartiers' }));

    await user.click(screen.getByRole('button', { name: 'Exporter' }));

    expect(onPayload).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Pomme en quartiers',
      conservationType: 'FRAIS',
      varietyId: 'variety-gala',
      characteristicIds: ['presentation-quartiers'],
      processingState: null,
      referenceUnit: 'KG',
    }));
  });

  it('distingue une liste vide d un choix volontairement non renseigné', () => {
    const onPayload = vi.fn();

    render(
      <StructuredHarness
        availableDimensions={{
          varieties: [],
          characteristics: [],
        }}
        onPayload={onPayload}
      />,
    );

    expect(screen.getByLabelText('Variété'))
      .toHaveTextContent('Aucune variété disponible');
    expect(screen.getByLabelText('Présentation'))
      .toHaveTextContent('Aucune valeur disponible');
    expect(screen.getByRole('button', {
      name: 'Aide sur la présentation de la Référence Produit',
    })).toBeInTheDocument();
    expect(screen.getByLabelText('Calibre / format'))
      .toHaveTextContent('Aucune valeur disponible');

    expect(screen.getByLabelText('Variété')).toBeDisabled();
    expect(screen.getByLabelText('Présentation')).toBeDisabled();
    expect(screen.getByLabelText('Calibre / format')).toBeDisabled();
  });

  it('présente UNIT comme pièce et envoie son libellé métier sans modifier le code canonique', async () => {
    const user = userEvent.setup();
    const onPayload = vi.fn();

    render(<StructuredHarness onPayload={onPayload} />);

    await openSelect(user, 'Unité de référence *');

    expect(
      await screen.findByRole('option', { name: 'pièce' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'unité' })).not.toBeInTheDocument();

    await user.click(await screen.findByRole('option', { name: 'pièce' }));
    await user.clear(screen.getByLabelText('Nom d’une unité'));
    await user.type(screen.getByLabelText('Nom d’une unité'), 'tranche');
    await user.clear(screen.getByLabelText('Nom de plusieurs unités'));
    await user.type(
      screen.getByLabelText('Nom de plusieurs unités'),
      'tranches',
    );
    await user.click(screen.getByRole('button', { name: 'Exporter' }));

    expect(onPayload).toHaveBeenCalledWith(expect.objectContaining({
      referenceUnit: 'UNIT',
      countUnitLabelSingular: 'tranche',
      countUnitLabelPlural: 'tranches',
    }));
  });

  it('n expose plus la gamme et ne l envoie pas dans le payload frontend', async () => {
    const user = userEvent.setup();
    const onPayload = vi.fn();

    render(<StructuredHarness onPayload={onPayload} />);

    expect(screen.getByLabelText('Conservation *')).toBeInTheDocument();
    expect(screen.queryByLabelText('Gamme')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Exporter' }));

    expect(onPayload.mock.calls[0][0]).not.toHaveProperty('foodRange');
  });
});
