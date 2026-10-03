import {
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
  workspaceContext: vi.fn(),
  productDetail: vi.fn(),
  listArticles: vi.fn(),
  listIndicative: vi.fn(),
  listSuppliers: vi.fn(),
  attachVariant: vi.fn(),
  archiveVariant: vi.fn(),
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: mocks.workspaceContext,
}));

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/components/shared/entity-details-drawer', () => ({
  EntityDetailsDrawer: ({
    children,
    open,
    title,
  }) => (
    open ? (
      <section>
        <h2>{title}</h2>
        {children}
      </section>
    ) : null
  ),
}));

vi.mock('@/components/shared/action-icon-button', () => ({
  ActionIconButton: ({
    disabled,
    label,
    onClick,
  }) => (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      type="button"
    />
  ),
}));

vi.mock('@/features/products/api/product-catalog-api', () => ({
  useGetWorkspaceProductDetailQuery: mocks.productDetail,
  useAttachProductVariantMutation: () => [
    mocks.attachVariant,
    { isLoading: false },
  ],
  useArchiveProductVariantMutation: () => [
    mocks.archiveVariant,
    { isLoading: false },
  ],
}));

vi.mock('@/features/products/components/product-variant-create-dialog', () => ({
  ProductVariantCreateDialog: ({ open }) => (
    open ? <div>Création Référence ouverte</div> : null
  ),
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useListSupplierArticlesQuery: mocks.listArticles,
  useListSuppliersQuery: mocks.listSuppliers,
  useListWorkspaceIndicativePricesQuery: mocks.listIndicative,
}));

vi.mock('@/features/suppliers/components/indicative-price-dialog', () => ({
  IndicativePriceDialog: ({ open, variant }) => (
    open ? <div>Prix indicatif · {variant?.name}</div> : null
  ),
}));

vi.mock('@/features/suppliers/components/supplier-article-form-dialog', () => ({
  SupplierArticleFormDialog: ({ initialProductVariant, open }) => (
    open ? (
      <div>
        Article fournisseur · {initialProductVariant?.name}
      </div>
    ) : null
  ),
}));

import {
  ProductDetailsDrawer,
} from '@/features/products/components/product-details-drawer';

function queryResult(data) {
  return {
    data,
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  };
}

const metadata = {
  productStatuses: [
    { value: 'ACTIVE', label: 'Actif' },
  ],
  workspaceProductStatuses: [
    { value: 'ACTIVE', label: 'Favori' },
  ],
  conservationTypes: [
    { value: 'FRAIS', label: 'Frais' },
    { value: 'SURGELE', label: 'Surgelé' },
  ],
  referenceUnits: [
    { value: 'KG', label: 'kg' },
  ],
};

function renderDrawer() {
  return render(
    <ProductDetailsDrawer
      metadata={metadata}
      onClose={vi.fn()}
      open
      productId="product-1"
      workspaceId="workspace-1"
    />,
  );
}

