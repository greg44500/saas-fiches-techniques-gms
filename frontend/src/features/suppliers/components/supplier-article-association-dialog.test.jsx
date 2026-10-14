import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ update: vi.fn() }));

vi.mock('@/features/products/api/product-catalog-api', () => ({
  useGetProductMetadataQuery: () => ({ data: {} }),
}));
vi.mock('@/features/products/components/product-search-autocomplete', () => ({
  ProductSearchAutocomplete: () => <input aria-label="Rechercher un Produit" />,
}));
vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useUpdateSupplierArticleMutation: () => [
    mocks.update, { isLoading: false },
  ],
}));

import { SupplierArticleAssociationDialog } from './supplier-article-association-dialog';

describe('SupplierArticleAssociationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
  });

  it('autorise le retrait d’une association déjà présente', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<SupplierArticleAssociationDialog
      article={{
        id: 'article-1',
        supplierReference: 'REF-42',
        supplierDesignation: 'Farine',
        productVariant: { id: 'variant-1', name: 'Farine de blé' },
      }}
      onClose={vi.fn()}
      onSaved={onSaved}
      open
      workspaceId="workspace-1"
    />);
    expect(screen.getByText(/Association actuelle/)).toHaveTextContent('Farine de blé');
    await user.click(screen.getByRole('button', { name: 'Retirer l’association' }));
    expect(mocks.update).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      articleId: 'article-1',
      productVariantId: null,
    });
    expect(onSaved).toHaveBeenCalledOnce();
  });
});
