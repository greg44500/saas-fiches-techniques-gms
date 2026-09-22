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

import {
  ProductImportDialog,
  buildMappingPayload,
} from '@/features/products/components/product-import-dialog';

const metadata = {
  referenceUnits: [{ value: 'KG', label: 'kg' }],
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
      form: '2',
    })).toEqual({
      name: 0,
      form: 2,
    });
  });

  it('inspecte le fichier et rend visibles les colonnes M-003 hors périmètre', async () => {
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

    expect(await screen.findByText('Colonnes hors périmètre M-002')).toBeInTheDocument();
    expect(screen.getByText('Prix HT')).toBeInTheDocument();
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
      counts: { PROPOSE_PRODUCT: 1 },
      rows: [{
        rowNumber: 2,
        classification: 'PROPOSE_PRODUCT',
        data: {
          name: 'Carotte',
          aliases: [],
          categoryId: null,
          variant: { referenceUnit: 'KG' },
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
    await user.click(await screen.findByRole('button', { name: 'Prévisualiser' }));
    await user.click(await screen.findByRole('button', { name: 'Confirmer l’import' }));

    expect(await screen.findByText(/référentiel a changé/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Actualiser la prévisualisation' }));

    await waitFor(() => {
      expect(mocks.previewImport).toHaveBeenCalledTimes(2);
    });
  });
});
