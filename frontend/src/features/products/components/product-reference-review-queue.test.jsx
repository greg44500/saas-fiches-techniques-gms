import {
  render,
  screen,
  waitFor,
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

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  queue: vi.fn(),
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useListProductReferenceReviewQueueQuery: mocks.queue,
}));

import {
  ProductReferenceReviewQueue,
} from '@/features/products/components/product-reference-review-queue';

const metadata = {
  productCharacteristicKinds: [
    { value: 'COLOR', label: 'Couleur' },
  ],
};

const items = [
  {
    id: 'CONTRIBUTION:product-contribution',
    sourceId: 'product-contribution',
    targetId: 'product-new',
    type: 'CONTRIBUTION',
    dataType: 'PRODUCT',
    value: 'Sauce tomatte',
    contributionType: 'CANONICAL_PRODUCT',
    productId: 'product-new',
    product: { id: 'product-new', name: 'Sauce tomatte' },
    candidates: [{
      id: 'product-existing',
      name: 'Sauce tomate',
    }],
  },
  {
    id: 'CONTRIBUTION:variant-contribution',
    sourceId: 'variant-contribution',
    targetId: 'variant-new',
    type: 'CONTRIBUTION',
    dataType: 'REFERENCE',
    value: 'Abricot sec',
    contributionType: 'VARIANT',
    productId: 'product-apricot',
    product: { id: 'product-apricot', name: 'Abricot' },
    candidates: [],
  },
  {
    id: 'DIMENSION_REVIEW:color-new',
    sourceId: 'color-new',
    targetId: 'color-new',
    type: 'DIMENSION_REVIEW',
    dataType: 'DIMENSION',
    value: 'Rouge',
    contributionType: null,
    dimensionType: 'CHARACTERISTIC',
    characteristicKind: 'COLOR',
    productId: 'product-apricot',
    product: { id: 'product-apricot', name: 'Abricot' },
    candidates: [],
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

function renderQueue(overrides = {}) {
  return render(
    <TooltipProvider>
      <ProductReferenceReviewQueue
        metadata={metadata}
        onExamine={vi.fn()}
        page={1}
        pageSize={20}
        setPage={vi.fn()}
        setPageSize={vi.fn()}
        {...overrides}
      />
    </TooltipProvider>,
  );
}

describe('ProductReferenceReviewQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.queue.mockReturnValue(queryResult({
      items,
      summary: {
        total: 3,
        productCount: 1,
        referenceCount: 1,
        dimensionCount: 1,
      },
      origins: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
      },
    }));
  });

  it('présente la file comme une liste de données métier à contrôler', () => {
    renderQueue();

    expect(screen.getByRole('columnheader', { name: 'Type' }))
      .toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Donnée à valider' }))
      .toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Contexte' }))
      .toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Rapprochement' }))
      .toBeInTheDocument();

    expect(screen.getByText('Produit')).toBeInTheDocument();
    expect(screen.getByText('Référence')).toBeInTheDocument();
    expect(screen.getByText('Dimension · Couleur')).toBeInTheDocument();

    expect(screen.getByText('Sauce tomatte')).toBeInTheDocument();
    expect(screen.getByText('Sauce tomate')).toBeInTheDocument();
    expect(screen.getByText('Abricot sec')).toBeInTheDocument();
    expect(screen.getAllByText('Abricot')).toHaveLength(2);

    const productRow = screen.getByRole('row', {
      name: /Sauce tomatte/,
    });
    const referenceRow = screen.getByRole('row', {
      name: /Abricot sec/,
    });
    const dimensionRow = screen.getByRole('row', {
      name: /Rouge/,
    });

    expect(within(productRow).getByText('Rapprochement à vérifier'))
      .toBeInTheDocument();
    expect(within(referenceRow).getByText('À contrôler'))
      .toBeInTheDocument();
    expect(within(dimensionRow).getByText('À contrôler'))
      .toBeInTheDocument();
    expect(screen.queryByText('Atelier pilote')).not.toBeInTheDocument();
  });

  it('charge une file légère sans origine Workspace', () => {
    renderQueue();

    expect(mocks.queue).toHaveBeenCalledWith({
      origins: 'omit',
      page: 1,
      limit: 20,
    });
  });

  it('ouvre exactement la donnée demandée sans décider dans le tableau', async () => {
    const user = userEvent.setup();
    const onExamine = vi.fn();

    renderQueue({ onExamine });

    await user.click(screen.getByRole('button', {
      name: 'Examiner Abricot sec',
    }));

    expect(onExamine).toHaveBeenCalledWith(items[1]);
    expect(screen.queryByRole('button', { name: 'Valider' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refuser' }))
      .not.toBeInTheDocument();
  });

  it('recale la pagination lorsque la dernière page disparaît', async () => {
    const setPage = vi.fn();

    mocks.queue.mockReturnValue(queryResult({
      items: [],
      summary: {
        total: 1,
        productCount: 0,
        referenceCount: 1,
        dimensionCount: 0,
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
});
