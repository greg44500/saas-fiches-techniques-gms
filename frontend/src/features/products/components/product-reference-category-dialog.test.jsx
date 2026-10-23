import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/products/api/product-reference-api', () => ({
  useCreateProductReferenceCategoryMutation: () => [
    vi.fn(), { isLoading: false },
  ],
  useUpdateProductReferenceCategoryMutation: () => [
    vi.fn(), { isLoading: false },
  ],
}));

import {
  ProductReferenceCategoryDialog,
} from '@/features/products/components/product-reference-category-dialog';

describe('ProductReferenceCategoryDialog', () => {
  it('supprime le sous-titre technique visible sans perdre la description accessible', async () => {
    render(
      <ProductReferenceCategoryDialog
        onClose={vi.fn()}
        onSaved={vi.fn()}
        open
      />,
    );

    expect(await screen.findByText('Créer une catégorie')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nom' })).toBeInTheDocument();
    expect(screen.queryByText('La taxonomie M-002 est globale et plate.'))
      .not.toBeInTheDocument();
    expect(screen.getByText('Renseignez un nom unique pour cette catégorie.'))
      .toHaveClass('sr-only');
  });
});
