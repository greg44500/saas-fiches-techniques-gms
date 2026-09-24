import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  inspectImport: vi.fn(),
  previewImport: vi.fn(),
  commitImport: vi.fn(),
  loadProductDetail: vi.fn(),
}));

vi.mock('@/features/products/api/product-catalog-api', () => ({
  useCommitProductImportMutation: () => [
    mocks.commitImport,
    { isLoading: false },
  ],
  useInspectProductImportMutation: () => [
    mocks.inspectImport,
    { isLoading: false },
  ],
  useLazyGetWorkspaceProductDetailQuery: () => [
    mocks.loadProductDetail,
    { isFetching: false },
  ],
  usePreviewProductImportMutation: () => [
    mocks.previewImport,
    { isLoading: false },
  ],
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useCommitProductReferenceImportMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
  useInspectProductReferenceImportMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
  useLazyGetProductReferenceDetailQuery: () => [
    vi.fn(),
    { isFetching: false },
  ],
  usePreviewProductReferenceImportMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
}));

import {
  ProductImportDialog,
  buildMappingPayload,
} from '@/features/products/components/product-import-dialog';

const metadata = {
  categories: [{ id: 'category-1', name: 'Légumes', status: 'ACTIVE' }],
  referenceUnits: [{ value: 'KG', label: 'kg' }],
  foodRanges: [
    {
      value: 1,
      label: 'Gamme 1',
      name: 'Frais',
      processingStates: ['Produit frais'],
      defaultProcessingState: 'Produit frais',
    },
    {
      value: 6,
      label: 'Gamme 6',
      name: 'PAI / PAE',
      processingStates: ['PAI / PAE'],
      defaultProcessingState: 'PAI / PAE',
    },
  ],
};

function resolved(value) {
  return { unwrap: vi.fn().mockResolvedValue(value) };
}

describe('ProductImportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('construit un mapping backend sans colonnes non associées', () => {
    expect(buildMappingPayload({
      name: '0',
      aliases: '__NONE__',
      variety: '1',
      presentation: '2',
      qualityDesignation: '3',
    })).toEqual({
      name: 0,
      variety: 1,
      presentation: 2,
      qualityDesignation: 3,
    });
  });

  it('inspecte le fichier et rend visibles les colonnes commerciales M-003', async () => {
    const user = userEvent.setup();

    mocks.inspectImport.mockReturnValue(resolved({
      importId: 'import-1',
      format: 'CSV',
      headers: ['Produit', 'Prix HT'],
      rowCount: 1,
      outOfScopeColumns: [
        { index: 1, header: 'Prix HT', domain: 'M-003', kind: 'PRICE' },
      ],
    }));

    render(
      <ProductImportDialog
        metadata={metadata}
        onClose={vi.fn()}
        onCommitted={vi.fn()}
        open
        workspaceId="workspace-1"
      />,
    );

    const file = new File(['Produit,Prix HT\nCarotte,1.20'], 'produits.csv', {
      type: 'text/csv',
    });

    await user.upload(screen.getByLabelText('Fichier'), file);
    await user.click(screen.getByRole('button', { name: 'Analyser le fichier' }));

    expect(await screen.findByText('Colonnes commerciales détectées'))
      .toBeInTheDocument();
    expect(screen.getByText('Prix HT')).toBeInTheDocument();
    expect(screen.getByLabelText('Variété')).toBeInTheDocument();
    expect(screen.getByLabelText('Présentation')).toBeInTheDocument();
    expect(screen.getByLabelText('Type commercial')).toBeInTheDocument();
    expect(screen.getByLabelText('Calibre / format')).toBeInTheDocument();
    expect(screen.getByLabelText('Couleur')).toBeInTheDocument();
    expect(screen.getByLabelText('Désignation de qualité')).toBeInTheDocument();
    expect(screen.queryByLabelText('Synonymes métier')).not.toBeInTheDocument();
    expect(mocks.inspectImport).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      file,
    });
  });

  it('gère le conflit 409 en exigeant une nouvelle prévisualisation', async () => {
    const user = userEvent.setup();

    mocks.inspectImport.mockReturnValue(resolved({
      importId: 'import-1',
      format: 'CSV',
      headers: ['Produit'],
      rowCount: 1,
      outOfScopeColumns: [],
    }));
    mocks.previewImport.mockReturnValue(resolved({
      importId: 'import-1',
      counts: { REVIEW_REQUIRED: 1 },
      rows: [{
        rowNumber: 2,
        classification: 'REVIEW_REQUIRED',
        reviewMode: 'REFERENCE_GOVERNANCE',
        data: {
          name: 'Carotte',
          aliases: [],
          categoryId: 'category-1',
          variant: {
            foodRange: 1,
            processingState: 'Produit frais',
            referenceUnit: 'KG',
          },
        },
        warnings: [],
        errors: [],
        candidates: [],
      }],
      outOfScopeColumns: [],
    }));
    mocks.commitImport.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({ status: 409 }),
    });

    render(
      <ProductImportDialog
        metadata={metadata}
        onClose={vi.fn()}
        onCommitted={vi.fn()}
        open
        workspaceId="workspace-1"
      />,
    );

    const file = new File(['Produit\nCarotte'], 'produits.csv', {
      type: 'text/csv',
    });
    await user.upload(screen.getByLabelText('Fichier'), file);
    await user.click(screen.getByRole('button', { name: 'Analyser le fichier' }));
    await user.click(await screen.findByLabelText('Gamme par défaut *'));
    await user.click(screen.getByRole('option', { name: 'Gamme 1 — Frais' }));
    await user.click(await screen.findByRole('button', { name: 'Prévisualiser' }));
    await user.click(await screen.findByRole('button', { name: 'Confirmer l’import' }));

    expect(await screen.findByText(/référentiel a changé/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Actualiser la prévisualisation' }));

    await waitFor(() => {
      expect(mocks.previewImport).toHaveBeenCalledTimes(2);
    });
  });
});
