import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  createMutation: vi.fn(),
  metadataQuery: vi.fn(),
  listQuery: vi.fn(),
  updateMutation: vi.fn(),
  workspaceContext: vi.fn(),
}));

vi.mock('@/features/dossiers/api/dossiers-api', () => ({
  useCreateDossierMutation: () => [mocks.createMutation, { isLoading: false }],
  useGetDossierMetadataQuery: mocks.metadataQuery,
  useListDossiersQuery: mocks.listQuery,
  useUpdateDossierMutation: () => [mocks.updateMutation, { isLoading: false }],
}));

vi.mock('@/features/dossiers/components/dossier-details-drawer', () => ({
  DossierDetailsDrawer: ({ open }) => (open ? <div>Drawer ouvert</div> : null),
}));

vi.mock('@/features/dossiers/components/dossier-form-dialog', () => ({
  DossierFormDialog: ({ mode, open }) => (
    open ? <div>Formulaire {mode}</div> : null
  ),
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: mocks.workspaceContext,
}));

import { DOSSIER_PERMISSION } from '@/features/dossiers/constants/dossier-permissions';
import {
  DEFAULT_STATUS_FILTER,
  DossiersPage,
  getStatusFilterOptions,
} from '@/features/dossiers/pages/dossiers-page';

const metadata = {
  dossierStatuses: [
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'PAUSED', label: 'En pause' },
    { value: 'ARCHIVED', label: 'Archivé' },
    { value: 'DELETED', label: 'Supprimé' },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <ToastProvider>
          <DossiersPage />
        </ToastProvider>
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe('DossiersPage', () => {
  beforeEach(() => {
    mocks.listQuery.mockReset();
    mocks.metadataQuery.mockReset();
    mocks.workspaceContext.mockReset();
    mocks.createMutation.mockReset();
    mocks.updateMutation.mockReset();

    mocks.workspaceContext.mockReturnValue({
      workspace: { id: 'workspace-1', name: 'Acme' },
      can: () => true,
    });
    mocks.metadataQuery.mockReturnValue({
      data: metadata,
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.listQuery.mockReturnValue({
      data: {
        dossiers: [
          {
            id: 'dossier-1',
            name: 'Nantes Centre',
            brand: 'Leclerc',
            location: {
              address: null,
              postalCode: '44000',
              city: 'Nantes',
            },
            status: 'ACTIVE',
          },
          {
            id: 'dossier-2',
            name: 'Saint-Nazaire',
            brand: null,
            location: null,
            status: 'PAUSED',
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it('affiche la liste métier et ouvre le drawer depuis Voir', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText('Nantes Centre')).toBeInTheDocument();
    expect(screen.getByText('Leclerc')).toBeInTheDocument();
    expect(screen.getByText('44000 Nantes')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
    expect(screen.getByText('En pause')).toBeInTheDocument();
    expect(screen.queryByText('Magasins rattachés à Acme.')).not.toBeInTheDocument();

    const dossierRow = screen.getByText('Nantes Centre').closest('tr');
    expect(dossierRow).toHaveClass('hover:bg-muted/50');

    const openLink = screen.getByRole('link', { name: 'Ouvrir' });
    const viewButton = screen.getByRole('button', { name: 'Voir Nantes Centre' });

    expect(screen.getAllByRole('link', { name: 'Ouvrir' })).toHaveLength(1);
    expect(openLink).toHaveClass('h-10');
    expect(viewButton).toHaveClass('size-10');

    await user.click(viewButton);

    expect(screen.getByText('Drawer ouvert')).toBeInTheDocument();
  });

  it('applique une recherche côté serveur au submit', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(
      screen.getByRole('textbox', { name: 'Rechercher un dossier' }),
      'Nantes',
    );
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(mocks.listQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        search: 'Nantes',
      }),
    );
  });

  it('ouvre le formulaire de création uniquement avec la permission correspondante', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Créer un dossier' }));

    expect(screen.getByText('Formulaire create')).toBeInTheDocument();

    mocks.workspaceContext.mockReturnValue({
      workspace: { id: 'workspace-1', name: 'Acme' },
      can: (permission) => permission !== DOSSIER_PERMISSION.CREATE,
    });

    const secondRender = renderPage();

    expect(screen.queryAllByRole('button', { name: 'Créer un dossier' })).toHaveLength(1);
    secondRender.unmount();
  });

  it('retire le filtre DELETED sans autorité lifecycle', () => {
    const options = getStatusFilterOptions(metadata, false);

    expect(options[0].value).toBe(DEFAULT_STATUS_FILTER);
    expect(options.map((option) => option.value)).not.toContain('DELETED');
    expect(getStatusFilterOptions(metadata, true).map((option) => option.value))
      .toContain('DELETED');
  });
});
