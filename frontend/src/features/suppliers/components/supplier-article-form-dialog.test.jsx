import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  createArticle: vi.fn(),
  metadataQuery: vi.fn(),
}));

vi.mock('@/features/products/api/product-catalog-api', () => ({
  useGetProductMetadataQuery: mocks.metadataQuery,
}));

vi.mock('@/features/products/components/product-search-autocomplete', () => ({
  ProductSearchAutocomplete: ({ onSelect, onValueChange }) => (
    <button
      onClick={() => {
        const result = {
          product: { id: 'product-abricot', name: 'Abricot' },
          variant: {
            id: 'variant-abricot',
            name: 'Abricot',
            referenceUnit: 'KG',
          },
        };

        onSelect(result);
        onValueChange('Abricot');
      }}
      type="button"
    >
      Choisir Abricot
    </button>
  ),
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useCreateSupplierArticleMutation: () => [
    mocks.createArticle,
    { isLoading: false },
  ],
}));

import {
  SupplierArticleFormDialog,
} from '@/features/suppliers/components/supplier-article-form-dialog';

function renderDialog(onSaved = vi.fn()) {
  return render(
    <TooltipProvider>
      <SupplierArticleFormDialog
        onClose={vi.fn()}
        onSaved={onSaved}
        open
        suppliers={[{
          id: 'supplier-1',
          name: 'Sysco',
        }]}
        workspaceId="workspace-1"
      />
    </TooltipProvider>,
  );
}

describe('SupplierArticleFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.metadataQuery.mockReturnValue({
      data: {
        referenceUnits: [
          { value: 'KG', label: 'kg' },
          { value: 'UNIT', label: 'unité' },
        ],
      },
    });
    mocks.createArticle.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        id: 'article-1',
      }),
    });
  });

  it('conserve la Référence Produit choisie quand l autocomplete applique son libellé', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();

    renderDialog(onSaved);

    await user.click(screen.getByRole('combobox', {
      name: 'Sélectionner le Fournisseur',
    }));
    await user.click(screen.getByRole('option', { name: 'Sysco' }));

    await user.click(screen.getByRole('button', { name: 'Choisir Abricot' }));

    await user.type(
      screen.getByLabelText('Référence fournisseur'),
      'ABR-001',
    );

    await user.click(screen.getByRole('button', {
      name: 'Créer l’Article',
    }));

    expect(mocks.createArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        supplierId: 'supplier-1',
        productVariantId: 'variant-abricot',
        supplierReference: 'ABR-001',
      }),
    );
    expect(onSaved).toHaveBeenCalledWith({ id: 'article-1' });
  });

  it('présente une aide métier sans jargon M-002 et affiche UNIT comme PCE', async () => {
    const user = userEvent.setup();

    renderDialog();

    expect(screen.getByRole('button', {
      name: 'À propos de l’Article fournisseur',
    })).toBeInTheDocument();
    expect(screen.getByText(
      'Recherchez puis sélectionnez le Produit correspondant à cet Article fournisseur.',
    )).toBeInTheDocument();
    expect(screen.queryByText(/M-002/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox', {
      name: 'Unité du conditionnement',
    }));

    expect(screen.getByRole('option', { name: 'PCE' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'UNIT' })).not.toBeInTheDocument();
  });
});
