import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  suggest: vi.fn(),
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useCreateProductReferenceCategoryMutation: () => [
    mocks.create, { isLoading: false },
  ],
  useUpdateProductReferenceCategoryMutation: () => [
    mocks.update, { isLoading: false },
  ],
  useGetProductReferenceCategorySuggestionsQuery: (args, options) => (
    options.skip
      ? { currentData: null, isError: false, isFetching: false }
      : mocks.suggest(args)
  ),
}));

import {
  ProductReferenceCategoryDialog,
} from '@/features/products/components/product-reference-category-dialog';

describe('ProductReferenceCategoryDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.suggest.mockImplementation(({ name }) => ({
      currentData: {
        exactMatch: name === 'Epicerie'
          ? { id: 'c1', name: 'Épicerie', status: 'ACTIVE' } : null,
        candidates: name === 'Épiserie'
          ? [{ id: 'c1', name: 'Épicerie', status: 'ACTIVE' }] : [],
      },
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    }));
    mocks.create.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ id: 'new', name: 'Épiserie' }),
    });
  });

  it('retire le sous-titre inutile et conserve les contrôles accessibles', async () => {
    render(
      <ProductReferenceCategoryDialog
        onClose={vi.fn()}
        onSaved={vi.fn()}
        open
      />,
    );
    expect(screen.getByText('Créer une catégorie')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nom' })).toBeInTheDocument();
    expect(screen.queryByText('La taxonomie M-002 est globale et plate.'))
      .not.toBeInTheDocument();
  });

  it('propose la catégorie existante et empêche une création équivalente', async () => {
    const user = userEvent.setup();
    const onUseExisting = vi.fn();
    render(
      <ProductReferenceCategoryDialog
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onUseExisting={onUseExisting}
        open
      />,
    );
    await user.type(screen.getByRole('textbox', { name: 'Nom' }), 'Epicerie');
    expect(await screen.findByText('Cette catégorie existe déjà :'))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Voir cette catégorie' }));
    expect(onUseExisting).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c1', name: 'Épicerie' }),
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('permet une catégorie proche seulement après confirmation explicite', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(
      <ProductReferenceCategoryDialog
        onClose={vi.fn()}
        onSaved={onSaved}
        onUseExisting={vi.fn()}
        open
      />,
    );
    await user.type(screen.getByRole('textbox', { name: 'Nom' }), 'Épiserie');
    expect(await screen.findByText('Catégories proches existantes'))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', {
      name: /ma catégorie est différente/i,
    }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledWith({
        name: 'Épiserie',
        reviewedCandidateIds: ['c1'],
      });
    });
    expect(onSaved).toHaveBeenCalled();
  });
});
