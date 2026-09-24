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
  referenceUnits: [{ value: 'KG', label: 'kg' }],
  foodRanges: [
    {
      value: 1,
      label: 'Gamme 1',
      name: 'Frais',
      processingStates: ['Produit frais'],
      defaultProcessingState: 'Produit frais',
    },
    {
      value: 6,
      label: 'Gamme 6',
      name: 'PAI / PAE',
      processingStates: ['PAI / PAE'],
      defaultProcessingState: 'PAI / PAE',
    },
  ],
};

function Harness() {
  const [value, setValue] = useState(() => createEmptyVariantDraft(metadata));

  return (
    <ProductVariantFields
      metadata={metadata}
      onChange={setValue}
      value={value}
    />
  );
}

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

function StructuredHarness({ onPayload }) {
  const [value, setValue] = useState(() => createEmptyVariantDraft(
    metadata,
    { structured: true },
  ));

  return (
    <>
      <ProductVariantFields
        dimensions={dimensions}
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
  it('sélectionne Variété et Caractéristiques par identifiants stables', async () => {
    const user = userEvent.setup();
    const onPayload = vi.fn();

    render(<StructuredHarness onPayload={onPayload} />);

    expect(screen.queryByLabelText('Présentation')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Variété'));
    await user.click(screen.getByRole('option', { name: 'Gala' }));

    await user.click(screen.getByLabelText('Présentation'));
    await user.click(screen.getByRole('option', { name: 'En quartiers' }));

    await user.click(screen.getByLabelText('Calibre / format'));
    await user.click(screen.getByRole('option', { name: 'Mini' }));

    await user.click(screen.getByLabelText('Gamme *'));
    await user.click(screen.getByRole('option', { name: 'Gamme 1 — Frais' }));

    await user.click(screen.getByRole('button', { name: 'Exporter' }));

    expect(onPayload).toHaveBeenCalledWith(expect.objectContaining({
      varietyId: 'variety-gala',
      characteristicIds: expect.arrayContaining([
        'presentation-quartiers',
        'size-mini',
      ]),
      foodRange: 1,
      processingState: 'Produit frais',
      referenceUnit: 'KG',
    }));
    expect(onPayload.mock.calls[0][0]).not.toHaveProperty('presentation');
  });

  it('pilote État / transformation depuis la gamme backend-driven', async () => {
    const user = userEvent.setup();

    render(<Harness />);

    expect(screen.getByLabelText('Présentation')).toBeInTheDocument();
    expect(screen.queryByLabelText('Conservation')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Gamme *'));
    await user.click(screen.getByRole('option', { name: 'Gamme 6 — PAI / PAE' }));

    expect(screen.getByLabelText('État / transformation'))
      .toHaveValue('PAI / PAE');
  });
});
