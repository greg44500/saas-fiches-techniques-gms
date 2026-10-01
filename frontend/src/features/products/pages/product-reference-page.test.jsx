import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  metadataQuery: vi.fn(),
  productsQuery: vi.fn(),
  contributionsQuery: vi.fn(),
  reviewContribution: vi.fn(),
  updateCategoryStatus: vi.fn(),
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useGetProductReferenceMetadataQuery: mocks.metadataQuery,
  useListProductReferenceProductsQuery: mocks.productsQuery,
  useListProductReferenceContributionsQuery: mocks.contributionsQuery,
  useReviewProductReferenceContributionMutation: () => [
    mocks.reviewContribution,
    { isLoading: false },
  ],
  useUpdateProductReferenceCategoryStatusMutation: () => [
    mocks.updateCategoryStatus,
    { isLoading: false },
  ],
}));

vi.mock('@/features/products/components/product-reference-details-drawer', () => ({
  ProductReferenceDetailsDrawer: ({
    initialDimensionFilter,
    initialTab,
    open,
  }) => (
    open ? (
      <div>
        Détail global ouvert · {initialTab} · {initialDimensionFilter}
      </div>
    ) : null
  ),
}));

vi.mock('@/features/products/components/product-reference-category-dialog', () => ({
  ProductReferenceCategoryDialog: ({ open }) => (
    open ? <div>Catégorie globale ouverte</div> : null
  ),
}));

vi.mock('@/features/products/components/product-create-dialog', () => ({
  ProductCreateDialog: ({ open }) => (
    open ? <div>Création globale ouverte</div> : null
  ),
}));

vi.mock('@/features/products/components/product-import-dialog', () => ({
  ProductImportDialog: ({ open }) => (
    open ? <div>Import global ouvert</div> : null
  ),
}));

import { ProductReferencePage } from '@/features/products/pages/product-reference-page';

const metadata = {
  categories: [{
    id: 'category-1',
    name: 'Légumes',
    status: 'ACTIVE',
    activeProductCount: 1,
  }],
  productStatuses: [
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'ARCHIVED', label: 'Archivé' },
  ],
  productCategoryStatuses: [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'ARCHIVED', label: 'Archivée' },
  ],
  productCharacteristicKinds: [
    { value: 'QUALITY_DESIGNATION', label: 'Désignation de qualité' },
  ],
  productContributionTypes: [
    { value: 'CANONICAL_PRODUCT', label: 'Produit' },
    { value: 'CHARACTERISTIC', label: 'Caractéristique' },
  ],
  conservationTypes: [{ value: 'FRAIS', label: 'Frais' }],
  referenceUnits: [{ value: 'KG', label: 'kg' }],
  foodRanges: [{
    value: 1,
    label: 'Gamme 1',
    name: 'Frais',
    processingStates: ['Produit frais'],
    defaultProcessingState: 'Produit frais',
  }],
  productContributionStatuses: [
    { value: 'PENDING_REVIEW', label: 'À examiner' },
    { value: 'APPROVED', label: 'Approuvée' },
    { value: 'REJECTED', label: 'Refusée' },
  ],
};

