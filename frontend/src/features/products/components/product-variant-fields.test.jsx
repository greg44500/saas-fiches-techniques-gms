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