describe('ProductDetailsDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.workspaceContext.mockReturnValue({
      can: () => true,
      hasFeature: () => true,
    });
    mocks.productDetail.mockReturnValue(queryResult({
      product: {
        id: 'product-1',
        name: 'Abricot',
        aliases: ['Abricots'],
        category: { id: 'category-1', name: 'Fruits' },
        status: 'ACTIVE',
      },
      variants: [
        {
          id: 'variant-fresh',
          name: 'Abricot',
          conservationType: 'FRAIS',
          referenceUnit: 'KG',
          yieldPercent: null,
          status: 'ACTIVE',
          governanceStatus: 'APPROVED',
          workspaceEntry: {
            id: 'workspace-product-1',
            status: 'ACTIVE',
          },
        },
        {
          id: 'variant-puree',
          name: 'Purée d’abricots',
          conservationType: 'SURGELE',
          referenceUnit: 'KG',
          yieldPercent: 100,
          status: 'ACTIVE',
          governanceStatus: 'PROVISIONAL',
          workspaceEntry: null,
        },
      ],
    }));
    mocks.listArticles.mockReturnValue(queryResult({
      articles: [{
        id: 'article-1',
        supplierReference: 'ABR-001',
        supplier: {
          id: 'supplier-1',
          name: 'Sysco',
        },
        productVariant: {
          id: 'variant-fresh',
          name: 'Abricot',
        },
        packaging: {
          containerType: 'Carton',
          unitCount: 6,
          quantityPerUnit: '1',
          unit: 'KG',
        },
        status: 'ACTIVE',
      }],
      pagination: {
        page: 1,
        limit: 100,
        total: 1,
        totalPages: 1,
      },
    }));
    mocks.listIndicative.mockReturnValue(queryResult([{
      id: 'indicative-1',
      productVariant: {
        id: 'variant-fresh',
        name: 'Abricot',
      },
      normalizedAmount: '3.1',
      normalizedUnit: 'KG',
      currency: 'EUR',
      source: 'Estimation Workspace',
    }]));
    mocks.listSuppliers.mockReturnValue(queryResult({
      suppliers: [{
        id: 'supplier-1',
        name: 'Sysco',
      }],
      pagination: {
        page: 1,
        limit: 100,
        total: 1,
        totalPages: 1,
      },
    }));
    mocks.attachVariant.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
    mocks.archiveVariant.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
  });

  it('masque les alias techniques du détail utilisateur', () => {
    renderDrawer();

    expect(screen.queryByText('Alias')).not.toBeInTheDocument();
    expect(screen.queryByText('Abricots')).not.toBeInTheDocument();
  });

  it('signale une Référence provisoire comme À contrôler', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('tab', {
      name: 'Références (2)',
    }));

    const provisionalRow = screen
      .getByText('Purée d’abricots')
      .closest('li');
    expect(provisionalRow).not.toBeNull();
    expect(within(provisionalRow).getByText('À contrôler'))
      .toBeInTheDocument();

    const referenceList = screen.getByRole('list', {
      name: 'Références Produit',
    });
    const approvedRow = within(referenceList)
      .getByText('Abricot')
      .closest('li');
    expect(approvedRow).not.toBeNull();
    expect(within(approvedRow).queryByText('À contrôler'))
      .not.toBeInTheDocument();
  });

  it('affiche les compteurs et réserve Favoris aux Références actives du Workspace', async () => {
    const user = userEvent.setup();
    renderDrawer();

    expect(screen.getByRole('tab', {
      name: 'Références (2)',
    })).toBeInTheDocument();
    expect(screen.getByRole('tab', {
      name: 'Favoris (1)',
    })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', {
      name: 'Favoris (1)',
    }));

    const list = screen.getByRole('list', {
      name: 'Références favorites',
    });

    expect(list.children).toHaveLength(1);
    expect(within(list).getByText('Abricot')).toBeInTheDocument();
    expect(within(list).queryByText('Purée d’abricots'))
      .not.toBeInTheDocument();
    expect(screen.queryByText(/^Favori$/)).not.toBeInTheDocument();
  });

  it('présente le Prix indicatif et les conditionnements fournisseur dans Favoris', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('tab', {
      name: 'Favoris (1)',
    }));

    expect(screen.getByText('3,100 / KG')).toBeInTheDocument();
    expect(screen.getByText('Estimation Workspace')).toBeInTheDocument();
    expect(screen.getByText('Sysco · ABR-001')).toBeInTheDocument();
    expect(screen.getByText(/Carton/)).toBeInTheDocument();
    expect(screen.getByText(/6 unité/)).toBeInTheDocument();
  });

  it('réutilise les workflows Prix indicatif et Article fournisseur depuis le Produit', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('tab', {
      name: 'Favoris (1)',
    }));

    await user.click(screen.getByRole('button', {
      name: 'Appliquer un prix indicatif à Abricot',
    }));
    expect(screen.getByText('Prix indicatif · Abricot'))
      .toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Ajouter un Article fournisseur pour Abricot',
    }));
    expect(screen.getByText('Article fournisseur · Abricot'))
      .toBeInTheDocument();
  });
});