const product = {
  id: 'product-1',
  name: 'Carotte',
  aliases: ['Carottes'],
  category: { id: 'category-1', name: 'Légumes', status: 'ACTIVE' },
  status: 'ACTIVE',
  dimensionReview: { pendingCount: 0 },
  updatedAt: '2026-09-23T08:00:00.000Z',
  variants: [{
    id: 'variant-1',
    name: 'Carotte entière',
    conservationType: 'FRAIS',
    variety: null,
    characteristics: [{
      id: 'presentation-whole',
      kind: 'PRESENTATION',
      name: 'Entière',
      aliases: [],
      status: 'ACTIVE',
    }],
    processingState: null,
    foodRange: 1,
    referenceUnit: 'KG',
    yieldPercent: null,
    status: 'ACTIVE',
  }],
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
    mocks.contributionsQuery.mockReturnValue({
      data: {
        contributions: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.reviewContribution.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
    mocks.updateCategoryStatus.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
  });

  it('ouvre un référentiel Platform sobre sans alias ni colonnes redondantes', () => {
    renderPage();

    expect(screen.getByText('Carotte')).toBeInTheDocument();
    expect(screen.queryByText('Carottes')).not.toBeInTheDocument();
    expect(screen.queryByText(/Gamme 1/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Références' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Statut' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'À valider' }))
      .not.toBeInTheDocument();
    expect(mocks.productsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ACTIVE',
        page: 1,
      }),
      { skip: false },
    );
  });


  it('affiche des compteurs d’onglets basés sur les totaux filtrés', async () => {
    const user = userEvent.setup();

    mocks.productsQuery.mockImplementation((args) => ({
      data: {
        products: [product],
        pagination: {
          page: 1,
          limit: args.limit,
          total: args.categoryId === 'category-1' ? 7 : 264,
          totalPages: 1,
        },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    }));
    mocks.contributionsQuery.mockReturnValue({
      data: {
        contributions: [],
        pagination: { page: 1, limit: 1, total: 4, totalPages: 4 },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByRole('tab', { name: 'Référentiel (264)' }))
      .toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Contributions (4)' }))
      .toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Catégories (1)' }))
      .toBeInTheDocument();

    await user.click(screen.getByRole('combobox', {
      name: 'Filtrer par catégorie',
    }));
    await user.click(screen.getByRole('option', { name: 'Légumes' }));

    expect(await screen.findByRole('tab', { name: 'Référentiel (7)' }))
      .toBeInTheDocument();
  });


  it('signale les nouvelles Dimensions et ouvre directement les lignes à vérifier', async () => {
    const user = userEvent.setup();

    mocks.productsQuery.mockReturnValue({
      data: {
        products: [{
          ...product,
          dimensionReview: {
            pendingCount: 3,
          },
        }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage({ canManage: true });

    const notification = screen.getByRole('button', {
      name: 'Vérifier 3 nouvelles valeurs de Carotte',
    });
    expect(notification).toBeInTheDocument();

    await user.click(notification);

    expect(screen.getByText(
      'Détail global ouvert · dimensions · pending',
    )).toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Marquer Carotte comme vérifié',
    })).not.toBeInTheDocument();
  });

  it('rend les Références Produit accessibles au focus clavier', async () => {
    renderPage();

    const trigger = screen.getByRole('button', {
      name: 'Références Produit de Carotte',
    });

    act(() => trigger.focus());

    expect(trigger).toHaveFocus();
    expect(await screen.findByText('Références Produit')).toBeInTheDocument();
    expect(screen.getByText('Carotte entière')).toBeInTheDocument();
    expect(screen.getByText(/Frais/)).toBeInTheDocument();
  });

  it('garde visible un Produit global sans Référence Produit exploitable', async () => {
    mocks.productsQuery.mockReturnValue({
      data: {
        products: [{
          ...product,
          name: 'Bœuf',
          variants: [],
        }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    const trigger = screen.getByRole('button', {
      name: 'Références Produit de Bœuf',
    });
    act(() => trigger.focus());

    expect(screen.getByText('Bœuf')).toBeInTheDocument();
    expect(
      await screen.findByText('Aucune Référence Produit exploitable'),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Rechercher un produit…'))
      .toBeInTheDocument();
  });

  it('expose le compteur Catégorie et ouvre le Référentiel filtré en lecture seule', async () => {
    const user = userEvent.setup();
    renderPage({ canManage: false });

    await user.click(screen.getByRole('tab', { name: 'Catégories (1)' }));

    expect(screen.getByText('Légumes')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Produits actifs' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Statut' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Créer une catégorie' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Renommer Légumes' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archiver Légumes' }))
      .not.toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Voir les Produits actifs de Légumes',
    }));

    expect(mocks.productsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        categoryId: 'category-1',
        status: 'ACTIVE',
        page: 1,
      }),
      { skip: false },
    );
  });

  it('expose création et import avec product:reference:manage', async () => {
    const user = userEvent.setup();
    renderPage({ canManage: true });

    expect(screen.getByRole('button', { name: 'Créer un Produit' }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Importer' }))
      .toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Créer un Produit' }));
    expect(screen.getByText('Création globale ouverte')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Importer' }));
    expect(screen.getByText('Import global ouvert')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Catégories (1)' }));
    expect(screen.getByRole('button', { name: 'Créer une catégorie' }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Renommer Légumes' }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archiver Légumes' }))
      .toBeInTheDocument();
  });

  it('affiche une catégorie archivée et son action de réactivation', async () => {
    const user = userEvent.setup();
    mocks.metadataQuery.mockReturnValue({
      data: {
        ...metadata,
        categories: [{
          id: 'category-archived',
          name: 'Ancienne catégorie',
          status: 'ARCHIVED',
          activeProductCount: 0,
        }],
      },
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage({ canManage: true });
    await user.click(screen.getByRole('tab', { name: 'Catégories (1)' }));

    expect(screen.getByText('Archivée')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Réactiver Ancienne catégorie',
    })).toBeInTheDocument();
  });

  it('examine les contributions séparément du lifecycle des références', async () => {
    const user = userEvent.setup();
    mocks.contributionsQuery.mockReturnValue({
      data: {
        contributions: [{
          id: 'contribution-1',
          type: 'CHARACTERISTIC',
          characteristicKind: 'QUALITY_DESIGNATION',
          proposedValue: 'Carottes des sables',
          workspace: { id: 'workspace-1', name: 'Atelier pilote' },
          author: { id: 'user-1', firstName: 'Alice', lastName: 'Martin' },
          status: 'PENDING_REVIEW',
          reasons: [{
            code: 'CHARACTERISTIC_REQUIRES_GOVERNANCE',
            message: 'Ce type nécessite une revue.',
          }],
        }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage({ canManage: true });
    await user.click(screen.getByRole('tab', { name: 'Contributions (1)' }));

    expect(screen.getByText('Carottes des sables')).toBeInTheDocument();
    expect(screen.getByText('Caractéristique · Désignation de qualité'))
      .toBeInTheDocument();
    expect(screen.getByText('Atelier pilote')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Approuver' }));

    expect(mocks.reviewContribution).toHaveBeenCalledWith({
      contributionId: 'contribution-1',
      decision: 'APPROVE',
    });
  });

  it('propose une fusion explicite avec les candidats de gouvernance', async () => {
    const user = userEvent.setup();
    mocks.contributionsQuery.mockReturnValue({
      data: {
        contributions: [{
          id: 'contribution-merge',
          type: 'VARIETY',
          proposedValue: 'Galla',
          workspace: { id: 'workspace-1', name: 'Atelier pilote' },
          author: { id: 'user-1', firstName: 'Alice', lastName: 'Martin' },
          status: 'PENDING_REVIEW',
          reasons: [{
            code: 'TYPO_CANDIDATE',
            message: 'Une valeur proche existe.',
          }],
          candidates: [{
            id: 'variety-gala',
            name: 'Gala',
          }],
        }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage({ canManage: true });
    await user.click(screen.getByRole('tab', { name: 'Contributions (1)' }));

    expect(screen.getByText(/Valeurs proches : Gala/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Fusionner avec Gala',
    }));

    expect(mocks.reviewContribution).toHaveBeenCalledWith({
      contributionId: 'contribution-merge',
      decision: 'MERGE',
      targetReferenceId: 'variety-gala',
    });
  });

  it('ouvre le détail global depuis la liste', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir Carotte' }));

    expect(screen.getByText('Détail global ouvert · product · active')).toBeInTheDocument();
  });
});
