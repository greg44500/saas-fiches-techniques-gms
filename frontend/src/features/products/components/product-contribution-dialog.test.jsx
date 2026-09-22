import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  duplicateCheck: vi.fn(),
  contributeProduct: vi.fn(),
}));

vi.mock('@/features/products/api/product-catalog-api', () => ({
  useContributeProductMutation: () => [
    mocks.contributeProduct,
    { isLoading: false },
  ],
  useDuplicateCheckProductMutation: () => [
    mocks.duplicateCheck,
    { isLoading: false },
  ],
}));

import { ProductContributionDialog } from '@/features/products/components/product-contribution-dialog';

const metadata = {
  categories: [{ id: 'category-1', name: 'Légumes' }],
  productStatuses: [
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'PENDING_REVIEW', label: 'En validation' },
  ],
  referenceUnits: [{ value: 'KG', label: 'kg' }],
  foodRanges: [1, 2, 3, 4, 5],
};

function resolved(value) {
  return { unwrap: vi.fn().mockResolvedValue(value) };
}

describe('ProductContributionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('privilégie une correspondance exacte au lieu de créer un doublon', async () => {
    const user = userEvent.setup();
    const onUseExisting = vi.fn();

    mocks.duplicateCheck.mockReturnValue(resolved({
      exactMatch: {
        id: 'product-existing',
        name: 'Carotte',
        aliases: [],
        category: { id: 'category-1', name: 'Légumes' },
        status: 'ACTIVE',
      },
      privateConflict: false,
      candidates: [],
    }));

    render(
      <ProductContributionDialog
        metadata={metadata}
        onClose={vi.fn()}
        onCreated={vi.fn()}
        onUseExisting={onUseExisting}
        open
        workspaceId="workspace-1"
      />,
    );

    await user.type(screen.getByLabelText('Nom du Produit'), 'Carotte');
    await user.click(screen.getByRole('button', { name: 'Rechercher l’existant' }));
    await user.click(await screen.findByRole('button', { name: 'Utiliser cette référence' }));

    expect(onUseExisting).toHaveBeenCalledWith('product-existing');
    expect(mocks.contributeProduct).not.toHaveBeenCalled();
  });

  it('exige la revue de tous les Produits proches avant création', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();

    mocks.duplicateCheck.mockReturnValue(resolved({
      exactMatch: null,
      privateConflict: false,
      candidates: [
        { id: 'candidate-1', name: 'Carotte entière', category: { name: 'Légumes' } },
        { id: 'candidate-2', name: 'Carottes', category: { name: 'Légumes' } },
      ],
    }));
    mocks.contributeProduct.mockReturnValue(resolved({
      product: { id: 'product-new', name: 'Carotte nouvelle' },
      variant: { id: 'variant-new' },
    }));

    render(
      <ProductContributionDialog
        metadata={metadata}
        onClose={vi.fn()}
        onCreated={onCreated}
        onUseExisting={vi.fn()}
        open
        workspaceId="workspace-1"
      />,
    );

    await user.type(screen.getByLabelText('Nom du Produit'), 'Carotte nouvelle');
    await user.click(screen.getByRole('button', { name: 'Rechercher l’existant' }));

    expect(screen.queryByRole('button', { name: 'Envoyer en validation' }))
      .not.toBeInTheDocument();

    const reviews = await screen.findAllByRole('checkbox', { name: 'Différent' });
    await user.click(reviews[0]);

    expect(screen.queryByRole('button', { name: 'Envoyer en validation' }))
      .not.toBeInTheDocument();

    await user.click(reviews[1]);
    await user.click(screen.getByRole('button', { name: 'Envoyer en validation' }));

    await waitFor(() => {
      expect(mocks.contributeProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'workspace-1',
          name: 'Carotte nouvelle',
          reviewedCandidateIds: ['candidate-1', 'candidate-2'],
          variant: expect.objectContaining({
            referenceUnit: 'KG',
          }),
        }),
      );
    });
    expect(onCreated).toHaveBeenCalled();
  });
});
