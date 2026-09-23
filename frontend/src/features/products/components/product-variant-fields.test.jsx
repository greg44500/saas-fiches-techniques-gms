import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  ProductVariantFields,
  createEmptyVariantDraft,
} from '@/features/products/components/product-variant-fields';

const metadata = {
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

describe('ProductVariantFields', () => {
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
