import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createWorkspace: vi.fn(),
  createGlobal: vi.fn(),
  listWorkspace: vi.fn(),
  listGlobal: vi.fn(),
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useCreateSupplierMutation: () => [mocks.createWorkspace, { isLoading: false }],
  useCreateGlobalSupplierMutation: () => [mocks.createGlobal, { isLoading: false }],
  useListSuppliersQuery: (args, options) => mocks.listWorkspace(args, options),
  useListGlobalSuppliersQuery: (args, options) => mocks.listGlobal(args, options),
}));

import { SupplierImportSelector } from './supplier-import-selector';

describe('SupplierImportSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listWorkspace.mockReturnValue({
      data: { suppliers: [{ id: 'existing', name: 'Fournisseur existant' }] },
      isFetching: false,
    });
    mocks.listGlobal.mockReturnValue({ data: { suppliers: [] }, isFetching: false });
  });

  it('permet de rechercher et sélectionner un Fournisseur existant', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SupplierImportSelector onChange={onChange} suppliers={[]}
      value="__NONE__" workspaceId="workspace-1" />);
    await user.type(screen.getByRole('textbox', { name: 'Rechercher un Fournisseur' }), 'existant');
    await user.click(screen.getByRole('button', { name: 'Fournisseur existant' }));
    expect(onChange).toHaveBeenCalledWith('existing');
    expect(mocks.listWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'existant', limit: 100, status: 'ACTIVE' }),
      expect.any(Object),
    );
  });

  it('masque la création rapide sans permission', () => {
    render(<SupplierImportSelector onChange={vi.fn()} suppliers={[]}
      value="__NONE__" workspaceId="workspace-1" />);
    expect(screen.queryByRole('button', { name: 'Créer un nouveau Fournisseur' }))
      .not.toBeInTheDocument();
  });

  it('crée et présélectionne un Fournisseur privé à partir de son nom', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mocks.createWorkspace.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ id: 'new-supplier', name: 'NOUVEAU FOURNISSEUR' }),
    });
    render(<SupplierImportSelector canCreate onChange={onChange} suppliers={[]}
      value="__NONE__" workspaceId="workspace-1" />);
    await user.click(screen.getByRole('button', { name: 'Créer un nouveau Fournisseur' }));
    await user.type(screen.getByRole('textbox', { name: 'Nom du Fournisseur' }), 'Nouveau fournisseur');
    expect(screen.getByRole('textbox', { name: 'Nom du Fournisseur' }))
      .toHaveValue('NOUVEAU FOURNISSEUR');
    await user.click(screen.getByRole('button', { name: 'Créer et sélectionner' }));
    expect(mocks.createWorkspace).toHaveBeenCalledWith({
      workspaceId: 'workspace-1', name: 'NOUVEAU FOURNISSEUR',
    });
    expect(onChange).toHaveBeenCalledWith('new-supplier');
  });
});
