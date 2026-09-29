import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  metadataQuery: vi.fn(),
  listWorkspace: vi.fn(),
  listDossier: vi.fn(),
  setWorkspace: vi.fn(),
  setDossier: vi.fn(),
  archiveWorkspace: vi.fn(),
  archiveDossier: vi.fn(),
}));

vi.mock('@/features/products/api/product-catalog-api', () => ({
  useGetProductMetadataQuery: mocks.metadataQuery,
}));

vi.mock('@/features/products/components/product-search-autocomplete', () => ({
  ProductSearchAutocomplete: () => (
    <input aria-label="Recherche Produit" />
  ),
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useListWorkspaceIndicativePricesQuery: mocks.listWorkspace,
  useListDossierIndicativePricesQuery: mocks.listDossier,
  useSetWorkspaceIndicativePriceMutation: () => [
    mocks.setWorkspace,
    { isLoading: false },
  ],
  useSetDossierIndicativePriceMutation: () => [
    mocks.setDossier,
    { isLoading: false },
  ],
  useArchiveWorkspaceIndicativePriceMutation: () => [
    mocks.archiveWorkspace,
    { isLoading: false },
  ],
  useArchiveDossierIndicativePriceMutation: () => [
    mocks.archiveDossier,
    { isLoading: false },
  ],
}));

import {
  IndicativePriceDialog,
} from '@/features/suppliers/components/indicative-price-dialog';

const variant = {
  id: '507f1f77bcf86cd799439011',
  name: 'Carotte',
  referenceUnit: 'KG',
};

function queryResult(data = []) {
  return {
    data,
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  };
}

function mutationResult(data) {
  return {
    unwrap: vi.fn().mockResolvedValue(data),
  };
}

describe('IndicativePriceDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.metadataQuery.mockReturnValue({
      data: {
        referenceUnits: [
          { value: 'G', label: 'g', dimension: 'MASS' },
          { value: 'KG', label: 'kg', dimension: 'MASS' },
          { value: 'UNIT', label: 'unité', dimension: 'COUNT' },
        ],
      },
      isError: false,
      isLoading: false,
    });
    mocks.listWorkspace.mockReturnValue(queryResult([]));
    mocks.listDossier.mockReturnValue(queryResult([]));
    mocks.setWorkspace.mockReturnValue(mutationResult({
      id: 'price-1',
    }));
    mocks.setDossier.mockReturnValue(mutationResult({
      id: 'price-2',
    }));
    mocks.archiveWorkspace.mockReturnValue(mutationResult({
      id: 'price-1',
      status: 'ARCHIVED',
    }));
    mocks.archiveDossier.mockReturnValue(mutationResult({
      id: 'price-2',
      status: 'ARCHIVED',
    }));
  });

  it('enregistre un Prix indicatif Workspace directement sur une Référence Produit', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();

    render(
      <TooltipProvider>
        <IndicativePriceDialog
          onClose={vi.fn()}
          onSaved={onSaved}
          open
          variant={variant}
          workspaceId="workspace-1"
        />
      </TooltipProvider>,
    );

    expect(screen.getByRole('heading', {
      name: 'Prix indicatif de l’espace de travail',
    })).toBeInTheDocument();
    expect(screen.getByText('Carotte')).toBeInTheDocument();
    expect(screen.getByText('Unité du prix (Kilo, Pièce, etc.)'))
      .toBeInTheDocument();

    await user.type(
      screen.getByLabelText('Prix indicatif HT'),
      '1.85',
    );
    await user.type(
      screen.getByLabelText('Note / provenance'),
      'Estimation interne',
    );
    await user.click(screen.getByRole('button', {
      name: 'Enregistrer',
    }));

    expect(mocks.setWorkspace).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      productVariantId: variant.id,
      sourceAmount: '1.85',
      sourceBasis: 'KG',
      currency: 'EUR',
      source: 'Estimation interne',
    });
    expect(onSaved).toHaveBeenCalledWith({
      id: 'price-1',
    });
  });

  it('préremplit et remplace le Prix indicatif propre au Dossier', async () => {
    const user = userEvent.setup();

    mocks.listDossier.mockReturnValue(queryResult([{
      id: 'price-existing',
      sourceAmount: '2.1',
      sourceBasis: 'KG',
      source: 'Estimation magasin',
      productVariant: variant,
    }]));

    render(
      <TooltipProvider>
        <IndicativePriceDialog
          dossierId="dossier-1"
          onClose={vi.fn()}
          onSaved={vi.fn()}
          open
          variant={variant}
          workspaceId="workspace-1"
        />
      </TooltipProvider>,
    );

    expect(await screen.findByDisplayValue('2.1')).toBeInTheDocument();
    expect(screen.getByRole('heading', {
      name: 'Prix indicatif du Dossier',
    })).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Prix indicatif HT'));
    await user.type(screen.getByLabelText('Prix indicatif HT'), '2.25');
    await user.click(screen.getByRole('button', {
      name: 'Enregistrer',
    }));

    expect(mocks.setDossier).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      productVariantId: variant.id,
      sourceAmount: '2.25',
      sourceBasis: 'KG',
      currency: 'EUR',
      source: 'Estimation magasin',
    });
  });
});
