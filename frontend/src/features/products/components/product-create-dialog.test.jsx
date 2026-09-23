import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  duplicateCheck: vi.fn(),
  createProduct: vi.fn(),
}));

vi.mock('@/features/products/api/product-catalog-api', () => ({
  useCreateProductMutation: () => [
    mocks.createProduct,
    { isLoading: false },
  ],
  useDuplicateCheckProductMutation: () => [
    mocks.duplicateCheck,
    { isLoading: false },
  ],
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useCreateProductReferenceMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
  useDuplicateCheckProductReferenceMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
}));

import { ProductCreateDialog } from '@/features/products/components/product-create-dialog';

const metadata = {
  categories: [{ id: 'category-1', name: 'Légumes', status: 'ACTIVE' }],
  productStatuses: [
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'ARCHIVED', label: 'Archivé' },
  ],
  referenceUnits: [{ value: 'KG', label: 'kg' }],
  foodRanges: [1, 2, 3, 4, 5],
};

function resolved(value) {
  return { unwrap: vi.fn().mockResolvedValue(value) };
}

describe('ProductCreateDialog', () => {
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
      candidates: [],
    }));

    render(
      <ProductCreateDialog
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
    await user.click(await screen.findByRole('button', { name: 'Ouvrir cette référence' }));

    expect(onUseExisting).toHaveBeenCalledWith('product-existing');
    expect(mocks.createProduct).not.toHaveBeenCalled();
  });

  it('exige la revue de tous les candidats et une catégorie active avant création', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();

    mocks.duplicateCheck.mockReturnValue(resolved({
      exactMatch: null,
      candidates: [
        { id: 'candidate-1', name: 'Carotte entière', category: { name: 'Légumes' } },
        { id: 'candidate-2', name: 'Carottes', category: { name: 'Légumes' } },
      ],
    }));
    mocks.createProduct.mockReturnValue(resolved({
      product: { id: 'product-new', name: 'Carotte nouvelle', status: 'ACTIVE' },
      variant: { id: 'variant-new', status: 'ACTIVE' },
    }));

    render(
      <ProductCreateDialog
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

    expect(screen.queryByRole('button', { name: 'Créer et ajouter au catalogue' }))
      .not.toBeInTheDocument();

    const reviews = await screen.findAllByRole('checkbox', { name: 'Différent' });
    await user.click(reviews[0]);
    await user.click(reviews[1]);

    const createButton = screen.getByRole('button', {
      name: 'Créer et ajouter au catalogue',
    });
    expect(createButton).toBeDisabled();

    await user.click(screen.getByLabelText('Catégorie principale *'));
    await user.click(screen.getByRole('option', { name: 'Légumes' }));
    await user.click(createButton);

    await waitFor(() => {
      expect(mocks.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'workspace-1',
          name: 'Carotte nouvelle',
          categoryId: 'category-1',
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
