import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
  detail: vi.fn(),
  dimensions: vi.fn(),
  updateProductStatus: vi.fn(),
  updateVariantStatus: vi.fn(),
  updateVarietyStatus: vi.fn(),
  updateCharacteristicStatus: vi.fn(),
  reviewContribution: vi.fn(),
  reviewDimension: vi.fn(),
  deleteDimension: vi.fn(),
  globalPrices: vi.fn(),
}));

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/shared/entity-details-drawer', () => ({
  EntityDetailsDrawer: ({ children, open, title }) => (
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

vi.mock('@/features/products/api/product-reference-api', () => ({
  useDeleteProductReferenceDimensionMutation: () => [
    mocks.deleteDimension,
    { isLoading: false },
  ],
  useGetProductReferenceDetailQuery: mocks.detail,
  useGetProductReferenceDimensionsQuery: mocks.dimensions,
  useReviewProductReferenceContributionMutation: () => [
    mocks.reviewContribution,
    { isLoading: false },
  ],
  useReviewProductReferenceDimensionMutation: () => [
    mocks.reviewDimension,
    { isLoading: false },
  ],
  useUpdateProductReferenceStatusMutation: () => [
    mocks.updateProductStatus,
    { isLoading: false },
  ],
  useUpdateProductReferenceVariantStatusMutation: () => [
    mocks.updateVariantStatus,
    { isLoading: false },
  ],
  useUpdateProductReferenceVarietyStatusMutation: () => [
    mocks.updateVarietyStatus,
    { isLoading: false },
  ],
  useUpdateProductReferenceCharacteristicStatusMutation: () => [
    mocks.updateCharacteristicStatus,
    { isLoading: false },
  ],
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useListGlobalIndicativePricesQuery: mocks.globalPrices,
}));

vi.mock('@/features/suppliers/components/global-indicative-price-dialog', () => ({
  GlobalIndicativePriceDialog: ({ open, variant }) => (
    open ? (
      <div>
        Prix repère ouvert · {variant?.name}
      </div>
    ) : null
  ),
}));

vi.mock('@/features/products/components/product-dimension-contribution-dialog', () => ({
  ProductDimensionContributionDialog: () => null,
}));
vi.mock('@/features/products/components/product-dimension-edit-dialog', () => ({
  ProductDimensionEditDialog: () => null,
}));
vi.mock('@/features/products/components/product-reference-edit-dialog', () => ({
  ProductReferenceEditDialog: () => null,
}));
vi.mock('@/features/products/components/product-reference-variant-edit-dialog', () => ({
  ProductReferenceVariantEditDialog: () => null,
}));
vi.mock('@/features/products/components/product-variant-merge-drawer', () => ({
  ProductVariantMergeDrawer: ({ open, sourceVariant }) => (
    open ? <div>Fusion ouverte · {sourceVariant?.name}</div> : null
  ),
}));
vi.mock('@/features/products/components/product-variant-create-dialog', () => ({
  ProductVariantCreateDialog: () => null,
}));

import {
  ProductReferenceDetailsDrawer,
} from '@/features/products/components/product-reference-details-drawer';

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
    { value: 'ARCHIVED', label: 'Archivé' },
  ],
  productCharacteristicKinds: [
    { value: 'CUT', label: 'Pièce / découpe' },
    { value: 'COLOR', label: 'Couleur' },
  ],
  conservationTypes: [
    { value: 'FRAIS', label: 'Frais' },
  ],
  referenceUnits: [
    { value: 'KG', label: 'kg' },
  ],
};

function renderDrawer(overrides = {}) {
  return render(
    <ProductReferenceDetailsDrawer
      canManage
      metadata={metadata}
      onClose={vi.fn()}
      open
      productId="product-1"
      {...overrides}
    />,
  );
}

