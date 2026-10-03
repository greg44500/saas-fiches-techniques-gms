import {
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  queue: vi.fn(),
  reviewContribution: vi.fn(),
  reviewDimension: vi.fn(),
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useListProductReferenceReviewQueueQuery: mocks.queue,
  useReviewProductReferenceContributionMutation: () => [
    mocks.reviewContribution,
    { isLoading: false },
  ],
  useReviewProductReferenceDimensionMutation: () => [
    mocks.reviewDimension,
    { isLoading: false },
  ],
}));

import {
  ProductReferenceReviewQueue,
} from '@/features/products/components/product-reference-review-queue';

const metadata = {
  productReviewQueueTypes: [
    { value: 'CONTRIBUTION', label: 'Contribution' },
    { value: 'DIMENSION_REVIEW', label: 'Valeur à vérifier' },
  ],
  productContributionTypes: [
    { value: 'CHARACTERISTIC', label: 'Caractéristique' },
  ],
  productCharacteristicKinds: [
    { value: 'QUALITY_DESIGNATION', label: 'Désignation de qualité' },
  ],
};

const items = [
  {
    id: 'CONTRIBUTION:contribution-1',
    sourceId: 'contribution-1',
    type: 'CONTRIBUTION',
    value: 'Carottes des sables',
    contributionType: 'CHARACTERISTIC',
    dimensionType: null,
    characteristicKind: 'QUALITY_DESIGNATION',
    productId: 'product-1',
    product: { id: 'product-1', name: 'Carotte' },
    workspaceId: 'workspace-1',
    workspace: { id: 'workspace-1', name: 'Atelier pilote' },
    author: {
      id: 'user-1',
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'alice@example.test',
    },
    reasons: [{
      code: 'CHARACTERISTIC_PROVISIONAL',
      message: 'Cette valeur nécessite une revue.',
    }],
    candidates: [{
      id: 'candidate-1',
      name: 'Carotte des sables',
    }],
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'DIMENSION_REVIEW:variety-1',
    sourceId: 'variety-1',
    type: 'DIMENSION_REVIEW',
    value: 'Gala',
    contributionType: null,
    dimensionType: 'VARIETY',
    characteristicKind: null,
    productId: 'product-2',
    product: { id: 'product-2', name: 'Pomme' },
    workspaceId: 'workspace-2',
    workspace: { id: 'workspace-2', name: 'Cuisine centrale' },
    author: {
      id: 'user-2',
      firstName: 'Bruno',
      lastName: 'Durand',
      email: 'bruno@example.test',
    },
    reasons: [],
    candidates: [],
    createdAt: '2026-10-02T08:00:00.000Z',
  },
];

function queryResult(data) {
  return {
    data,
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  };
}

function mutationResult(data = {}) {
  return {
    unwrap: vi.fn().mockResolvedValue(data),
  };
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
}

function renderQueue(overrides = {}) {
  return render(
    <TooltipProvider>
      <ToastProvider>
        <ProductReferenceReviewQueue
          canManage
          metadata={metadata}
          onOpenProduct={vi.fn()}
          page={1}
          pageSize={20}
          setPage={vi.fn()}
          setPageSize={vi.fn()}
          {...overrides}
        />
      </ToastProvider>
    </TooltipProvider>,
  );
}

