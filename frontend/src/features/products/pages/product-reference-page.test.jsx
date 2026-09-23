import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  metadataQuery: vi.fn(),
  productsQuery: vi.fn(),
  updateCategoryStatus: vi.fn(),
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useGetProductReferenceMetadataQuery: mocks.metadataQuery,
  useListProductReferenceProductsQuery: mocks.productsQuery,
  useUpdateProductReferenceCategoryStatusMutation: () => [
    mocks.updateCategoryStatus,
    { isLoading: false },
  ],
}));

vi.mock('@/features/products/components/product-reference-details-drawer', () => ({
  ProductReferenceDetailsDrawer: ({ open }) => (
    open ? <div>Détail global ouvert</div> : null
  ),
}));

vi.mock('@/features/products/components/product-reference-category-dialog', () => ({
  ProductReferenceCategoryDialog: ({ open }) => (
    open ? <div>Catégorie globale ouverte</div> : null
  ),
}));

import { ProductReferencePage } from '@/features/products/pages/product-reference-page';

const metadata = {
  categories: [{ id: 'category-1', name: 'Légumes', status: 'ACTIVE' }],
  productStatuses: [
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'PENDING_REVIEW', label: 'En validation' },
    { value: 'ARCHIVED', label: 'Archivé' },
  ],
};

const product = {
  id: 'product-1',
  name: 'Carotte',
  aliases: ['Carottes'],
  category: { id: 'category-1', name: 'Légumes', status: 'ACTIVE' },
  status: 'PENDING_REVIEW',
  updatedAt: '2026-09-23T08:00:00.000Z',
};

function renderPage({ canManage = false } = {}) {
  return render(
    <TooltipProvider>
      <ToastProvider>
        <ProductReferencePage canManage={canManage} />
      </ToastProvider>
    </TooltipProvider>,
  );
}

describe('ProductReferencePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.metadataQuery.mockReturnValue({
      data: metadata,
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.productsQuery.mockReturnValue({
      data: {
        products: [product],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.updateCategoryStatus.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
  });

  it('ouvre par défaut la file des contributions en attente', () => {
    renderPage();

    expect(screen.getByText('Carotte')).toBeInTheDocument();
    expect(screen.getByText('Contributions en attente de décision')).toBeInTheDocument();
    expect(mocks.productsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PENDING_REVIEW',
        page: 1,
      }),
      { skip: false },
    );
  });

  it('bascule vers le référentiel actif', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Référentiel' }));

    expect(mocks.productsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'ACTIVE',
      }),
      { skip: false },
    );
  });

  it('conserve la gestion des catégories en lecture seule sans product:reference:manage', async () => {
    const user = userEvent.setup();
    renderPage({ canManage: false });

    await user.click(screen.getByRole('tab', { name: 'Catégories' }));

    expect(screen.getByText('Légumes')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Créer une catégorie' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Renommer Légumes' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archiver' }))
      .not.toBeInTheDocument();
  });

  it('active les actions de catégories avec product:reference:manage', async () => {
    const user = userEvent.setup();
    renderPage({ canManage: true });

    await user.click(screen.getByRole('tab', { name: 'Catégories' }));

    expect(screen.getByRole('button', { name: 'Créer une catégorie' }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Renommer Légumes' }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archiver' }))
      .toBeInTheDocument();
  });

  it('ouvre le détail global depuis la liste', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir Carotte' }));

    expect(screen.getByText('Détail global ouvert')).toBeInTheDocument();
  });
});