describe('ProductReferenceDetailsDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.detail.mockReturnValue(queryResult({
      product: {
        id: 'product-1',
        name: 'Abricot',
        aliases: ['Abricots'],
        category: { id: 'category-1', name: 'Fruits' },
        status: 'ACTIVE',
        governanceStatus: 'APPROVED',
      },
      variants: [
        {
          id: 'variant-1',
          name: 'Abricot frais',
          conservationType: 'FRAIS',
          referenceUnit: 'KG',
          status: 'ACTIVE',
          governanceStatus: 'APPROVED',
        },
        {
          id: 'variant-2',
          name: 'Abricot archivé',
          conservationType: 'FRAIS',
          referenceUnit: 'KG',
          status: 'ARCHIVED',
          governanceStatus: 'APPROVED',
        },
      ],
      events: [],
    }));

    mocks.globalPrices.mockReturnValue(queryResult([{
      id: 'global-price-1',
      workspaceId: null,
      dossierId: null,
      productVariant: {
        id: 'variant-1',
        name: 'Abricot frais',
        referenceUnit: 'KG',
      },
      sourceAmount: '3.25',
      sourceBasis: 'PACKAGE',
      normalizedAmount: '3.25',
      normalizedUnit: 'KG',
      currency: 'EUR',
      source: 'Relevé vérifié',
      sourceOrganization: 'Catalogue professionnel',
      observedAt: '2026-10-01T00:00:00.000Z',
      packaging: {
        containerType: 'Carton',
        unitCount: 4,
        quantityPerUnit: '1',
        totalQuantity: '4',
        unit: 'KG',
        supplierLabel: 'Carton de 4 poches de 1 kg',
      },
      updatedAt: '2026-10-03T10:00:00.000Z',
      status: 'ACTIVE',
    }]));

    mocks.dimensions.mockReturnValue(queryResult({
      varieties: [
        {
          id: 'variety-1',
          name: 'Bergeron',
          aliases: [],
          status: 'ACTIVE',
          qualityReviewStatus: 'REVIEWED',
          governanceStatus: 'APPROVED',
        },
        {
          id: 'variety-2',
          name: 'Rouge du Roussillon',
          aliases: ['Roussillon rouge'],
          status: 'ACTIVE',
          qualityReviewStatus: 'PENDING',
          governanceStatus: 'APPROVED',
        },
      ],
      characteristics: [
        {
          id: 'characteristic-1',
          kind: 'CUT',
          name: 'Côte',
          aliases: [],
          status: 'ACTIVE',
          qualityReviewStatus: 'PENDING',
          governanceStatus: 'APPROVED',
        },
        {
          id: 'characteristic-2',
          kind: 'COLOR',
          name: 'Rouge',
          aliases: [],
          status: 'ARCHIVED',
          qualityReviewStatus: 'REVIEWED',
          governanceStatus: 'APPROVED',
        },
      ],
      review: {
        pendingCount: 2,
      },
    }));

    const resolvedMutation = {
      unwrap: vi.fn().mockResolvedValue({}),
    };
    mocks.updateProductStatus.mockReturnValue(resolvedMutation);
    mocks.updateVariantStatus.mockReturnValue(resolvedMutation);
    mocks.updateVarietyStatus.mockReturnValue(resolvedMutation);
    mocks.updateCharacteristicStatus.mockReturnValue(resolvedMutation);
    mocks.reviewContribution.mockReturnValue(resolvedMutation);
    mocks.reviewDimension.mockReturnValue(resolvedMutation);
    mocks.deleteDimension.mockReturnValue(resolvedMutation);
  });


  it('ouvre directement les Dimensions à vérifier depuis une notification Produit', () => {
    renderDrawer({
      initialDimensionFilter: 'pending',
      initialTab: 'dimensions',
    });

    expect(screen.getByRole('textbox', {
      name: 'Rechercher une caractéristique',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'À contrôler (2)' }))
      .toHaveAttribute('aria-pressed', 'true');
  });

  it('masque les alias techniques dans le détail Produit', () => {
    renderDrawer();

    expect(screen.queryByText('Synonymes métier')).not.toBeInTheDocument();
    expect(screen.queryByText('Abricots')).not.toBeInTheDocument();
    expect(screen.getByText('Validé')).toBeInTheDocument();
  });

  it('ouvre une Référence provisoire directement dans la vue À contrôler', async () => {
    const user = userEvent.setup();

    mocks.detail.mockReturnValue(queryResult({
      product: {
        id: 'product-1',
        name: 'Abricot',
        aliases: [],
        category: { id: 'category-1', name: 'Fruits' },
        status: 'ACTIVE',
        governanceStatus: 'APPROVED',
      },
      variants: [
        {
          id: 'variant-new',
          name: 'Abricot sec',
          conservationType: 'FRAIS',
          referenceUnit: 'KG',
          status: 'ACTIVE',
          governanceStatus: 'PROVISIONAL',
        },
        {
          id: 'variant-existing',
          name: 'Abricot frais',
          conservationType: 'FRAIS',
          referenceUnit: 'KG',
          status: 'ACTIVE',
          governanceStatus: 'APPROVED',
        },
      ],
      events: [],
    }));

    renderDrawer({
      initialReferenceFilter: 'pending',
      initialTab: 'variants',
      reviewContext: {
        sourceId: 'contribution-variant',
        targetId: 'variant-new',
        type: 'CONTRIBUTION',
        dataType: 'REFERENCE',
        value: 'Abricot sec',
        candidates: [{
          id: 'variant-candidate',
          name: 'Abricot séché',
        }],
      },
    });

    expect(screen.getByRole('button', { name: 'À contrôler (1)' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Abricot sec')).toBeInTheDocument();
    expect(screen.queryByText('Abricot frais')).not.toBeInTheDocument();
    expect(screen.getByText('Rapprochement à vérifier')).toBeInTheDocument();
    expect(screen.getByText('Abricot séché')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Valider' }));

    expect(mocks.reviewContribution).toHaveBeenCalledWith({
      contributionId: 'contribution-variant',
      decision: 'APPROVE',
      targetReferenceId: null,
    });
  });

  it('valide une Dimension ciblée depuis son détail sans seconde décision', async () => {
    const user = userEvent.setup();

    renderDrawer({
      initialDimensionFilter: 'pending',
      initialTab: 'dimensions',
      reviewContext: {
        sourceId: 'variety-2',
        targetId: 'variety-2',
        type: 'DIMENSION_REVIEW',
        dataType: 'DIMENSION',
        value: 'Rouge du Roussillon',
        dimensionType: 'VARIETY',
        candidates: [],
      },
    });

    const target = screen.getByText('Rouge du Roussillon').closest('li');
    expect(target).not.toBeNull();
    expect(within(target).getByText('À contrôler')).toBeInTheDocument();

    await user.click(within(target).getByRole('button', {
      name: 'Valider',
    }));

    expect(mocks.reviewDimension).toHaveBeenCalledWith({
      productId: 'product-1',
      dimensionType: 'VARIETY',
      dimensionId: 'variety-2',
    });
  });

  it('affiche les compteurs des Dimensions, Références et sous-sections', async () => {
    const user = userEvent.setup();
    renderDrawer();

    expect(screen.getByRole('tab', { name: 'Dimensions (4)' }))
      .toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Références (2)' }))
      .toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Dimensions (4)' }));

    expect(screen.getByText('Variétés (2)')).toBeInTheDocument();
    expect(screen.getByText('Caractéristiques (1)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'À contrôler (2)' }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archivées (1)' }))
      .toBeInTheDocument();
  });


  it('permet de vérifier une Dimension ligne par ligne', async () => {
    const user = userEvent.setup();
    renderDrawer({
      initialDimensionFilter: 'pending',
      initialTab: 'dimensions',
    });

    expect(screen.getAllByText('À contrôler')).toHaveLength(2);

    const varietyRow = screen.getByText('Rouge du Roussillon').closest('li');
    expect(varietyRow).not.toBeNull();

    await user.click(within(varietyRow).getByRole('button', {
      name: 'Marquer la variété Rouge du Roussillon comme vérifiée',
    }));

    expect(mocks.reviewDimension).toHaveBeenCalledWith({
      productId: 'product-1',
      dimensionType: 'VARIETY',
      dimensionId: 'variety-2',
    });
  });

  it('confirme la suppression d’une Dimension avant l’appel API', async () => {
    const user = userEvent.setup();
    renderDrawer({
      initialDimensionFilter: 'pending',
      initialTab: 'dimensions',
    });

    await user.click(screen.getByRole('button', {
      name: 'Supprimer la caractéristique Côte',
    }));

    expect(screen.getByRole('heading', {
      name: 'Supprimer cette valeur ?',
    })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Supprimer' }));

    expect(mocks.deleteDimension).toHaveBeenCalledWith({
      productId: 'product-1',
      dimensionType: 'CHARACTERISTIC',
      dimensionId: 'characteristic-1',
    });
  });

  it('filtre localement les Dimensions et propose des suggestions prédictives', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('tab', { name: 'Dimensions (4)' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Rechercher une caractéristique' }),
      'rou',
    );

    const suggestions = screen.getByRole('list', {
      name: 'Suggestions de dimensions',
    });

    expect(within(suggestions).getByText('Rouge du Roussillon'))
      .toBeInTheDocument();
    expect(screen.queryByText('Bergeron')).not.toBeInTheDocument();
    expect(screen.getByText('1 résultat sur 3 dimensions'))
      .toBeInTheDocument();
  });

  it('affiche et ouvre la maintenance du Prix repère global par Référence Produit', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('tab', { name: 'Références (2)' }));

    expect(screen.getByText(/Prix repère global : 3,250 \/ kg/))
      .toBeInTheDocument();
    const priceDetails = screen.getByRole('button', { name: 'Détails du prix' });
    expect(priceDetails).toBeInTheDocument();
    await user.hover(priceDetails);
    expect(await screen.findByText(/Relevé : 3,25 € \/ Carton/))
      .toBeInTheDocument();
    expect(screen.getByText(/Carton de 4 poches de 1 kg/))
      .toBeInTheDocument();
    expect(screen.getByText(/Source : Catalogue professionnel/))
      .toBeInTheDocument();
    expect(screen.getByText('Mis à jour le 03/10/2026'))
      .toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Modifier le Prix repère global de Abricot frais',
    }));

    expect(screen.getByText('Prix repère ouvert · Abricot frais'))
      .toBeInTheDocument();
  });

  it('masque les codes techniques de provenance des Prix repères', async () => {
    const user = userEvent.setup();
    mocks.globalPrices.mockReturnValue(queryResult([{
      id: 'global-price-technical',
      workspaceId: null,
      dossierId: null,
      productVariant: {
        id: 'variant-1',
        name: 'Abricot frais',
        referenceUnit: 'KG',
      },
      sourceAmount: '3.25',
      sourceBasis: 'KG',
      normalizedAmount: '3.25',
      normalizedUnit: 'KG',
      currency: 'EUR',
      source:
        'Référentiel de démonstration — prix repère global — '
        + 'corpus professionnel v7 — octobre 2026 · '
        + 'm003-global-indicative-v3',
      sourceOrganization: null,
      observedAt: '2026-10-01T00:00:00.000Z',
      packaging: null,
      updatedAt: '2026-10-03T10:00:00.000Z',
      status: 'ACTIVE',
    }]));

    renderDrawer();
    await user.click(screen.getByRole('tab', { name: 'Références (2)' }));

    const priceDetails = screen.getByRole('button', { name: 'Détails du prix' });
    await user.hover(priceDetails);
    expect(await screen.findByText(/Source : Référentiel de démonstration/))
      .toBeInTheDocument();
    expect(screen.queryByText(/m003-global-indicative-v3/))
      .not.toBeInTheDocument();
    expect(screen.queryByText(/corpus professionnel v7/))
      .not.toBeInTheDocument();
  });

  it('masque la maintenance du Prix repère sans droit de gestion', async () => {
    const user = userEvent.setup();
    renderDrawer({ canManage: false });

    await user.click(screen.getByRole('tab', { name: 'Références (2)' }));

    expect(screen.getByText(/Prix repère global : 3,250 \/ kg/))
      .toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Modifier le Prix repère global de Abricot frais',
    })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Ajouter le Prix repère global de Abricot archivé',
    })).not.toBeInTheDocument();
  });

  it('expose les actions du drawer sous forme de boutons icônes accessibles', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('tab', { name: 'Dimensions (4)' }));

    expect(screen.getByRole('button', {
      name: 'Corriger la variété Bergeron',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Archiver la variété Bergeron',
    })).toBeInTheDocument();
    await user.click(screen.getByRole('button', {
      name: 'Archivées (1)',
    }));
    expect(screen.getByRole('button', {
      name: 'Réactiver la caractéristique Rouge',
    })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Références (2)' }));

    expect(screen.getByRole('button', {
      name: 'Fusionner la référence Abricot frais',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Corriger la référence Abricot frais',
    })).toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Fusionner la référence Abricot frais',
    }));
    expect(screen.getByText('Fusion ouverte · Abricot frais'))
      .toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Archiver la référence Abricot frais',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Réactiver la référence Abricot archivé',
    })).toBeInTheDocument();
  });
});
