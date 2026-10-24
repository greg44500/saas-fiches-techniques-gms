import {
  act,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  metadataQuery: vi.fn(),
  productsQuery: vi.fn(),
  reviewQueueQuery: vi.fn(),
  loadReviewTarget: vi.fn(),
  restoreReviewContext: vi.fn(),
  reviewContribution: vi.fn(),
  updateCategoryStatus: vi.fn(),
  deleteCategory: vi.fn(),
  globalPricesQuery: vi.fn(),
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useGetProductReferenceMetadataQuery: mocks.metadataQuery,
  useListProductReferenceProductsQuery: mocks.productsQuery,
  useListProductReferenceReviewQueueQuery: mocks.reviewQueueQuery,
  useLazyListProductReferenceReviewQueueQuery: () => [
    mocks.loadReviewTarget,
    { isFetching: false },
  ],
  useRestoreProductReferenceReviewContextMutation: () => [
    mocks.restoreReviewContext,
    { isLoading: false },
  ],
  useReviewProductReferenceContributionMutation: () => [
    mocks.reviewContribution,
    { isLoading: false },
  ],
  useUpdateProductReferenceCategoryStatusMutation: () => [
    mocks.updateCategoryStatus,
    { isLoading: false },
  ],
  useDeleteProductReferenceCategoryMutation: () => [
    mocks.deleteCategory,
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
    initialReferenceFilter,
    initialTab,
    open,
    reviewContext,
    guidedReviewContext,
    onReviewRequested,
    onApproveDimensionDirectly,
    onGuidedReviewRequested,
  }) => (
    open ? (
      <div>
        <button
          onClick={() => onApproveDimensionDirectly('CHARACTERISTIC', 'characteristic-1')}
          type="button"
        >
          Valider directement la caractéristique
        </button>
        <button onClick={() => onReviewRequested('REFERENCE', 'variant-pending-1')} type="button">
          Contrôler la Référence courante
        </button>
        <button
          onClick={() => onGuidedReviewRequested({
            dataType: 'DIMENSION',
            dimensionType: 'CHARACTERISTIC',
            id: 'characteristic-1',
          })}
          type="button"
        >
          Examiner la Dimension depuis la Référence
        </button>
        {guidedReviewContext?.targetId
          ? ' · dépendance ' + guidedReviewContext.targetId
          : ''}
        Détail global ouvert · {initialTab} · {initialDimensionFilter}
        {' · '}{initialReferenceFilter}
        {reviewContext?.targetId
          ? ' · cible ' + reviewContext.targetId
          : ''}
      </div>
    ) : null
  ),
}));

vi.mock('@/features/products/components/product-reference-review-queue', () => ({
  ProductReferenceReviewQueue: ({ onExamine }) => (
    <div>
      <span>File Produit à contrôler ouverte</span>
      <button
        onClick={() => onExamine({
          sourceId: 'contribution-reference-1',
          targetId: 'variant-pending-1',
          type: 'CONTRIBUTION',
          dataType: 'REFERENCE',
          value: 'Abricot sec',
          productId: 'product-1',
          product: { id: 'product-1', name: 'Carotte' },
          candidates: [],
        })}
        type="button"
      >
        Examiner une Référence
      </button>
    </div>
  ),
}));

