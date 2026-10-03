import {
  act,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  metadataQuery: vi.fn(),
  productsQuery: vi.fn(),
  contributionsQuery: vi.fn(),
  reviewQueueQuery: vi.fn(),
  updateCategoryStatus: vi.fn(),
  globalPricesQuery: vi.fn(),
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useGetProductReferenceMetadataQuery: mocks.metadataQuery,
  useListProductReferenceProductsQuery: mocks.productsQuery,
  useListProductReferenceContributionsQuery: mocks.contributionsQuery,
  useListProductReferenceReviewQueueQuery: mocks.reviewQueueQuery,
  useUpdateProductReferenceCategoryStatusMutation: () => [
    mocks.updateCategoryStatus,
    { isLoading: false },
  ],
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useListGlobalIndicativePricesQuery: mocks.globalPricesQuery,
}));

vi.mock('@/features/products/components/product-reference-search-autocomplete', () => ({
  ProductReferenceSearchAutocomplete: ({
    onSelect,
    onValueChange,
    value,
  }) => (
    <div>
      <input
        aria-label="Rechercher un Produit global"
        onChange={(event) => onValueChange(event.target.value)}
        placeholder="Rechercher un produit…"
        role="combobox"
        value={value}
      />
      <button
        onClick={() => onSelect(
          {
            product: {
              id: 'product-puree',
              name: 'Pomme de terre',
            },
            variant: {
              id: 'variant-puree',
              name: 'Purée de pomme de terre',
            },
          },
          'Purée de pomme de terre',
        )}
        type="button"
      >
        Choisir Purée de pomme de terre
      </button>
    </div>
  ),
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

vi.mock('@/features/products/components/product-reference-review-queue', () => ({
  ProductReferenceReviewQueue: () => (
    <div>File Produit à contrôler ouverte</div>
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
  productReviewQueueTypes: [
    { value: 'CONTRIBUTION', label: 'Contribution' },
    { value: 'DIMENSION_REVIEW', label: 'Valeur à vérifier' },
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

async function selectOption(user, triggerName, optionName) {
  const trigger = screen.getByRole('combobox', {
    name: triggerName,
  });

  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({
      x: 24,
      y: 24,
      width: 240,
      height: 40,
    }),
  );

  await user.click(trigger);
  await waitFor(() => {
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  await user.click(await screen.findByRole('option', {
    name: optionName,
  }));

  await waitFor(() => {
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
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
    mocks.globalPricesQuery.mockReturnValue({
      data: [{
        id: 'global-price-1',
        workspaceId: null,
        dossierId: null,
        productVariant: {
          id: 'variant-1',
          name: 'Carotte entière',
          referenceUnit: 'KG',
        },
        sourceAmount: '2.75',
        normalizedAmount: '2.75',
        normalizedUnit: 'KG',
        currency: 'EUR',
        source: 'Référentiel de démonstration',
        status: 'ACTIVE',
      }],
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.reviewQueueQuery.mockReturnValue({
      data: {
        items: [],
        summary: {
          total: 0,
          contributionCount: 0,
          dimensionReviewCount: 0,
        },
        origins: [],
        pagination: { page: 1, limit: 1, total: 0, totalPages: 0 },
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
    mocks.updateCategoryStatus.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
  });

  it('ouvre un référentiel Platform sobre sans alias ni colonnes redondantes', () => {
    renderPage();

    expect(screen.getByText('Carotte')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Prix repère' }))
      .toBeInTheDocument();
    expect(screen.getByText('2,750 / KG')).toBeInTheDocument();
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


  it('distingue la couverture des Prix repères de la valorisation M-004', () => {
    mocks.productsQuery.mockReturnValue({
      data: {
        products: [{
          ...product,
          variants: [
            product.variants[0],
            {
              ...product.variants[0],
              id: 'variant-2',
              name: 'Carotte purée',
            },
          ],
        }],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText('1 / 2 avec prix repère'))
      .toBeInTheDocument();
    expect(screen.queryByText(/références valorisées/i))
      .not.toBeInTheDocument();
  });

  it('conserve la recherche libre par soumission du formulaire', async () => {
    const user = userEvent.setup();

    renderPage();

    const search = screen.getByRole('combobox', {
      name: 'Rechercher un Produit global',
    });

    await user.type(search, 'abricot');
    await user.click(screen.getByRole('button', {
      name: 'Rechercher',
    }));

    await waitFor(() => {
      expect(mocks.productsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'abricot',
          status: 'ACTIVE',
          page: 1,
        }),
        { skip: false },
      );
    });
  });

  it('applique immédiatement une suggestion prédictive au tableau', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(screen.getByRole('button', {
      name: 'Choisir Purée de pomme de terre',
    }));

    expect(screen.getByRole('combobox', {
      name: 'Rechercher un Produit global',
    })).toHaveValue('Purée de pomme de terre');

    await waitFor(() => {
      expect(mocks.productsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'Purée de pomme de terre',
          status: 'ACTIVE',
          page: 1,
        }),
        { skip: false },
      );
    });
  });

  it('affiche les compteurs du Référentiel et de la file À contrôler', async () => {
    const user = userEvent.setup();

    mocks.productsQuery.mockImplementation((args) => ({
      data: {
        products: [product],
        pagination: {
          page: 1,
          limit: args.limit,
          total: args.categoryId === 'category-1' ? 7 : 368,
          totalPages: 1,
        },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    }));
    mocks.reviewQueueQuery.mockReturnValue({
      data: {
        items: [],
        summary: {
          total: 4,
          contributionCount: 2,
          dimensionReviewCount: 2,
        },
        origins: [],
        pagination: { page: 1, limit: 1, total: 4, totalPages: 4 },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByRole('tab', { name: 'Référentiel (368)' }))
      .toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'À contrôler (4)' }))
      .toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Historique' }))
      .toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Catégories (1)' }))
      .toBeInTheDocument();

    await selectOption(
      user,
      'Filtrer par catégorie',
      'Légumes',
    );

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

  it('n’empêche pas l’Historique de fonctionner si les Prix repères sont indisponibles', async () => {
    const user = userEvent.setup();

    mocks.globalPricesQuery.mockReturnValue({
      data: undefined,
      isError: true,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage({ canManage: true });

    expect(screen.getByText('Produits indisponibles')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Historique' }));

    expect(screen.getByText('Historique des contributions'))
      .toBeInTheDocument();
    expect(screen.getByText('Aucun historique')).toBeInTheDocument();
    expect(screen.queryByText('Produits indisponibles'))
      .not.toBeInTheDocument();
  });

  it('ouvre la file unifiée depuis l’onglet À contrôler', async () => {
    const user = userEvent.setup();

    mocks.reviewQueueQuery.mockReturnValue({
      data: {
        items: [],
        summary: {
          total: 1,
          contributionCount: 1,
          dimensionReviewCount: 0,
        },
        origins: [],
        pagination: { page: 1, limit: 1, total: 1, totalPages: 1 },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage({ canManage: true });

    await user.click(screen.getByRole('tab', {
      name: 'À contrôler (1)',
    }));

    expect(screen.getByText('File Produit à contrôler ouverte'))
      .toBeInTheDocument();
  });

  it('conserve les Contributions traitées dans un Historique séparé', async () => {
    const user = userEvent.setup();

    mocks.contributionsQuery.mockReturnValue({
      data: {
        contributions: [{
          id: 'contribution-history-1',
          type: 'CHARACTERISTIC',
          characteristicKind: 'QUALITY_DESIGNATION',
          proposedValue: 'Carottes des sables',
          workspace: { id: 'workspace-1', name: 'Atelier pilote' },
          author: { id: 'user-1', firstName: 'Alice', lastName: 'Martin' },
          status: 'APPROVED',
          decision: 'APPROVE',
          reviewer: {
            id: 'reviewer-1',
            firstName: 'Gestionnaire',
            lastName: 'Produit',
          },
          reviewedAt: '2026-10-03T11:00:00.000Z',
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
    await user.click(screen.getByRole('tab', { name: 'Historique' }));

    await waitFor(() => {
      expect(mocks.contributionsQuery).toHaveBeenLastCalledWith(
        {
          status: undefined,
          reviewedOnly: true,
          page: 1,
          limit: 20,
        },
        { skip: false },
      );
    });

    expect(screen.getByRole('combobox', {
      name: 'Filtrer l’historique par décision',
    })).toHaveTextContent('Toutes les décisions');
    expect(screen.getByText('Carottes des sables')).toBeInTheDocument();
    expect(screen.getByText('Atelier pilote')).toBeInTheDocument();
    expect(screen.getByText('Approuvée')).toBeInTheDocument();
    expect(screen.getByText('03/10/2026')).toBeInTheDocument();
    expect(screen.getByText('Gestionnaire Produit')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approuver' }))
      .not.toBeInTheDocument();

    await selectOption(
      user,
      'Filtrer l’historique par décision',
      'Refusée',
    );

    await waitFor(() => {
      expect(mocks.contributionsQuery).toHaveBeenLastCalledWith(
        {
          status: 'REJECTED',
          reviewedOnly: false,
          page: 1,
          limit: 20,
        },
        { skip: false },
      );
    });
  });

  it('distingue une Contribution fusionnée dans l’Historique', async () => {
    const user = userEvent.setup();

    mocks.contributionsQuery.mockReturnValue({
      data: {
        contributions: [{
          id: 'contribution-history-merge',
          type: 'CHARACTERISTIC',
          characteristicKind: 'QUALITY_DESIGNATION',
          proposedValue: 'Carotte sable',
          workspace: { id: 'workspace-1', name: 'Atelier pilote' },
          author: { id: 'user-1', firstName: 'Alice', lastName: 'Martin' },
          status: 'APPROVED',
          decision: 'MERGE',
          reviewer: null,
          reviewedAt: '2026-10-03T11:00:00.000Z',
          reasons: [],
        }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage({ canManage: true });
    await user.click(screen.getByRole('tab', { name: 'Historique' }));

    expect(screen.getByText('Fusionnée')).toBeInTheDocument();
  });

  it('ouvre le détail global depuis la liste', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir Carotte' }));

    expect(screen.getByText('Détail global ouvert · product · active')).toBeInTheDocument();
  });
});
