import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  contribute: vi.fn(),
  createVariety: vi.fn(),
  createCharacteristic: vi.fn(),
}));

vi.mock('@/features/products/api/product-catalog-api', () => ({
  useContributeProductReferenceMutation: () => [
    mocks.contribute,
    { isLoading: false },
  ],
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useCreateProductReferenceVarietyMutation: () => [
    mocks.createVariety,
    { isLoading: false },
  ],
  useCreateProductReferenceCharacteristicMutation: () => [
    mocks.createCharacteristic,
    { isLoading: false },
  ],
}));

import {
  ProductDimensionContributionDialog,
} from '@/features/products/components/product-dimension-contribution-dialog';

const metadata = {
  productCharacteristicKinds: [
    { value: 'PRESENTATION', label: 'Présentation' },
    { value: 'COLOR', label: 'Couleur' },
    { value: 'QUALITY_DESIGNATION', label: 'Désignation de qualité' },
  ],
};

function resolved(value) {
  return {
    unwrap: vi.fn().mockResolvedValue(value),
  };
}

function renderDialog(overrides = {}) {
  const props = {
    metadata,
    mode: 'workspace',
    onClose: vi.fn(),
    onResolved: vi.fn(),
    open: true,
    product: { id: 'product-1', name: 'Pomme' },
    workspaceId: 'workspace-1',
    ...overrides,
  };

  render(
    <TooltipProvider>
      <ProductDimensionContributionDialog {...props} />
    </TooltipProvider>,
  );
  return props;
}

describe('ProductDimensionContributionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permet plusieurs ajouts successifs de Variétés sans fermer le dialogue', async () => {
    const user = userEvent.setup();
    const props = renderDialog();

    mocks.contribute
      .mockReturnValueOnce(resolved({
        classification: 'AUTO_PUBLISHABLE',
        publishedReference: {
          id: 'variety-gala',
          type: 'VARIETY',
          name: 'Gala',
        },
      }))
      .mockReturnValueOnce(resolved({
        classification: 'AUTO_PUBLISHABLE',
        publishedReference: {
          id: 'variety-golden',
          type: 'VARIETY',
          name: 'Golden',
        },
      }));

    const input = screen.getByLabelText('Nom de la variété');

    await user.type(input, 'Gala');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    expect(input).toHaveValue('');
    expect(props.onClose).not.toHaveBeenCalled();

    await user.type(input, 'Golden');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    expect(mocks.contribute).toHaveBeenNthCalledWith(1, {
      workspaceId: 'workspace-1',
      type: 'VARIETY',
      productId: 'product-1',
      value: 'Gala',
    });
    expect(mocks.contribute).toHaveBeenNthCalledWith(2, {
      workspaceId: 'workspace-1',
      type: 'VARIETY',
      productId: 'product-1',
      value: 'Golden',
    });
    expect(props.onResolved).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Gala')).toBeInTheDocument();
    expect(screen.getByText('Golden')).toBeInTheDocument();
    expect(screen.getAllByText('Disponible')).toHaveLength(2);
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('réutilise une valeur EXISTING et permet de poursuivre la session', async () => {
    const user = userEvent.setup();
    const props = renderDialog();

    mocks.contribute.mockReturnValue(resolved({
      classification: 'EXISTING',
      existingReference: {
        id: 'variety-reinette',
        type: 'VARIETY',
        name: 'Reinette',
      },
    }));

    await user.type(screen.getByLabelText('Nom de la variété'), 'Reinnette');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    expect(props.onResolved).toHaveBeenCalledWith(expect.objectContaining({
      classification: 'EXISTING',
      existingReference: expect.objectContaining({
        id: 'variety-reinette',
      }),
    }));
    expect(screen.getByText('Reinette')).toBeInTheDocument();
    expect(screen.getByText('Existe déjà')).toBeInTheDocument();
    expect(screen.getByLabelText('Nom de la variété')).toHaveValue('');
    expect(props.onClose).not.toHaveBeenCalled();
    expect(mocks.createVariety).not.toHaveBeenCalled();
    expect(mocks.createCharacteristic).not.toHaveBeenCalled();
  });

  it('propose directement les types métier et conserve une valeur à examiner dans la session', async () => {
    const user = userEvent.setup();
    const props = renderDialog();

    mocks.contribute.mockReturnValue(resolved({
      classification: 'REVIEW_REQUIRED',
      contribution: {
        id: 'contribution-1',
        status: 'PENDING_REVIEW',
      },
      reasons: [{
        code: 'CHARACTERISTIC_REQUIRES_GOVERNANCE',
        message: 'Revue requise.',
      }],
    }));

    expect(screen.queryByLabelText('Dimension')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Type de caractéristique'))
      .not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Type de valeur'));
    await user.click(screen.getByRole('option', {
      name: 'Désignation de qualité',
    }));

    await user.type(
      screen.getByLabelText('Désignation de qualité'),
      'Carottes des sables',
    );
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    expect(mocks.contribute).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      type: 'CHARACTERISTIC',
      productId: 'product-1',
      characteristicKind: 'QUALITY_DESIGNATION',
      value: 'Carottes des sables',
    });
    expect(screen.getByText('Carottes des sables')).toBeInTheDocument();
    expect(screen.getByText('À examiner')).toBeInTheDocument();
    expect(screen.getByText(/Disponible après validation/i))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter' }))
      .toBeInTheDocument();
    expect(props.onResolved).toHaveBeenCalledWith(expect.objectContaining({
      classification: 'REVIEW_REQUIRED',
    }));
    expect(props.onClose).not.toHaveBeenCalled();
  });
});
