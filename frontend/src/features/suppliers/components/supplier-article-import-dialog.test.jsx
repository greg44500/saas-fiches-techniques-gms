import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  inspect: vi.fn(),
  preview: vi.fn(),
  commit: vi.fn(),
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useCreateSupplierMutation: () => [vi.fn(), { isLoading: false }],
  useCreateGlobalSupplierMutation: () => [vi.fn(), { isLoading: false }],
  useListSuppliersQuery: () => ({ data: { suppliers: [] }, isFetching: false }),
  useListGlobalSuppliersQuery: () => ({ data: { suppliers: [] }, isFetching: false }),
  useInspectSupplierArticleImportMutation: () => [mocks.inspect, { isLoading: false }],
  usePreviewSupplierArticleImportMutation: () => [mocks.preview, { isLoading: false }],
  useCommitSupplierArticleImportMutation: () => [mocks.commit, { isLoading: false }],
  useInspectGlobalSupplierArticleImportMutation: () => [vi.fn(), { isLoading: false }],
  usePreviewGlobalSupplierArticleImportMutation: () => [vi.fn(), { isLoading: false }],
  useCommitGlobalSupplierArticleImportMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock('@/features/suppliers/components/supplier-catalog-import-dialog', () => ({
  autoDetectMapping: (headers) => ({
    supplierReference: 0, designation: 1,
    ...(headers.includes('Prix HT') ? { priceAmount: 2 } : {}),
  }),
}));

import {
  SupplierArticleImportDialog,
} from '@/features/suppliers/components/supplier-article-import-dialog';

const resolved = (value) => ({ unwrap: vi.fn().mockResolvedValue(value) });
const renderDialog = (onCommitted = vi.fn()) => render(
  <SupplierArticleImportDialog
    onClose={vi.fn()}
    onCommitted={onCommitted}
    open
    suppliers={[{ id: 'supplier-1', name: 'Sysco' }]}
    workspaceId="workspace-1"
  />,
);