vi.mock('@/features/products/components/product-reference-category-merge-dialog', () => ({
  ProductReferenceCategoryMergeDialog: ({ source, onClose }) => (
    <div role="dialog" aria-label="Fusionner des catégories">
      Fusion de {source.name}
      <button onClick={onClose} type="button">Annuler la fusion</button>
    </div>
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
    totalProductCount: 1,
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
    mocks.loadReviewTarget.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ items: [] }),
    });
    mocks.restoreReviewContext.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue(null),
    });
    mocks.reviewContribution.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });

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
          productCount: 0,
          referenceCount: 0,
          dimensionCount: 0,
        },
        origins: [],
        pagination: { page: 1, limit: 1, total: 0, totalPages: 0 },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.updateCategoryStatus.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
    mocks.deleteCategory.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
  });

  it('ouvre un référentiel Platform sobre sans alias ni colonnes redondantes', () => {
    renderPage();

    expect(screen.getByText('Carotte')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Prix repère' }))
      .toBeInTheDocument();
    expect(screen.getByText('2,750 / kg')).toBeInTheDocument();
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


  it('garde les filtres Produits et la pagination fixes autour des lignes défilantes', () => {
    renderPage();
    const region = screen.getByRole('region', {
      name: 'Lignes du référentiel Produits',
    });
    expect(region).toHaveClass('overflow-auto');
    expect(region).toHaveAttribute('tabindex', '0');
    expect(within(region).getByRole('columnheader', { name: 'Produit' })
      .closest('thead')).toHaveClass('sticky', 'top-0');
    expect(screen.getByRole('combobox', {
      name: 'Filtrer par catégorie',
    })).toBeInTheDocument();
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
          productCount: 1,
          referenceCount: 1,
          dimensionCount: 2,
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
    expect(screen.queryByRole('tab', { name: 'Historique' }))
      .not.toBeInTheDocument();
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
      'Détail global ouvert · dimensions · pending · all',
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
    expect(screen.queryByRole('button', {
      name: 'Actions de la catégorie Légumes',
    })).not.toBeInTheDocument();

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
    await user.click(screen.getByRole('button', {
      name: 'Actions de la catégorie Légumes',
    }));
    const actions = screen.getByRole('group', {
      name: 'Actions de la catégorie Légumes',
    });
    expect(within(actions).getByRole('button', { name: 'Renommer' }))
      .toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'Archiver' }))
      .toBeInTheDocument();
    expect(within(actions).queryByRole('button', { name: 'Supprimer' }))
      .not.toBeInTheDocument();
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
    await user.click(screen.getByRole('button', {
      name: 'Actions de la catégorie Ancienne catégorie',
    }));
    const archivedActions = screen.getByRole('group', {
      name: 'Actions de la catégorie Ancienne catégorie',
    });
    expect(within(archivedActions).getByRole('button', {
      name: 'Réactiver',
    })).toBeInTheDocument();
    expect(within(archivedActions).queryByRole('button', {
      name: 'Supprimer',
    })).not.toBeInTheDocument();
  });

  it('affiche le menu Supprimer seulement si tous les Produits liés sont absents', async () => {
    const user = userEvent.setup();
    mocks.metadataQuery.mockReturnValue({
      data: {
        ...metadata,
        categories: [
          { id: 'empty', name: 'Catégorie vide', status: 'ACTIVE', activeProductCount: 0, totalProductCount: 0 },
          { id: 'historical', name: 'Catégorie historique', status: 'ARCHIVED', activeProductCount: 0, totalProductCount: 2 },
        ],
      },
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage({ canManage: true });
    await user.click(screen.getByRole('tab', { name: 'Catégories (2)' }));

    const region = screen.getByRole('region', { name: 'Lignes des catégories' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(within(region).getByRole('columnheader', { name: 'Catégorie' }).closest('thead'))
      .toHaveClass('sticky', 'top-0');

    await user.click(screen.getByRole('button', {
      name: 'Actions de la catégorie Catégorie historique',
    }));
    const historicalActions = screen.getByRole('group', {
      name: 'Actions de la catégorie Catégorie historique',
    });
    expect(within(historicalActions).queryByRole('button', { name: 'Supprimer' }))
      .not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', {
      name: 'Actions de la catégorie Catégorie vide',
    }));
    const emptyActions = screen.getByRole('group', {
      name: 'Actions de la catégorie Catégorie vide',
    });
    await user.click(within(emptyActions).getByRole('button', { name: 'Supprimer' }));
    expect(screen.getByText('Supprimer cette catégorie ?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(mocks.deleteCategory).toHaveBeenCalledWith({ categoryId: 'empty' });
  });

  it('pagine les Catégories sans abandonner le scroll interne et son entête fixe', async () => {
    const user = userEvent.setup();
    mocks.metadataQuery.mockReturnValue({
      data: {
        ...metadata,
        categories: Array.from({ length: 23 }, (_, index) => ({
          id: 'cat-' + index,
          name: 'Catégorie ' + String(index + 1).padStart(2, '0'),
          status: 'ACTIVE',
          activeProductCount: 0,
          totalProductCount: 0,
        })),
      },
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    renderPage({ canManage: true });
    await user.click(screen.getByRole('tab', { name: 'Catégories (23)' }));
    const region = screen.getByRole('region', { name: 'Lignes des catégories' });
    expect(region).toHaveClass('overflow-auto');
    expect(within(region).getByRole('columnheader', { name: 'Catégorie' })
      .closest('thead')).toHaveClass('sticky');

    expect(within(region).getByText('Catégorie 01')).toBeInTheDocument();
    expect(within(region).queryByText('Catégorie 11')).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('navigation', {
      name: 'Pagination des catégories',
    })).getByRole('button', { name: 'Suivant' }));
    expect(within(region).getByText('Catégorie 11')).toBeInTheDocument();
    expect(within(region).queryByText('Catégorie 01')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer une catégorie' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Catégories (23)' })).toBeInTheDocument();
  });

  it('propose la fusion dans le menu, mais pas en mode lecture seule', async () => {
    const user = userEvent.setup();
    mocks.metadataQuery.mockReturnValue({
      data: {
        ...metadata,
        categories: [
          { id: 'source', name: 'Source', status: 'ACTIVE', activeProductCount: 2, totalProductCount: 2 },
          { id: 'target', name: 'Cible', status: 'ACTIVE', activeProductCount: 1, totalProductCount: 1 },
        ],
      },
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    renderPage({ canManage: true });
    await user.click(screen.getByRole('tab', { name: 'Catégories (2)' }));
    await user.click(screen.getByRole('button', { name: 'Actions de la catégorie Source' }));
    await user.click(within(screen.getByRole('group', {
      name: 'Actions de la catégorie Source',
    })).getByRole('button', { name: 'Fusionner' }));
    expect(screen.getByRole('dialog', { name: 'Fusionner des catégories' }))
      .toHaveTextContent('Fusion de Source');
  });

  it('ouvre la file unifiée depuis l’onglet À contrôler', async () => {
    const user = userEvent.setup();

    mocks.reviewQueueQuery.mockReturnValue({
      data: {
        items: [],
        summary: {
          total: 1,
          productCount: 0,
          referenceCount: 1,
          dimensionCount: 0,
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

  it('route une Référence à contrôler vers son filtre et sa cible exacte', async () => {
    const user = userEvent.setup();

    mocks.reviewQueueQuery.mockReturnValue({
      data: {
        items: [],
        summary: {
          total: 1,
          productCount: 0,
          referenceCount: 1,
          dimensionCount: 0,
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
    await user.click(screen.getByRole('button', {
      name: 'Examiner une Référence',
    }));

    expect(screen.getByText(
      'Détail global ouvert · variants · active · pending · cible variant-pending-1',
    )).toBeInTheDocument();
  });

  it('ouvre le contrôle exact depuis le petit bouton du drawer, sans parcours parallèle', async () => {
    const user = userEvent.setup();
    mocks.loadReviewTarget.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        items: [{
          sourceId: 'contribution-reference-1',
          targetId: 'variant-pending-1',
          type: 'CONTRIBUTION',
          dataType: 'REFERENCE',
          productId: 'product-1',
          value: 'Carotte entière',
          candidates: [],
        }],
      }),
    });
    renderPage({ canManage: true });
    await user.click(screen.getByRole('button', { name: 'Voir Carotte' }));
    await user.click(screen.getByRole('button', {
      name: 'Contrôler la Référence courante',
    }));
    await waitFor(() => {
      expect(mocks.loadReviewTarget).toHaveBeenCalledWith({
        type: 'CONTRIBUTION',
        targetId: 'variant-pending-1',
        origins: 'omit',
        page: 1,
        limit: 1,
      });
      expect(screen.getByText(
        'Détail global ouvert · variants · active · pending · cible variant-pending-1',
      )).toBeInTheDocument();
    });
  });

  it('rétablit et ouvre le contrôle exact si la Référence est provisoire mais orpheline', async () => {
    const user = userEvent.setup();
    mocks.restoreReviewContext.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        sourceId: 'contribution-restored',
        targetId: 'variant-pending-1',
        type: 'CONTRIBUTION',
        dataType: 'REFERENCE',
        productId: 'product-1',
        candidates: [],
      }),
    });
    renderPage({ canManage: true });
    await user.click(screen.getByRole('button', { name: 'Voir Carotte' }));
    await user.click(screen.getByRole('button', {
      name: 'Contrôler la Référence courante',
    }));
    await waitFor(() => {
      expect(mocks.restoreReviewContext).toHaveBeenCalledWith({
        productId: 'product-1',
        dataType: 'REFERENCE',
        targetId: 'variant-pending-1',
      });
      expect(screen.getByText(
        'Détail global ouvert · variants · active · pending · cible variant-pending-1',
      )).toBeInTheDocument();
    });
  });

  it('transmet le type de Dimension jusqu’à la mutation de reprise du contrôle guidé', async () => {
    const user = userEvent.setup();
    mocks.restoreReviewContext.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        sourceId: 'recovered-dimension',
        targetId: 'characteristic-1',
        type: 'CONTRIBUTION',
        dataType: 'DIMENSION',
        dimensionType: 'CHARACTERISTIC',
      }),
    });
    renderPage({ canManage: true });
    await user.click(screen.getByRole('button', { name: 'Voir Carotte' }));
    await user.click(screen.getByRole('button', {
      name: 'Examiner la Dimension depuis la Référence',
    }));
    await waitFor(() => {
      expect(mocks.loadReviewTarget).toHaveBeenCalledWith({
        type: 'CONTRIBUTION',
        targetId: 'characteristic-1',
        origins: 'omit',
        page: 1,
        limit: 1,
      });
      expect(mocks.restoreReviewContext).toHaveBeenCalledWith({
        productId: 'product-1',
        dataType: 'DIMENSION',
        dimensionType: 'CHARACTERISTIC',
        targetId: 'characteristic-1',
      });
      expect(screen.getByText(/dépendance characteristic-1/)).toBeInTheDocument();
    });
  });

  it('approuve rapidement une Dimension sans rapprochement, via sa Contribution exacte', async () => {
    const user = userEvent.setup();
    mocks.loadReviewTarget.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        items: [{
          sourceId: 'contribution-orange',
          targetId: 'characteristic-1',
          type: 'CONTRIBUTION',
          dataType: 'DIMENSION',
          dimensionType: 'CHARACTERISTIC',
          productId: 'product-1',
          candidates: [],
        }],
      }),
    });
    renderPage({ canManage: true });
    await user.click(screen.getByRole('button', { name: 'Voir Carotte' }));
    await user.click(screen.getByRole('button', {
      name: 'Valider directement la caractéristique',
    }));
    await waitFor(() => {
      expect(mocks.reviewContribution).toHaveBeenCalledWith({
        contributionId: 'contribution-orange',
        decision: 'APPROVE',
        targetReferenceId: null,
      });
    });
    expect(mocks.restoreReviewContext).not.toHaveBeenCalled();
  });

  it('oriente vers Examiner lorsque des rapprochements existent, sans approbation rapide', async () => {
    const user = userEvent.setup();
    mocks.loadReviewTarget.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        items: [{
          sourceId: 'contribution-orange',
          targetId: 'characteristic-1',
          type: 'CONTRIBUTION',
          dataType: 'DIMENSION',
          dimensionType: 'CHARACTERISTIC',
          productId: 'product-1',
          candidates: [{ id: 'candidate-existing', name: 'Orange doux' }],
        }],
      }),
    });
    renderPage({ canManage: true });
    await user.click(screen.getByRole('button', { name: 'Voir Carotte' }));
    await user.click(screen.getByRole('button', {
      name: 'Valider directement la caractéristique',
    }));
    await waitFor(() => {
      expect(screen.getByText(
        'Détail global ouvert · dimensions · all · all · cible characteristic-1',
      )).toBeInTheDocument();
    });
    expect(mocks.reviewContribution).not.toHaveBeenCalled();
  });

  it('n’approuve pas rapidement lorsque la liste de rapprochements est absente', async () => {
    const user = userEvent.setup();
    mocks.loadReviewTarget.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        items: [{
          sourceId: 'contribution-orange',
          targetId: 'characteristic-1',
          type: 'CONTRIBUTION',
          dataType: 'DIMENSION',
          dimensionType: 'CHARACTERISTIC',
          productId: 'product-1',
        }],
      }),
    });
    renderPage({ canManage: true });
    await user.click(screen.getByRole('button', { name: 'Voir Carotte' }));
    await user.click(screen.getByRole('button', {
      name: 'Valider directement la caractéristique',
    }));
    await waitFor(() => {
      expect(mocks.loadReviewTarget).toHaveBeenCalled();
    });
    expect(mocks.reviewContribution).not.toHaveBeenCalled();
  });

  it('n’autorise pas la validation rapide en consultation seule', async () => {
    const user = userEvent.setup();
    renderPage({ canManage: false });
    await user.click(screen.getByRole('button', { name: 'Voir Carotte' }));
    await user.click(screen.getByRole('button', {
      name: 'Valider directement la caractéristique',
    }));
    expect(mocks.loadReviewTarget).not.toHaveBeenCalled();
    expect(mocks.reviewContribution).not.toHaveBeenCalled();
  });

  it('ouvre le détail global depuis la liste', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir Carotte' }));

    expect(screen.getByText('Détail global ouvert · product · active · all')).toBeInTheDocument();
  });
});
