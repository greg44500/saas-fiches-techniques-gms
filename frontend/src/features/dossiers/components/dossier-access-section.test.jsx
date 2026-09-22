import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';

const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  grant: vi.fn(),
  grantsQuery: vi.fn(),
  membersQuery: vi.fn(),
  revoke: vi.fn(),
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: () => ({
    can: mocks.can,
  }),
}));

vi.mock('@/features/workspace-members/api/workspace-members-api', () => ({
  useListWorkspaceMembersQuery: mocks.membersQuery,
}));

vi.mock('@/features/dossiers/api/dossiers-api', () => ({
  useGrantDossierAccessMutation: () => [
    mocks.grant,
    { isLoading: false },
  ],
  useListDossierAccessGrantsQuery: mocks.grantsQuery,
  useRevokeDossierAccessMutation: () => [
    mocks.revoke,
    { isLoading: false },
  ],
}));

import { DossierAccessSection } from '@/features/dossiers/components/dossier-access-section';

const member = {
  id: 'membership-2',
  status: 'active',
  user: {
    firstName: 'Alice',
    lastName: 'Métier',
  },
  role: {
    key: 'reader',
    name: 'Lecteur',
  },
};

function queryResult(data) {
  return {
    data,
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  };
}

function renderAccess() {
  return render(
    <ToastProvider>
      <DossierAccessSection
        dossier={{ id: 'dossier-1', status: 'ACTIVE' }}
        workspaceId="workspace-1"
      />
    </ToastProvider>,
  );
}

describe('DossierAccessSection', () => {
  beforeEach(() => {
    mocks.can.mockReset();
    mocks.grant.mockReset();
    mocks.grantsQuery.mockReset();
    mocks.membersQuery.mockReset();
    mocks.revoke.mockReset();

    mocks.can.mockReturnValue(true);
    mocks.grantsQuery.mockReturnValue(queryResult({
      accessGrants: [],
      pagination: {
        page: 1,
        limit: 100,
        total: 0,
        totalPages: 0,
      },
    }));
    mocks.membersQuery.mockReturnValue(queryResult({
      members: [member],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    }));
    mocks.grant.mockImplementation(() => ({
      unwrap: () => Promise.resolve({ id: 'grant-1' }),
    }));
    mocks.revoke.mockImplementation(() => ({
      unwrap: () => Promise.resolve(),
    }));
  });

  it('affiche l’accès implicite Owner sans créer de faux grant', () => {
    renderAccess();

    expect(screen.getByText('Workspace Owner')).toBeInTheDocument();
    expect(
      screen.getByText(/Aucun grant individuel n’est créé/),
    ).toBeInTheDocument();
  });

  it('affecte un membre actif depuis le périmètre Workspace', async () => {
    const user = userEvent.setup();
    renderAccess();

    expect(screen.getByText('Alice Métier')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Affecter' }));

    await waitFor(() => {
      expect(mocks.grant).toHaveBeenCalledWith({
        workspaceId: 'workspace-1',
        dossierId: 'dossier-1',
        membershipId: 'membership-2',
      });
    });
  });

  it('affiche une erreur métier si l’affectation échoue', async () => {
    const user = userEvent.setup();

    mocks.grant.mockImplementation(() => ({
      unwrap: () => Promise.reject({
        data: {
          message: 'Membre non affectable.',
        },
      }),
    }));

    renderAccess();

    await user.click(screen.getByRole('button', { name: 'Affecter' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Membre non affectable.',
    );
  });

  it('masque la gestion si le rôle ne possède pas access:manage', () => {
    mocks.can.mockImplementation(
      (permission) => permission !== 'dossier:access:manage',
    );

    renderAccess();

    expect(
      screen.queryByRole('heading', { name: 'Gérer les affectations' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Affecter' }),
    ).not.toBeInTheDocument();
  });
});
