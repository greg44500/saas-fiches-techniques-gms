import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useUpdateProductReferenceVariantMutation: () => [
    mocks.update, { isLoading: false },
  ],
  useGetProductReferenceDimensionsQuery: () => ({
    data: { varieties: [], characteristics: [] },
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/products/components/product-variant-fields', () => ({
  ProductVariantFields: ({ onChange, value }) => (
    <label>
      Unité de référence
      <select
        onChange={(event) => onChange({
          ...value, referenceUnit: event.target.value,
        })}
        value={value.referenceUnit}
      >
        <option value="KG">kg</option>
        <option value="UNIT">pièce</option>
      </select>
    </label>
  ),
  variantDraftToPayload: (draft) => ({
    name: draft.name,
    referenceUnit: draft.referenceUnit,
    conservationType: draft.conservationType,
  }),
}));

vi.mock('@/features/products/components/product-dimension-contribution-dialog', () => ({
  ProductDimensionContributionDialog: () => null,
}));

import {
  ProductReferenceVariantEditDialog,
} from './product-reference-variant-edit-dialog';

const variant = {
  id: 'variant-1',
  name: 'Croissant individuel PAI',
  referenceUnit: 'KG',
  conservationType: 'SURGELE',
  countUnitLabelSingular: null,
  countUnitLabelPlural: null,
};

describe('M-002 correction encadrée de l’unité de référence', () => {
  beforeEach(() => {
    mocks.update.mockReset();
    mocks.update.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ id: variant.id }),
    });
  });

  it('exige une confirmation avant de modifier une unité avec conséquences économiques', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <ProductReferenceVariantEditDialog
          metadata={{}}
          onClose={vi.fn()}
          onSaved={vi.fn()}
          open
          productId="product-1"
          variant={variant}
        />
      </TooltipProvider>,
    );

    await user.selectOptions(screen.getByLabelText('Unité de référence'), 'UNIT');
    expect(screen.getByText('Correction de l’unité de recette')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(screen.getByText(/Confirmez la correction/)).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', {
      name: 'Je confirme vouloir corriger l’unité de cette référence.',
    }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      productId: 'product-1',
      variantId: 'variant-1',
      referenceUnit: 'UNIT',
      confirmSupplierArticleRevaluation: true,
    }));
  });

  it('ne demande pas de confirmation pour la correction du nom sans changement d’unité', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <ProductReferenceVariantEditDialog
          metadata={{}}
          onClose={vi.fn()}
          onSaved={vi.fn()}
          open
          productId="product-1"
          variant={variant}
        />
      </TooltipProvider>,
    );
    expect(screen.queryByText('Correction de l’unité de recette'))
      .not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ confirmSupplierArticleRevaluation: true }),
    );
  });
});
