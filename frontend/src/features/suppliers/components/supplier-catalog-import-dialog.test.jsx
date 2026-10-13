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

  it('distingue les unités, poids et poids égouttés du mapping', () => {
    expect(autoDetectMapping([
      'Reference',
      'Designation',
      'Unites',
      'Quantite par unite',
      'Unite',
      'Poids net egoutte',
      'Unite poids net egoutte',
      'Poids net',
      'Unite poids net',
      'Libelle fournisseur',
      'Prix HT',
      'Base',
      'Devise',
    ])).toEqual({
      supplierReference: 0,
      designation: 1,
      unitCount: 2,
      quantityPerUnit: 3,
      unit: 4,
      drainedNetWeight: 5,
      drainedNetWeightUnit: 6,
      netWeight: 7,
      netWeightUnit: 8,
      supplierLabel: 9,
      priceAmount: 10,
      priceBasis: 11,
    });
  });

  it('ne confond pas unité du prix et montant tarifaire', () => {
    const mapping = autoDetectMapping([
      'Reference',
      'Designation',
      'Unite du prix',
      'Prix HT',
    ]);

    expect(mapping.priceAmount).toBe(3);
    expect(mapping.priceBasis).toBe(2);
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

    expect(
      screen.getByRole('button', { name: 'Choisir un fichier' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Aucun fichier sélectionné'),
    ).toBeInTheDocument();

    const file = new File(
      ['Reference;Designation;Prix;Base\nREF-001;Carotte;1.2;KG'],
      'catalogue.csv',
      { type: 'text/csv' },
    );

    await user.upload(
      screen.getByLabelText('Fichier'),
      file,
    );

    expect(
      screen.getByText('Fichier choisi : catalogue.csv'),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', {
        name: 'Analyser le fichier',
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
      'Octobre 2026',
    );
    await user.type(
      screen.getByLabelText('Date d’édition'),
      '09/10/2026',
    );
    await user.tab();
    await user.type(
      screen.getByLabelText('Valide à partir du'),
      '01/10/2026',
    );
    await user.tab();
    await user.type(
      screen.getByLabelText('Valide jusqu’au'),
      '31/10/2026',
    );
    await user.tab();

    expect(screen.getByText('Unité du prix (Kilo, Pièce, etc.)'))
      .toBeInTheDocument();
    expect(screen.getByText('Associer').closest('li')).toHaveAttribute('aria-current', 'step');

    await user.click(
      screen.getByRole('button', {
        name: 'Prévisualiser',
      }),
    );
    expect(screen.getByText('Vérifier').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByText('Devise')).not.toBeInTheDocument();

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
          name: 'Octobre 2026',
          editionDate: '2026-10-09T00:00:00.000Z',
          validFrom: '2026-10-01T00:00:00.000Z',
          validTo: '2026-10-31T00:00:00.000Z',
        }),
        mapping: expect.objectContaining({
          supplierReference: 0,
          designation: 1,
          priceAmount: 2,
          priceBasis: 3,
        }),
        defaults: {
          currency: 'EUR',
        },
      }),
    );
  });
  it('affiche la quatrième étape après la confirmation du catalogue', async () => {
    const user = userEvent.setup();
    const onCommitted = vi.fn();

    mocks.inspectWorkspace.mockReturnValue(resolved({
      importId: 'import-catalogue',
      format: 'CSV',
      headers: ['Reference', 'Designation'],
      rowCount: 1,
    }));
    mocks.previewWorkspace.mockReturnValue(resolved({
      counts: { MATCHED: 1 },
      rows: [{
        rowNumber: 2,
        supplierReference: 'REF-1',
        designation: 'Pain',
        classification: 'MATCHED',
        errors: [],
      }],
    }));
    mocks.commitWorkspace.mockReturnValue(resolved({
      changedLines: 1,
    }));

    render(
      <SupplierCatalogImportDialog
        onClose={vi.fn()}
        onCommitted={onCommitted}
        open
        suppliers={[{ id: 'supplier-1', name: 'Sysco' }]}
        workspaceId="workspace-1"
      />,
    );

    await user.upload(
      screen.getByLabelText('Fichier'),
      new File(['Reference;Designation\nREF-1;Pain'], 'catalogue.csv', {
        type: 'text/csv',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Analyser le fichier' }));
    await user.click(screen.getByRole('combobox', { name: 'Fournisseur du catalogue' }));
    await user.click(await screen.findByRole('option', { name: 'Sysco' }));
    await user.type(screen.getByLabelText('Édition'), 'Octobre 2026');
    await user.click(screen.getByRole('button', { name: 'Prévisualiser' }));
    expect(screen.getByText('Vérifier').closest('li')).toHaveAttribute('aria-current', 'step');

    await user.click(screen.getByRole('button', { name: 'Confirmer l’import' }));
    expect(onCommitted).toHaveBeenCalledWith({ changedLines: 1 });
    expect(screen.getByText('Terminer').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('heading', { name: 'Import terminé' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeInTheDocument();
  });

});
