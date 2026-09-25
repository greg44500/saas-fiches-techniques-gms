import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

  render(<ProductDimensionContributionDialog {...props} />);
  return props;
}

describe('ProductDimensionContributionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('auto-publie une nouvelle Variété non conflictuelle via le moteur Workspace', async () => {
    const user = userEvent.setup();
    const props = renderDialog();

    mocks.contribute.mockReturnValue(resolved({
      classification: 'AUTO_PUBLISHABLE',
      publishedReference: {
        id: 'variety-gala',
        type: 'VARIETY',
        name: 'Gala',
      },
    }));

    await user.type(screen.getByLabelText('Nom de la variété'), 'Gala');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    expect(mocks.contribute).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      type: 'VARIETY',
      productId: 'product-1',
      value: 'Gala',
    });
    expect(props.onResolved).toHaveBeenCalledWith(expect.objectContaining({
      classification: 'AUTO_PUBLISHABLE',
      publishedReference: expect.objectContaining({
        id: 'variety-gala',
      }),
    }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('réutilise une référence EXISTING sans création supplémentaire', async () => {
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
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(mocks.createVariety).not.toHaveBeenCalled();
    expect(mocks.createCharacteristic).not.toHaveBeenCalled();
  });

  it('maintient ouverte une caractéristique REVIEW_REQUIRED jusqu à la revue globale', async () => {
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

    await user.click(screen.getByLabelText('Dimension'));
    await user.click(screen.getByRole('option', { name: 'Caractéristique' }));

    await user.click(screen.getByLabelText('Type de caractéristique'));
    await user.click(screen.getByRole('option', {
      name: 'Désignation de qualité',
    }));

    await user.type(screen.getByLabelText('Valeur'), 'Carottes des sables');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    expect(mocks.contribute).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      type: 'CHARACTERISTIC',
      productId: 'product-1',
      characteristicKind: 'QUALITY_DESIGNATION',
      value: 'Carottes des sables',
    });
    expect(await screen.findByText(/nécessite une revue du référentiel global/i))
      .toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter' }))
      .not.toBeInTheDocument();
    expect(props.onResolved).toHaveBeenCalledWith(expect.objectContaining({
      classification: 'REVIEW_REQUIRED',
    }));
    expect(props.onClose).not.toHaveBeenCalled();
  });
});
