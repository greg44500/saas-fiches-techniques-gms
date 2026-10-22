import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createWorkspace: vi.fn(),
  updateWorkspace: vi.fn(),
  createGlobal: vi.fn(),
  updateGlobal: vi.fn(),
  workspaceMetadata: vi.fn(),
  globalMetadata: vi.fn(),
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useCreateSupplierMutation: () => [
    mocks.createWorkspace,
    { isLoading: false },
  ],
  useUpdateSupplierMutation: () => [
    mocks.updateWorkspace,
    { isLoading: false },
  ],
  useCreateGlobalSupplierMutation: () => [
    mocks.createGlobal,
    { isLoading: false },
  ],
  useUpdateGlobalSupplierMutation: () => [
    mocks.updateGlobal,
    { isLoading: false },
  ],
  useGetSupplierMetadataQuery: mocks.workspaceMetadata,
  useGetGlobalSupplierMetadataQuery: mocks.globalMetadata,
}));

import {
  SupplierFormDialog,
} from '@/features/suppliers/components/supplier-form-dialog';

describe('SupplierFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.workspaceMetadata.mockReturnValue({
      data: {
        categories: [
          { id: 'cat-fruits', name: 'Fruits et légumes' },
          { id: 'cat-laitiers', name: 'Produits laitiers' },
        ],
      },
    });
    mocks.globalMetadata.mockReturnValue({ data: { categories: [] } });
    mocks.createWorkspace.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        id: 'supplier-1',
        name: 'GROSSISTE TEST',
      }),
    });
  });

  it('enregistre plusieurs catégories Produit sur un Fournisseur Workspace', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();

    render(
      <SupplierFormDialog
        onClose={vi.fn()}
        onSaved={onSaved}
        open
        workspaceId="workspace-1"
      />,
    );

    await user.type(screen.getByLabelText('Nom'), 'Grossiste test');
    expect(screen.getByLabelText('Nom')).toHaveValue('GROSSISTE TEST');
    await user.click(screen.getByLabelText('Fruits et légumes'));
    await user.click(screen.getByLabelText('Produits laitiers'));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(mocks.createWorkspace).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      name: 'GROSSISTE TEST',
      supplierCode: null,
      legalName: null,
      website: null,
      categoryIds: ['cat-fruits', 'cat-laitiers'],
    });
    expect(onSaved).toHaveBeenCalledWith({
      id: 'supplier-1',
      name: 'GROSSISTE TEST',
    });
  });

  it('désactive Enregistrer jusqu’à la saisie d’un nom non vide', async () => {
    const user = userEvent.setup();
    render(
      <SupplierFormDialog
        onClose={vi.fn()}
        onSaved={vi.fn()}
        open
        workspaceId="workspace-1"
      />,
    );

    const save = screen.getByRole('button', { name: 'Enregistrer' });
    const name = screen.getByLabelText('Nom');
    expect(save).toBeDisabled();
    await user.type(name, '   ');
    expect(save).toBeDisabled();
    await user.type(name, 'SOCIÉTÉ TEST');
    expect(save).toBeEnabled();
    await user.clear(name);
    expect(save).toBeDisabled();
  });

  it('présente la portée Workspace dans une infobulle, pas sous le titre', () => {
    render(
      <TooltipProvider>
        <SupplierFormDialog
          onClose={vi.fn()}
          onSaved={vi.fn()}
          open
          workspaceId="workspace-1"
        />
      </TooltipProvider>,
    );

    expect(screen.getByRole('button', {
      name: 'À propos de la portée du Fournisseur',
    })).toBeInTheDocument();
    expect(screen.getByText(
      'Ce Fournisseur restera propre à cet espace de travail.',
    )).toHaveClass('sr-only');
  });

  it('préselectionne les catégories déjà affectées lors de la modification', () => {
    render(
      <SupplierFormDialog
        onClose={vi.fn()}
        onSaved={vi.fn()}
        open
        supplier={{
          id: 'supplier-1',
          name: 'Grossiste existant',
          categories: [{
            id: 'cat-fruits',
            name: 'Fruits et légumes',
          }],
        }}
        workspaceId="workspace-1"
      />,
    );

    expect(screen.getByLabelText('Fruits et légumes')).toBeChecked();
    expect(screen.getByLabelText('Produits laitiers')).not.toBeChecked();
  });
});
