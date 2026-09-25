import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  updateVariety: vi.fn(),
  updateCharacteristic: vi.fn(),
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useUpdateProductReferenceVarietyMutation: () => [
    mocks.updateVariety,
    { isLoading: false },
  ],
  useUpdateProductReferenceCharacteristicMutation: () => [
    mocks.updateCharacteristic,
    { isLoading: false },
  ],
}));

import {
  ProductDimensionEditDialog,
  parseGovernedAliases,
} from '@/features/products/components/product-dimension-edit-dialog';

function resolved(value) {
  return {
    unwrap: vi.fn().mockResolvedValue(value),
  };
}

describe('ProductDimensionEditDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('déduplique les synonymes métier sans générer de formes de recherche', () => {
    expect(parseGovernedAliases(
      'Reinette grise, Reinette grise, Canada gris, ,',
    )).toEqual([
      'Reinette grise',
      'Canada gris',
    ]);
  });

  it('enregistre uniquement le libellé et les synonymes gouvernés d une Variété', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSaved = vi.fn();

    mocks.updateVariety.mockReturnValue(resolved({
      id: 'variety-1',
      name: 'Reinette',
      aliases: ['Reinette grise', 'Canada gris'],
      status: 'ACTIVE',
    }));

    render(
      <ProductDimensionEditDialog
        dimension={{
          id: 'variety-1',
          name: 'Reinette',
          aliases: [],
          status: 'ACTIVE',
        }}
        onClose={onClose}
        onSaved={onSaved}
        open
        productId="product-1"
        type="VARIETY"
      />,
    );

    await user.type(
      screen.getByLabelText('Synonymes métier'),
      'Reinette grise, Reinette grise, Canada gris',
    );
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(mocks.updateVariety).toHaveBeenCalledWith({
      productId: 'product-1',
      varietyId: 'variety-1',
      name: 'Reinette',
      aliases: ['Reinette grise', 'Canada gris'],
    });
    expect(mocks.updateCharacteristic).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({
      id: 'variety-1',
    }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
