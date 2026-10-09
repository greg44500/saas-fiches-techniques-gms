import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  inspect: vi.fn(),
  preview: vi.fn(),
  commit: vi.fn(),
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useInspectSupplierArticleImportMutation: () => [mocks.inspect, { isLoading: false }],
  usePreviewSupplierArticleImportMutation: () => [mocks.preview, { isLoading: false }],
  useCommitSupplierArticleImportMutation: () => [mocks.commit, { isLoading: false }],
  useInspectGlobalSupplierArticleImportMutation: () => [vi.fn(), { isLoading: false }],
  usePreviewGlobalSupplierArticleImportMutation: () => [vi.fn(), { isLoading: false }],
  useCommitGlobalSupplierArticleImportMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock('@/features/suppliers/components/supplier-catalog-import-dialog', () => ({
  autoDetectMapping: () => ({ supplierReference: 0, designation: 1 }),
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
    await user.click(screen.getByRole('button', { name: 'Inspecter le fichier' }));
    expect(mocks.inspect).toHaveBeenCalledWith({ workspaceId: 'workspace-1', file });

    await user.click(screen.getByRole('combobox', { name: 'Fournisseur des Articles' }));
    await user.click(await screen.findByRole('option', { name: 'Sysco' }));
    await user.click(screen.getByRole('button', { name: 'Prévisualiser les Articles' }));
    expect(mocks.preview).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      importId: 'import-1',
      supplierId: 'supplier-1',
      mapping: { supplierReference: 0, designation: 1 },
    });
    expect(screen.getByText(/ligne\(s\) sans référence ignorée\(s\)/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirmer l’import des Articles' }));
    expect(mocks.commit).toHaveBeenCalledWith({
      workspaceId: 'workspace-1', importId: 'import-1',
    });
    expect(committed).toHaveBeenCalledWith({ created: 1, updated: 0 });
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
    await user.click(screen.getByRole('button', { name: 'Inspecter le fichier' }));
    await user.click(screen.getByRole('combobox', { name: 'Fournisseur des Articles' }));
    await user.click(await screen.findByRole('option', { name: 'Sysco' }));
    await user.click(screen.getByRole('button', { name: 'Prévisualiser les Articles' }));
    expect(screen.getByRole('button', { name: 'Confirmer l’import des Articles' })).toBeDisabled();
  });
});