describe('ProductReferenceReviewQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queue.mockReturnValue(queryResult({
      items,
      summary: {
        total: 2,
        contributionCount: 1,
        dimensionReviewCount: 1,
      },
      origins: [
        { id: 'workspace-1', name: 'Atelier pilote', count: 1 },
        { id: 'workspace-2', name: 'Cuisine centrale', count: 1 },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      },
    }));
    mocks.reviewContribution.mockReturnValue(mutationResult());
    mocks.reviewDimension.mockReturnValue(mutationResult());
  });

  it('affiche une file unifiée avec compteur, origine et ancienneté', () => {
    renderQueue();

    expect(screen.getByRole('heading', { name: 'À contrôler' }))
      .toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Carottes des sables')).toBeInTheDocument();
    expect(screen.getByText('Gala')).toBeInTheDocument();
    expect(screen.getByText('Atelier pilote')).toBeInTheDocument();
    expect(screen.getByText('Cuisine centrale')).toBeInTheDocument();
    expect(screen.getByText('01/10/2026')).toBeInTheDocument();
    expect(screen.getByText('02/10/2026')).toBeInTheDocument();
  });

  it('filtre côté serveur par type puis origine Workspace', async () => {
    const user = userEvent.setup();
    renderQueue();

    await selectOption(
      user,
      'Filtrer les éléments à contrôler par type',
      'Valeur à vérifier',
    );

    await waitFor(() => {
      expect(mocks.queue).toHaveBeenLastCalledWith({
        type: 'DIMENSION_REVIEW',
        workspaceId: undefined,
        page: 1,
        limit: 20,
      });
    });

    await selectOption(
      user,
      'Filtrer les éléments à contrôler par origine',
      'Atelier pilote (1)',
    );

    await waitFor(() => {
      expect(mocks.queue).toHaveBeenLastCalledWith({
        type: 'DIMENSION_REVIEW',
        workspaceId: 'workspace-1',
        page: 1,
        limit: 20,
      });
    });
  });

  it('retire un filtre origine devenu sans résultat', async () => {
    const user = userEvent.setup();
    const setPage = vi.fn();

    const view = renderQueue({ setPage });

    await selectOption(
      user,
      'Filtrer les éléments à contrôler par origine',
      'Atelier pilote (1)',
    );

    expect(mocks.queue).toHaveBeenLastCalledWith({
      type: undefined,
      workspaceId: 'workspace-1',
      page: 1,
      limit: 20,
    });

    mocks.queue.mockReturnValue(queryResult({
      items: [],
      summary: {
        total: 0,
        contributionCount: 0,
        dimensionReviewCount: 0,
      },
      origins: [
        { id: 'workspace-2', name: 'Cuisine centrale', count: 1 },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    }));

    view.rerender(
      <TooltipProvider>
        <ToastProvider>
          <ProductReferenceReviewQueue
            canManage
            metadata={metadata}
            onOpenProduct={vi.fn()}
            page={1}
            pageSize={20}
            setPage={setPage}
            setPageSize={vi.fn()}
          />
        </ToastProvider>
      </TooltipProvider>,
    );

    await waitFor(() => {
      expect(mocks.queue).toHaveBeenLastCalledWith({
        type: undefined,
        workspaceId: undefined,
        page: 1,
        limit: 20,
      });
    });
    expect(setPage).toHaveBeenCalledWith(1);
  });

  it('recale la pagination lorsque la dernière page disparaît', async () => {
    const setPage = vi.fn();
    mocks.queue.mockReturnValue(queryResult({
      items: [],
      summary: {
        total: 1,
        contributionCount: 1,
        dimensionReviewCount: 0,
      },
      origins: [],
      pagination: {
        page: 2,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    }));

    renderQueue({
      page: 2,
      setPage,
    });

    await waitFor(() => {
      expect(setPage).toHaveBeenCalledWith(1);
    });
  });

  it('traite une Contribution avec les mutations existantes', async () => {
    const user = userEvent.setup();
    renderQueue();

    await user.click(screen.getByRole('button', { name: 'Approuver' }));

    expect(mocks.reviewContribution).toHaveBeenCalledWith({
      contributionId: 'contribution-1',
      decision: 'APPROVE',
    });

    await user.click(screen.getByRole('button', {
      name: 'Fusionner avec Carotte des sables',
    }));

    expect(mocks.reviewContribution).toHaveBeenCalledWith({
      contributionId: 'contribution-1',
      decision: 'MERGE',
      targetReferenceId: 'candidate-1',
    });
  });

  it('valide directement une Dimension puis conserve l’accès au Produit', async () => {
    const user = userEvent.setup();
    const onOpenProduct = vi.fn();
    renderQueue({ onOpenProduct });

    await user.click(screen.getByRole('button', {
      name: 'Marquer Gala comme vérifiée',
    }));

    expect(mocks.reviewDimension).toHaveBeenCalledWith({
      productId: 'product-2',
      dimensionType: 'VARIETY',
      dimensionId: 'variety-1',
    });

    await user.click(screen.getByRole('button', {
      name: 'Examiner Gala',
    }));

    expect(onOpenProduct).toHaveBeenCalledWith(
      'product-2',
      'dimensions',
      'pending',
    );
  });

  it('reste consultable sans droit de gestion mais masque les décisions', () => {
    renderQueue({ canManage: false });

    expect(screen.queryByRole('button', { name: 'Approuver' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Marquer Gala comme vérifiée',
    })).not.toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Examiner Carottes des sables',
    })).toBeInTheDocument();
  });
});
