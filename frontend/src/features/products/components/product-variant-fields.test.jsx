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
  referenceUnits: [{ value: 'KG', label: 'kg' }],
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
  it('porte un nom métier persistant et des dimensions facultatives', async () => {
    const user = userEvent.setup();
    const onPayload = vi.fn();

    render(<StructuredHarness onPayload={onPayload} />);

    await user.type(screen.getByLabelText('Nom de la référence *'), 'Pomme en quartiers');

    await user.click(screen.getByLabelText('Variété'));
    await user.click(screen.getByRole('option', { name: 'Gala' }));

    await user.click(screen.getByLabelText('Présentation'));
    await user.click(screen.getByRole('option', { name: 'En quartiers' }));

    await user.click(screen.getByRole('button', { name: 'Exporter' }));

    expect(onPayload).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Pomme en quartiers',
      conservationType: 'FRAIS',
      varietyId: 'variety-gala',
      characteristicIds: ['presentation-quartiers'],
      foodRange: null,
      processingState: null,
      referenceUnit: 'KG',
    }));
  });

  it('rend la gamme facultative et ne pilote plus l état depuis la gamme', async () => {
    const user = userEvent.setup();
    const onPayload = vi.fn();

    render(<StructuredHarness onPayload={onPayload} />);

    expect(screen.getByLabelText('Conservation *')).toBeInTheDocument();
    expect(screen.getByLabelText('État / transformation')).toHaveValue('');

    await user.click(screen.getByLabelText('Gamme'));
    await user.click(screen.getByRole('option', { name: 'Gamme 6 — PAI / PAE' }));

    expect(screen.getByLabelText('État / transformation')).toHaveValue('');

    await user.click(screen.getByRole('button', { name: 'Exporter' }));
    expect(onPayload.mock.calls[0][0].foodRange).toBe(6);
  });
});
