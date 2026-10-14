import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  check: vi.fn(),
  create: vi.fn(),
  createVariant: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/features/products/api/product-catalog-api', () => ({
  useGetProductMetadataQuery: () => ({ data: {} }),
}));
vi.mock('@/features/products/components/product-create-dialog', () => ({
  ProductCreateDialog: ({
    createRequest, duplicateCheckRequest, initialName, onCreated,
    onUseCandidate, onUseExisting, open,
  }) => open && (
    <div>
      <span>Nom proposé : {initialName}</span>
      <button onClick={() => duplicateCheckRequest({ name: 'Croissant', aliases: [] })} type="button">
        Vérifier le Produit
      </button>
      <button onClick={async () => {
        const result = await createRequest({ name: 'Croissant', variant: {} });
        onCreated(result);
      }} type="button">Créer le Produit</button>
      <button onClick={() => onUseExisting('parent-1', {
        id: 'parent-1', name: 'Croissant', status: 'ACTIVE',
      })} type="button">Utiliser un Produit parent</button>
      <button onClick={() => onUseCandidate('parent-2', {
        id: 'parent-2', name: 'Croissant cru', status: 'ACTIVE',
      })} type="button">Utiliser un Produit proche</button>
      <button onClick={() => onUseExisting('parent-1', {
        id: 'parent-1', name: 'Croissant', variantId: 'variant-existing',
        status: 'ACTIVE',
      })} type="button">Utiliser la Référence existante</button>
    </div>
  ),
}));
vi.mock('@/features/products/components/product-variant-create-dialog', () => ({
  ProductVariantCreateDialog: ({ createRequest, onCreated, open, product }) =>
    open && (
      <div>
        <span>Produit parent : {product.name}</span>
        <button onClick={async () => {
          const result = await createRequest({ productId: product.id, name: 'Croissant PAI' });
          onCreated(result);
        }} type="button">Créer une Référence fille</button>
      </div>
    ),
}));
vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useGetSupplierArticleProductMetadataQuery: () => ({ data: {} }),
  useGetSupplierArticleProductDimensionsQuery: () => ({
    data: { varieties: [], characteristics: [] },
  }),
  useCheckSupplierArticleProductDuplicateMutation: () => [mocks.check],
  useCreateSupplierArticleProductMutation: () => [mocks.create],
  useCreateSupplierArticleProductVariantMutation: () => [mocks.createVariant],
  useUpdateSupplierArticleMutation: () => [mocks.update, { isLoading: false }],
}));

import { SupplierArticleProductCreationFlow } from './supplier-article-product-creation-flow';

const article = { id: 'article-1', supplierReference: '43279' };
const setup = () => {
  const onAssociated = vi.fn();
  const onClose = vi.fn();
  render(<SupplierArticleProductCreationFlow
    article={article}
    initialName="Croissant individuel PAI"
    onAssociated={onAssociated}
    onClose={onClose}
    workspaceId="workspace-1"
  />);
  return { onAssociated, onClose };
};

describe('M-002/M-003 création Produit depuis l’Article', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.check.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ candidates: [] }) });
    mocks.create.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({
      classification: 'PROVISIONAL',
      provisionalReference: {
        id: 'parent-new', variant: { id: 'variant-new', name: 'Croissant' },
      },
    }) });
    mocks.createVariant.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({
      classification: 'PROVISIONAL', variant: { id: 'variant-child' },
    }) });
    mocks.update.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
  });

  it('crée et associe immédiatement sans doubler la contribution', async () => {
    const user = userEvent.setup();
    const { onAssociated } = setup();
    expect(screen.getByText(/Nom proposé : Croissant individuel PAI/))
      .toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Vérifier le Produit' }));
    await waitFor(() => expect(mocks.check).toHaveBeenCalledWith({
      workspaceId: 'workspace-1', articleId: 'article-1',
      name: 'Croissant', aliases: [],
    }));
    await user.click(screen.getByRole('button', { name: 'Créer le Produit' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({
      workspaceId: 'workspace-1', articleId: 'article-1',
      productVariantId: 'variant-new',
    }));
    await waitFor(() => expect(onAssociated).toHaveBeenCalledOnce());
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it('réutilise un Produit parent puis crée une seule Référence', async () => {
    const user = userEvent.setup();
    const { onAssociated } = setup();
    await user.click(screen.getByRole('button', { name: 'Utiliser un Produit parent' }));
    expect(screen.getByText('Produit parent : Croissant')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Créer une Référence fille' }));
    await waitFor(() => expect(mocks.createVariant).toHaveBeenCalledWith({
      workspaceId: 'workspace-1', articleId: 'article-1',
      productId: 'parent-1', name: 'Croissant PAI',
    }));
    await waitFor(() => expect(onAssociated).toHaveBeenCalledOnce());
    expect(mocks.update).toHaveBeenCalledWith({
      workspaceId: 'workspace-1', articleId: 'article-1',
      productVariantId: 'variant-child',
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('associe directement une Référence existante', async () => {
    const user = userEvent.setup();
    const { onAssociated } = setup();
    await user.click(screen.getByRole('button', { name: 'Utiliser la Référence existante' }));
    await waitFor(() => expect(onAssociated).toHaveBeenCalledOnce());
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.createVariant).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith({
      workspaceId: 'workspace-1', articleId: 'article-1',
      productVariantId: 'variant-existing',
    });
  });

  it('permet de réessayer une association échouée sans recréer la Référence', async () => {
    const user = userEvent.setup();
    mocks.update.mockReturnValueOnce({
      unwrap: vi.fn().mockRejectedValue({ data: { message: 'Échec transitoire' } }),
    }).mockReturnValueOnce({ unwrap: vi.fn().mockResolvedValue({}) });
    const { onAssociated } = setup();
    await user.click(screen.getByRole('button', { name: 'Créer le Produit' }));
    await screen.findByRole('button', { name: 'Réessayer l’association' });
    await user.click(screen.getByRole('button', { name: 'Réessayer l’association' }));
    await waitFor(() => expect(onAssociated).toHaveBeenCalledOnce());
    expect(mocks.update).toHaveBeenCalledTimes(2);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});
