import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ update: vi.fn(), search: vi.fn() }));

vi.mock('@/features/products/api/product-catalog-api', () => ({
  useGetProductMetadataQuery: () => ({ data: {} }),
}));
vi.mock('@/features/products/components/product-search-autocomplete', () => ({
  ProductSearchAutocomplete: ({ descriptionId, onValueChange, onDebouncedSearchChange }) => (
    <input
      aria-describedby={descriptionId}
      aria-label="Rechercher un Produit"
      onChange={(event) => {
        onValueChange(event.target.value);
        onDebouncedSearchChange?.(event.target.value.trim());
      }}
    />
  ),
}));
vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useGetSupplierArticleProductMetadataQuery: () => ({ data: {} }),
  useSearchSupplierArticleProductsQuery: mocks.search,
  useUpdateSupplierArticleMutation: () => [
    mocks.update, { isLoading: false },
  ],
}));

import { SupplierArticleAssociationDialog } from './supplier-article-association-dialog';

describe('SupplierArticleAssociationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.search.mockReturnValue({
      data: { results: [] }, isFetching: false, isSuccess: true, isError: false,
    });
    mocks.update.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
  });

  it('propose une création contextuelle uniquement quand le droit import est fourni', async () => {
    const user = userEvent.setup();
    const onCreateProduct = vi.fn();
    const article = {
      id: 'article-1', supplierReference: '43279',
      supplierDesignation: 'Croissant 120 g', productVariant: null,
    };
    const { rerender } = render(<SupplierArticleAssociationDialog
      article={article}
      onClose={vi.fn()}
      onCreateProduct={onCreateProduct}
      onSaved={vi.fn()}
      open
      workspaceId="workspace-1"
    />);
    const articleContext = screen.getByRole('region', {
      name: 'Article fournisseur concerné',
    });
    expect(articleContext).toHaveTextContent('Croissant 120 g');
    expect(articleContext).toHaveTextContent('Réf. fournisseur : 43279');
    expect(articleContext).toHaveClass('bg-muted/25');
    expect(screen.getByText('Saisissez au moins 3 caractères'))
      .toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Rechercher un Produit' }))
      .toHaveAttribute('aria-describedby', screen.getByText('Saisissez au moins 3 caractères').id);
    expect(screen.queryByRole('button', { name: 'Créer une Référence Produit' }))
      .not.toBeInTheDocument();
    rerender(<SupplierArticleAssociationDialog
      article={article}
      canCreateProduct
      onClose={vi.fn()}
      onCreateProduct={onCreateProduct}
      onSaved={vi.fn()}
      open
      workspaceId="workspace-1"
    />);
    expect(screen.queryByRole('button', { name: 'Créer la Référence manquante' }))
      .not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Rechercher un Produit' }), 'Cr');
    expect(screen.getByText('Saisissez au moins 3 caractères'))
      .toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Créer la Référence manquante' }))
      .not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Rechercher un Produit' }), 'oissant');
    expect(screen.queryByText('Saisissez au moins 3 caractères'))
      .not.toBeInTheDocument();
    expect(screen.getByText(/Aucune Référence Produit trouvée pour/))
      .toHaveClass('font-medium');
    await user.click(screen.getByRole('button', { name: 'Créer la Référence manquante' }));
    expect(onCreateProduct).toHaveBeenCalledWith('Croissant');
  });

  it('permet de créer une Référence différente seulement après examen de suggestions', async () => {
    const user = userEvent.setup();
    const onCreateProduct = vi.fn();
    mocks.search.mockReturnValue({
      data: { results: [{ variant: { id: 'variant-1' } }] },
      isFetching: false, isSuccess: true, isError: false,
    });
    render(<SupplierArticleAssociationDialog
      article={{ id: 'article-1', supplierReference: 'REF-1' }}
      canCreateProduct
      onClose={vi.fn()}
      onCreateProduct={onCreateProduct}
      onSaved={vi.fn()}
      open
      workspaceId="workspace-1"
    />);
    expect(screen.queryByRole('button', { name: 'Créer une Référence différente' }))
      .not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Rechercher un Produit' }), 'Croissant');
    await user.click(screen.getByRole('button', { name: 'Créer une Référence différente' }));
    expect(onCreateProduct).toHaveBeenCalledWith('Croissant');
  });

  it('interdit la création en cas d’échec de recherche', async () => {
    const user = userEvent.setup();
    mocks.search.mockReturnValue({
      data: undefined, isFetching: false, isSuccess: false, isError: true,
    });
    render(<SupplierArticleAssociationDialog
      article={{ id: 'article-1', supplierReference: 'REF-1' }}
      canCreateProduct
      onClose={vi.fn()}
      onCreateProduct={vi.fn()}
      onSaved={vi.fn()}
      open
      workspaceId="workspace-1"
    />);
    await user.type(screen.getByRole('textbox', { name: 'Rechercher un Produit' }), 'Croissant');
    expect(screen.getByRole('alert')).toHaveTextContent('La recherche est indisponible');
    expect(screen.queryByRole('button', { name: /Créer une Référence/ }))
      .not.toBeInTheDocument();
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
