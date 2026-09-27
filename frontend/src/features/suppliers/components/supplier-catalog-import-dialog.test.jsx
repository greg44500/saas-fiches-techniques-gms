import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  inspectWorkspace: vi.fn(),
  previewWorkspace: vi.fn(),
  commitWorkspace: vi.fn(),
  inspectGlobal: vi.fn(),
  previewGlobal: vi.fn(),
  commitGlobal: vi.fn(),
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useInspectSupplierCatalogImportMutation: () => [
    mocks.inspectWorkspace,
    { isLoading: false },
  ],
  usePreviewSupplierCatalogImportMutation: () => [
    mocks.previewWorkspace,
    { isLoading: false },
  ],
  useCommitSupplierCatalogImportMutation: () => [
    mocks.commitWorkspace,
    { isLoading: false },
  ],
  useInspectGlobalSupplierCatalogImportMutation: () => [
    mocks.inspectGlobal,
    { isLoading: false },
  ],
  usePreviewGlobalSupplierCatalogImportMutation: () => [
    mocks.previewGlobal,
    { isLoading: false },
  ],
  useCommitGlobalSupplierCatalogImportMutation: () => [
    mocks.commitGlobal,
    { isLoading: false },
  ],
}));

import {
  SupplierCatalogImportDialog,
  autoDetectMapping,
} from '@/features/suppliers/components/supplier-catalog-import-dialog';

function resolved(value) {
  return {
    unwrap: vi.fn().mockResolvedValue(value),
  };
}

describe('SupplierCatalogImportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('distingue la colonne nombre d unités de la colonne unité', () => {
    expect(autoDetectMapping([
      'Reference',
      'Designation',
      'Unites',
      'Quantite',
      'Unite',
      'Prix',
      'Base',
    ])).toEqual({
      supplierReference: 0,
      designation: 1,
      unitCount: 2,
      quantityPerUnit: 3,
      unit: 4,
      priceAmount: 5,
      priceBasis: 6,
    });
  });

  it('rend une ambiguïté visible avant confirmation', async () => {
    const user = userEvent.setup();

    mocks.inspectWorkspace.mockReturnValue(resolved({
      importId: 'import-1',
      format: 'CSV',
      headers: [
        'Reference',
        'Designation',
        'Prix',
        'Base',
      ],
      rowCount: 1,
      expiresAt: '2026-09-27T20:00:00.000Z',
    }));

    mocks.previewWorkspace.mockReturnValue(resolved({
      importId: 'import-1',
      counts: {
        AMBIGUOUS: 1,
      },
      rows: [{
        rowNumber: 2,
        supplierReference: 'REF-001',
        designation: 'Carotte',
        classification: 'AMBIGUOUS',
        errors: [],
      }],
      editionIdentityKey: 'catalogue-septembre',
    }));

    render(
      <SupplierCatalogImportDialog
        onClose={vi.fn()}
        onCommitted={vi.fn()}
        open
        suppliers={[
          {
            id: 'supplier-1',
            name: 'Sysco',
          },
        ]}
        workspaceId="workspace-1"
      />,
    );

    const file = new File(
      ['Reference;Designation;Prix;Base\nREF-001;Carotte;1.2;KG'],
      'catalogue.csv',
      { type: 'text/csv' },
    );

    await user.upload(
      screen.getByLabelText('Fichier'),
      file,
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Inspecter le fichier',
      }),
    );

    const supplierSelect = await screen.findByRole('combobox', {
      name: 'Fournisseur du catalogue',
    });
    await user.click(supplierSelect);
    await user.click(await screen.findByRole('option', {
      name: 'Sysco',
    }));

    await user.type(
      screen.getByLabelText('Édition'),
      'Septembre 2026',
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Prévisualiser',
      }),
    );

    expect(
      await screen.findByText('Ambigu : 1'),
    ).toBeInTheDocument();
    expect(screen.getByText('REF-001')).toBeInTheDocument();
    expect(screen.getByText('Carotte')).toBeInTheDocument();

    expect(mocks.previewWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        importId: 'import-1',
        supplierId: 'supplier-1',
        edition: expect.objectContaining({
          name: 'Septembre 2026',
        }),
        mapping: expect.objectContaining({
          supplierReference: 0,
          designation: 1,
          priceAmount: 2,
          priceBasis: 3,
        }),
      }),
    );
  });
});