describe('SupplierArticleImportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.inspect.mockReturnValue(resolved({
      importId: 'import-1',
      format: 'CSV',
      headers: ['Reference', 'Designation'],
      rowCount: 2,
    }));
    mocks.preview.mockReturnValue(resolved({
      counts: { CREATE: 1, SKIPPED: 1 },
      rows: [
        {
          rowNumber: 2, supplierReference: 'REF-1',
          designation: 'Pain', classification: 'CREATE', errors: [],
        },
        {
          rowNumber: 3, supplierReference: null,
          designation: 'Autre pain', classification: 'SKIPPED',
          errors: ['Référence fournisseur absente'],
        },
      ],
    }));
    mocks.commit.mockReturnValue(resolved({ created: 1, updated: 0 }));
  });

  it('inspecte, affiche les lignes sans référence et confirme seulement après prévisualisation', async () => {
    const user = userEvent.setup();
    const committed = vi.fn();
    renderDialog(committed);

    const file = new File(['Reference;Designation\nREF-1;Pain'], 'liste.csv', {
      type: 'text/csv',
    });
    await user.upload(screen.getByLabelText('Fichier'), file);
    await user.click(screen.getByRole('button', { name: 'Analyser le fichier' }));
    expect(mocks.inspect).toHaveBeenCalledWith({ workspaceId: 'workspace-1', file });

    await user.click(screen.getByRole('button', { name: 'Sysco' }));
    await user.click(screen.getByRole('button', { name: 'Prévisualiser' }));
    expect(mocks.preview).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      importId: 'import-1',
      supplierId: 'supplier-1',
      mapping: { supplierReference: 0, designation: 1 },
    });
    expect(screen.getByText(/ligne\(s\) sans référence ignorée\(s\)/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirmer l’import' }));
    expect(mocks.commit).toHaveBeenCalledWith({
      workspaceId: 'workspace-1', importId: 'import-1',
    });
    expect(committed).toHaveBeenCalledWith({ created: 1, updated: 0 });
    expect(screen.getByText('Terminer').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('heading', { name: 'Import terminé' })).toBeInTheDocument();
  });

  it('transmet la provenance et la validité des tarifs sans catalogue', async () => {
    const user = userEvent.setup();
    mocks.inspect.mockReturnValue(resolved({
      importId: 'import-prix',
      format: 'CSV',
      headers: ['Reference', 'Designation', 'Prix HT'],
      rowCount: 1,
    }));
    renderDialog();
    await user.upload(screen.getByLabelText('Fichier'),
      new File(['Reference;Designation;Prix HT\\nR1;Pain;25'], 'prix.csv'));
    await user.click(screen.getByRole('button', { name: 'Analyser le fichier' }));
    await user.click(screen.getByRole('button', { name: 'Sysco' }));
    expect(screen.getByLabelText('Importer les prix présents dans le fichier')).toBeChecked();
    expect(screen.queryByLabelText('Référence de la liste de prix')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Valable à partir du')).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('Ces prix ont une période de validité définie'));
    await user.type(screen.getByLabelText('Référence de la liste de prix'), 'Tarifs annuels');
    fireEvent.change(screen.getByLabelText('Valable à partir du'), {
      target: { value: '01/01/2026' },
    });
    fireEvent.blur(screen.getByLabelText('Valable à partir du'));
    fireEvent.change(screen.getByLabelText('Valable jusqu’au (facultatif)'), {
      target: { value: '31/12/2026' },
    });
    fireEvent.blur(screen.getByLabelText('Valable jusqu’au (facultatif)'));
    expect(screen.getByDisplayValue('01/01/2026')).toBeInTheDocument();
    expect(screen.getByDisplayValue('31/12/2026')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Prévisualiser' }));
    expect(mocks.preview).toHaveBeenCalledWith(expect.objectContaining({
      supplierId: 'supplier-1',
      priceList: {
        validityMode: 'DEFINED',
        name: 'Tarifs annuels',
        validFrom: '2026-01-01',
        validTo: '2026-12-31',
        source: null,
        defaultPriceBasis: 'PACKAGE',
      },
    }));
  });

  it('importe les prix sans demander de dates ni de nom par défaut', async () => {
    const user = userEvent.setup();
    mocks.inspect.mockReturnValue(resolved({
      importId: 'import-sans-echeance',
      format: 'CSV',
      headers: ['Reference', 'Designation', 'Prix HT'],
      rowCount: 1,
    }));
    renderDialog();
    await user.upload(screen.getByLabelText('Fichier'),
      new File(['Reference;Designation;Prix HT'], 'prix.csv'));
    await user.click(screen.getByRole('button', { name: 'Analyser le fichier' }));
    await user.click(screen.getByRole('button', { name: 'Sysco' }));
    expect(screen.getByLabelText('Importer les prix présents dans le fichier')).toBeChecked();
    expect(screen.queryByLabelText('Valable à partir du')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Prévisualiser' }));
    expect(mocks.preview).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      importId: 'import-sans-echeance',
      supplierId: 'supplier-1',
      mapping: { supplierReference: 0, designation: 1, priceAmount: 2 },
      priceList: {
        validityMode: 'FROM_IMPORT',
        defaultPriceBasis: 'PACKAGE',
      },
    });
  });

  it('permet d’ignorer les prix d’un fichier sans importer de tarifs', async () => {
    const user = userEvent.setup();
    mocks.inspect.mockReturnValue(resolved({
      importId: 'import-articles-seuls',
      format: 'CSV',
      headers: ['Reference', 'Designation', 'Prix HT'],
      rowCount: 1,
    }));
    renderDialog();
    await user.upload(screen.getByLabelText('Fichier'),
      new File(['Reference;Designation;Prix HT'], 'prix.csv'));
    await user.click(screen.getByRole('button', { name: 'Analyser le fichier' }));
    await user.click(screen.getByRole('button', { name: 'Sysco' }));
    await user.click(screen.getByLabelText('Importer les prix présents dans le fichier'));
    expect(screen.queryByLabelText('Ces prix ont une période de validité définie')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Prévisualiser' }));
    expect(mocks.preview).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      importId: 'import-articles-seuls',
      supplierId: 'supplier-1',
      mapping: { supplierReference: 0, designation: 1 },
    });
  });

  it('interdit la confirmation lorsque la prévisualisation contient une erreur', async () => {
    const user = userEvent.setup();
    mocks.preview.mockReturnValue(resolved({
      counts: { INVALID: 1 },
      rows: [{
        rowNumber: 2, classification: 'INVALID',
        supplierReference: 'REF-1', designation: 'Pain',
        errors: ['Doublon'],
      }],
    }));
    renderDialog();
    await user.upload(screen.getByLabelText('Fichier'), new File(['x'], 'test.csv'));
    await user.click(screen.getByRole('button', { name: 'Analyser le fichier' }));
    await user.click(screen.getByRole('button', { name: 'Sysco' }));
    await user.click(screen.getByRole('button', { name: 'Prévisualiser' }));
    expect(screen.getByRole('button', { name: 'Confirmer l’import' })).toBeDisabled();
  });
});
