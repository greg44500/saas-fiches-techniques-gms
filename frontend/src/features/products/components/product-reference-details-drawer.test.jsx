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
    { value: 'PRESENTATION', label: 'Présentation' },
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


  it('affiche la gouvernance provisoire indépendamment de la revue qualité dans Dimensions', async () => {
    const user = userEvent.setup();
    const onReviewRequested = vi.fn();
    mocks.dimensions.mockReturnValue(queryResult({
      varieties: [],
      characteristics: [{
        id: 'presentation-1',
        name: 'Individuel',
        kind: 'PRESENTATION',
        status: 'ACTIVE',
        governanceStatus: 'PROVISIONAL',
        qualityReviewStatus: 'REVIEWED',
      }],
    }));

    renderDrawer({
      initialTab: 'dimensions',
      onReviewRequested,
    });

    expect(screen.getByRole('button', { name: 'À contrôler (1)' }))
      .toBeInTheDocument();
    const identityButton = screen.getByRole('button', {
      name: 'Examiner l’identité de la caractéristique Individuel',
    });
    expect(identityButton).toBeVisible();
    expect(screen.getByText('Identité à valider')).toBeInTheDocument();
    expect(screen.queryByText('Validée')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: /Confirmer le contrôle qualité de la caractéristique Individuel/,
    })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'À contrôler (1)' }));
    expect(screen.getByText('Individuel')).toBeInTheDocument();
    await user.click(identityButton);
    expect(onReviewRequested).toHaveBeenCalledWith(
      'DIMENSION',
      'presentation-1',
      'CHARACTERISTIC',
    );
  });

  it('libère les actions après validation même si le contexte de contrôle est encore ouvert', async () => {
    mocks.dimensions.mockReturnValue(queryResult({
      varieties: [],
      characteristics: [{
        id: 'characteristic-finished',
        name: 'Rouge',
        kind: 'COLOR',
        status: 'ACTIVE',
        governanceStatus: 'APPROVED',
        qualityReviewStatus: 'REVIEWED',
      }],
    }));

    renderDrawer({
      initialTab: 'dimensions',
      reviewContext: {
        sourceId: 'old-contribution',
        targetId: 'characteristic-finished',
        type: 'CONTRIBUTION',
        dataType: 'DIMENSION',
        dimensionType: 'CHARACTERISTIC',
        candidates: [],
      },
    });

    expect(screen.getByRole('button', { name: 'À contrôler (0)' }))
      .toBeInTheDocument();
    expect(screen.getByText('Validée')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Actions de la caractéristique Rouge',
    })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approuver l’identité' }))
      .not.toBeInTheDocument();
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


  it('guide la validation d’une Référence sur les identités Produit et Dimension sans changer d’onglet', async () => {
    const user = userEvent.setup();
    const onGuidedReviewRequested = vi.fn();

    mocks.detail.mockReturnValue(queryResult({
      product: {
        id: 'product-1', name: 'Croissant', status: 'ACTIVE',
        governanceStatus: 'APPROVED',
      },
      variants: [{
        id: 'variant-guide', name: 'Croissant individuel PAI',
        conservationType: 'FRAIS', referenceUnit: 'KG',
        status: 'ACTIVE', governanceStatus: 'PROVISIONAL',
        characteristics: [{
          id: 'characteristic-guide',
          name: 'Individuel',
          kind: 'PRESENTATION',
          governanceStatus: 'PROVISIONAL',
          qualityReviewStatus: 'REVIEWED',
        }],
      }],
      events: [],
    }));
    mocks.dimensions.mockReturnValue(queryResult({
      varieties: [],
      characteristics: [{
        id: 'characteristic-guide',
        name: 'Individuel',
        kind: 'PRESENTATION',
        status: 'ACTIVE',
        governanceStatus: 'PROVISIONAL',
        qualityReviewStatus: 'REVIEWED',
      }],
    }));

    renderDrawer({
      initialTab: 'variants',
      onGuidedReviewRequested,
      reviewContext: {
        sourceId: 'contribution-reference',
        targetId: 'variant-guide',
        type: 'CONTRIBUTION',
        dataType: 'REFERENCE',
        value: 'Croissant individuel PAI',
        candidates: [],
      },
    });

    expect(screen.getByRole('tab', { name: 'Dimensions (1)' }))
      .toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Produit' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Historique' })).toBeInTheDocument();
    const workflow = screen.getByRole('region', {
      name: 'Contrôle de publication de Croissant individuel PAI',
    });
    expect(within(workflow).getByText('Présentation')).toBeInTheDocument();
    expect(within(workflow).getByText('Individuel')).toBeInTheDocument();
    expect(within(workflow).getByRole('button', { name: 'Valider' }))
      .toBeDisabled();

    await user.click(within(workflow).getByRole('button', {
      name: 'Examiner Présentation Individuel',
    }));
    expect(onGuidedReviewRequested).toHaveBeenCalledWith(expect.objectContaining({
      dataType: 'DIMENSION',
      dimensionType: 'CHARACTERISTIC',
      id: 'characteristic-guide',
    }));
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('permet la décision sur une Dimension provisoire sans quitter le contrôle de la Référence', async () => {
    const user = userEvent.setup();
    mocks.detail.mockReturnValue(queryResult({
      product: { id: 'product-1', name: 'Croissant', status: 'ACTIVE', governanceStatus: 'APPROVED' },
      variants: [{
        id: 'variant-guide', name: 'Croissant individuel',
        status: 'ACTIVE', governanceStatus: 'PROVISIONAL',
        conservationType: 'FRAIS', referenceUnit: 'KG',
        characteristics: [{ id: 'characteristic-guide', name: 'Individuel', kind: 'PRESENTATION', governanceStatus: 'PROVISIONAL' }],
      }],
      events: [],
    }));
    mocks.dimensions.mockReturnValue(queryResult({
      varieties: [],
      characteristics: [{ id: 'characteristic-guide', name: 'Individuel', kind: 'PRESENTATION', status: 'ACTIVE', governanceStatus: 'PROVISIONAL', qualityReviewStatus: 'REVIEWED' }],
    }));
    const onGuidedReviewClosed = vi.fn();
    renderDrawer({
      initialTab: 'variants',
      onGuidedReviewClosed,
      reviewContext: {
        sourceId: 'contribution-reference', targetId: 'variant-guide',
        dataType: 'REFERENCE', type: 'CONTRIBUTION', candidates: [],
      },
      guidedReviewContext: {
        sourceId: 'contribution-dimension', targetId: 'characteristic-guide',
        dataType: 'DIMENSION', type: 'CONTRIBUTION', value: 'Individuel',
        candidates: [],
      },
    });

    const workflow = screen.getByRole('region', {
      name: 'Contrôle de publication de Croissant individuel',
    });
    expect(within(workflow).getByRole('button', {
      name: 'Masquer le contrôle de Présentation Individuel',
    })).toBeInTheDocument();
    // La validation finale de la Référence reste bloquée tant que
    // sa Caractéristique provisoire n'est pas approuvée.
    expect(within(workflow).getByRole('button', { name: 'Valider' }))
      .toBeDisabled();
    await user.click(within(workflow).getByRole('button', {
      name: 'Approuver l’identité',
    }));
    expect(mocks.reviewContribution).toHaveBeenCalledWith({
      contributionId: 'contribution-dimension',
      decision: 'APPROVE',
      targetReferenceId: null,
    });
    expect(onGuidedReviewClosed).toHaveBeenCalled();
  });

  it('signale aussi le Produit parent provisoire, distinct de ses Dimensions', () => {
    mocks.detail.mockReturnValue(queryResult({
      product: { id: 'product-1', name: 'Croissant', status: 'ACTIVE', governanceStatus: 'PROVISIONAL' },
      variants: [{
        id: 'variant-3', name: 'Croissant PAI',
        status: 'ACTIVE', governanceStatus: 'PROVISIONAL',
        referenceUnit: 'KG', conservationType: 'FRAIS',
        characteristics: [],
      }],
      events: [],
    }));
    mocks.dimensions.mockReturnValue(queryResult({ varieties: [], characteristics: [] }));
    renderDrawer({
      initialTab: 'variants',
      reviewContext: {
        sourceId: 'review-3', dataType: 'REFERENCE',
        targetId: 'variant-3', type: 'CONTRIBUTION', candidates: [],
      },
    });
    const workflow = screen.getByRole('region', {
      name: 'Contrôle de publication de Croissant PAI',
    });
    expect(within(workflow).getByRole('button', {
      name: 'Examiner Produit parent Croissant',
    })).toBeInTheDocument();
    expect(within(workflow).getByRole('button', { name: 'Valider' }))
      .toBeDisabled();
  });

  it('rend À contrôler comme un petit bouton warning ouvrant le contrôle ciblé', async () => {
    const user = userEvent.setup();
    const onReviewRequested = vi.fn();
    mocks.detail.mockReturnValue(queryResult({
      product: {
        id: 'product-1',
        name: 'Abricot',
        category: null,
        status: 'ACTIVE',
        governanceStatus: 'APPROVED',
      },
      variants: [{
        id: 'variant-to-review',
        name: 'Croissant PAI',
        status: 'ACTIVE',
        governanceStatus: 'PROVISIONAL',
        referenceUnit: 'KG',
        conservationType: 'FRAIS',
      }],
      events: [],
    }));

    renderDrawer({
      initialTab: 'variants',
      onReviewRequested,
    });
    const control = screen.getByRole('button', {
      name: 'Examiner la référence Croissant PAI',
    });
    expect(control).toHaveTextContent('À contrôler');
    expect(control).toHaveClass(
      'h-7', 'border-warning/60', 'bg-warning/10', 'text-warning', 'text-xs',
    );
    await user.click(control);
    expect(onReviewRequested).toHaveBeenCalledWith('REFERENCE', 'variant-to-review');
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
    expect(within(target).getByText('Qualité à vérifier')).toBeInTheDocument();

    await user.click(within(target).getByRole('button', {
      name: 'Confirmer le contrôle qualité',
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

    expect(screen.getAllByText('Qualité à vérifier')).toHaveLength(2);

    const varietyRow = screen.getByText('Rouge du Roussillon').closest('li');
    expect(varietyRow).not.toBeNull();

    await user.click(within(varietyRow).getByRole('button', {
      name: 'Confirmer le contrôle qualité de la variété Rouge du Roussillon',
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
      name: 'Actions de la caractéristique Côte',
    }));
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));

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

  it('expose les actions des Dimensions dans des menus accessibles et conserve les boutons des Références', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('tab', { name: 'Dimensions (4)' }));

    const varietyTrigger = screen.getByRole('button', {
      name: 'Actions de la variété Bergeron',
    });
    expect(varietyTrigger).toHaveAttribute('aria-haspopup', 'dialog');
    await user.click(varietyTrigger);
    const varietyActions = screen.getByRole('group', {
      name: 'Actions de la variété Bergeron',
    });
    expect(within(varietyActions).getByRole('button', {
      name: 'Corriger',
    })).toBeInTheDocument();
    expect(within(varietyActions).getByRole('button', {
      name: 'Archiver',
    })).toBeInTheDocument();
    expect(within(varietyActions).getByRole('button', {
      name: 'Supprimer',
    })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', {
      name: 'Archivées (1)',
    }));
    await user.click(screen.getByRole('button', {
      name: 'Actions de la caractéristique Rouge',
    }));
    const archivedActions = screen.getByRole('group', {
      name: 'Actions de la caractéristique Rouge',
    });
    expect(within(archivedActions).getByRole('button', {
      name: 'Réactiver',
    })).toBeInTheDocument();
    expect(within(archivedActions).queryByRole('button', {
      name: 'Archiver',
    })).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
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
