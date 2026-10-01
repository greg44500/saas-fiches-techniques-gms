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
  useGetProductReferenceDetailQuery: mocks.detail,
  useGetProductReferenceDimensionsQuery: mocks.dimensions,
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

function renderDrawer() {
  return render(
    <ProductReferenceDetailsDrawer
      canManage
      metadata={metadata}
      onClose={vi.fn()}
      open
      productId="product-1"
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
        aliases: [],
        category: { id: 'category-1', name: 'Fruits' },
        status: 'ACTIVE',
      },
      variants: [
        {
          id: 'variant-1',
          name: 'Abricot frais',
          conservationType: 'FRAIS',
          referenceUnit: 'KG',
          status: 'ACTIVE',
        },
        {
          id: 'variant-2',
          name: 'Abricot archivé',
          conservationType: 'FRAIS',
          referenceUnit: 'KG',
          status: 'ARCHIVED',
        },
      ],
      events: [],
    }));

    mocks.dimensions.mockReturnValue(queryResult({
      varieties: [
        {
          id: 'variety-1',
          name: 'Bergeron',
          aliases: [],
          status: 'ACTIVE',
          isNew: false,
        },
        {
          id: 'variety-2',
          name: 'Rouge du Roussillon',
          aliases: ['Roussillon rouge'],
          status: 'ACTIVE',
          isNew: true,
        },
      ],
      characteristics: [
        {
          id: 'characteristic-1',
          kind: 'CUT',
          name: 'Côte',
          aliases: [],
          status: 'ACTIVE',
          isNew: true,
        },
        {
          id: 'characteristic-2',
          kind: 'COLOR',
          name: 'Rouge',
          aliases: [],
          status: 'ARCHIVED',
          isNew: false,
        },
      ],
      review: {
        pendingCount: 2,
        reviewedAt: null,
      },
    }));

    const resolvedMutation = {
      unwrap: vi.fn().mockResolvedValue({}),
    };
    mocks.updateProductStatus.mockReturnValue(resolvedMutation);
    mocks.updateVariantStatus.mockReturnValue(resolvedMutation);
    mocks.updateVarietyStatus.mockReturnValue(resolvedMutation);
    mocks.updateCharacteristicStatus.mockReturnValue(resolvedMutation);
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
    expect(screen.getByText('Caractéristiques (2)')).toBeInTheDocument();
  });


  it('met en évidence les nouvelles Dimensions Workspace dans une ligne compacte', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('tab', { name: 'Dimensions (4)' }));

    expect(screen.getAllByText('Nouveau')).toHaveLength(2);

    const varietyRow = screen.getByText('Rouge du Roussillon').closest('li');
    expect(varietyRow).not.toBeNull();
    expect(within(varietyRow).getByText('Actif')).toBeInTheDocument();
    expect(within(varietyRow).getByText('Nouveau')).toBeInTheDocument();
    expect(within(varietyRow).getByRole('button', {
      name: 'Corriger la variété Rouge du Roussillon',
    })).toBeInTheDocument();
    expect(within(varietyRow).getByRole('button', {
      name: 'Archiver la variété Rouge du Roussillon',
    })).toBeInTheDocument();
  });

  it('filtre localement les Dimensions et propose des suggestions prédictives', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('tab', { name: 'Dimensions (4)' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Rechercher dans les dimensions' }),
      'rou',
    );

    const suggestions = screen.getByRole('list', {
      name: 'Suggestions de dimensions',
    });

    expect(within(suggestions).getByText('Rouge du Roussillon'))
      .toBeInTheDocument();
    expect(within(suggestions).getByText('Rouge'))
      .toBeInTheDocument();
    expect(screen.queryByText('Bergeron')).not.toBeInTheDocument();
    expect(screen.getByText('2 résultats sur 4 dimensions'))
      .toBeInTheDocument();
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
    expect(screen.getByRole('button', {
      name: 'Réactiver la caractéristique Rouge',
    })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Références (2)' }));

    expect(screen.getByRole('button', {
      name: 'Corriger la référence Abricot frais',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Archiver la référence Abricot frais',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Réactiver la référence Abricot archivé',
    })).toBeInTheDocument();
  });
});
