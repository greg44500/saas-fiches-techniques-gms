import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TooltipProvider } from '@/components/ui/tooltip';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
  createWorkspaceVariant: vi.fn(),
  createGlobalVariant: vi.fn(),
  workspaceDimensions: vi.fn(),
  globalDimensions: vi.fn(),
}));

vi.mock('@/features/products/api/product-catalog-api', () => ({
  useCreateVariantMutation: () => [
    mocks.createWorkspaceVariant,
    { isLoading: false },
  ],
  useGetProductDimensionsQuery: mocks.workspaceDimensions,
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useCreateProductReferenceVariantMutation: () => [
    mocks.createGlobalVariant,
    { isLoading: false },
  ],
  useGetProductReferenceDimensionsQuery: mocks.globalDimensions,
}));

vi.mock('@/features/products/components/product-dimension-contribution-dialog', () => ({
  ProductDimensionContributionDialog: () => null,
}));

vi.mock('@/features/products/components/product-variant-fields', () => ({
  createEmptyVariantDraft: () => ({
    name: '',
    conservationType: 'FRAIS',
    referenceUnit: 'KG',
    foodRange: 1,
    characteristicIdsByKind: {},
    varietyId: '',
    processingState: '',
    yieldPercent: '',
    structured: true,
  }),
  variantDraftToPayload: (value) => ({
    name: value.name,
    conservationType: value.conservationType,
    referenceUnit: value.referenceUnit,
    foodRange: value.foodRange,
    characteristicIds: [],
  }),
  ProductVariantFields: ({ onChange, value }) => (
    <label>
      Nom de la référence
      <input
        aria-label="Nom de la référence"
        onChange={(event) => onChange({
          ...value,
          name: event.target.value,
        })}
        value={value.name}
      />
    </label>
  ),
}));

import {
  ProductVariantCreateDialog,
} from '@/features/products/components/product-variant-create-dialog';

const metadata = {
  conservationTypes: [{ value: 'FRAIS', label: 'Frais' }],
  referenceUnits: [{ value: 'KG', label: 'kg' }],
  foodRanges: [{ value: 1, label: 'Gamme 1' }],
};

function queryResult(data) {
  return {
    data,
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  };
}

describe('ProductVariantCreateDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.workspaceDimensions.mockReturnValue(queryResult({
      varieties: [],
      characteristics: [],
    }));
    mocks.globalDimensions.mockReturnValue(queryResult({
      varieties: [],
      characteristics: [],
    }));
  });

  it('demande de comparer une Référence proche avant de confirmer une création distincte', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();

    const firstResult = {
      unwrap: vi.fn().mockResolvedValue({
        classification: 'USER_CONFIRMATION_REQUIRED',
        candidates: [{
          id: 'variant-gala',
          name: 'Gala',
        }],
      }),
    };
    const secondResult = {
      unwrap: vi.fn().mockResolvedValue({
        classification: 'PROVISIONAL',
        variant: {
          id: 'variant-galla',
          name: 'Galla',
          governanceStatus: 'PROVISIONAL',
        },
      }),
    };
    mocks.createWorkspaceVariant
      .mockReturnValueOnce(firstResult)
      .mockReturnValueOnce(secondResult);

    render(
      <TooltipProvider>
        <ProductVariantCreateDialog
          existingVariants={[]}
          metadata={metadata}
          onClose={vi.fn()}
          onCreated={onCreated}
          open
          product={{ id: 'product-pomme', name: 'Pomme' }}
          workspaceId="workspace-1"
        />
      </TooltipProvider>,
    );

    await user.type(
      screen.getByRole('textbox', { name: 'Nom de la référence' }),
      'Galla',
    );
    await user.click(screen.getByRole('button', {
      name: 'Créer la référence',
    }));

    expect(mocks.createWorkspaceVariant).toHaveBeenNthCalledWith(1, {
      workspaceId: 'workspace-1',
      productId: 'product-pomme',
      name: 'Galla',
      conservationType: 'FRAIS',
      referenceUnit: 'KG',
      foodRange: 1,
      characteristicIds: [],
      forceCreate: false,
      reviewedCandidateIds: [],
    });

    expect(screen.getByText('Références proches à examiner'))
      .toBeInTheDocument();
    expect(screen.getByText('Gala')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', {
      name: 'Différente',
    }));
    await user.click(screen.getByRole('button', {
      name: 'Confirmer la nouvelle référence',
    }));

    expect(mocks.createWorkspaceVariant).toHaveBeenNthCalledWith(2, {
      workspaceId: 'workspace-1',
      productId: 'product-pomme',
      name: 'Galla',
      conservationType: 'FRAIS',
      referenceUnit: 'KG',
      foodRange: 1,
      characteristicIds: [],
      forceCreate: true,
      reviewedCandidateIds: ['variant-gala'],
    });
    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        classification: 'PROVISIONAL',
      }),
    );
  });
});
