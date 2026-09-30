import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

const useWorkspaceContextMock = vi.hoisted(() => vi.fn());
const useGetWorkspaceSubscriptionQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: useWorkspaceContextMock,
}));
vi.mock('@/features/subscription/api/subscription-api', () => ({
  useGetWorkspaceSubscriptionQuery: useGetWorkspaceSubscriptionQueryMock,
}));
vi.mock('@/features/workspace/components/workspace-switcher', () => ({
  WorkspaceSwitcher: ({ currentWorkspace }) => (
    <span>Espace de travail : {currentWorkspace.name}</span>
  ),
}));
vi.mock('@/features/workspace/components/workspace-user-identity', () => ({
  WorkspaceUserIdentity: ({ actions, planName }) => (
    <div>
      <span>{planName ? `Plan ${planName}` : 'Identité utilisateur'}</span>
      {actions}
    </div>
  ),
}));
vi.mock('@/features/workspace/components/workspace-dashboard-display-preferences', () => ({
  WorkspaceDashboardDisplayPreferences: ({ triggerVariant }) => (
    <button
      aria-label={triggerVariant === 'icon' ? 'Préférences d’affichage' : undefined}
      type="button"
    >
      {triggerVariant === 'icon'
        ? 'Préférences'
        : 'Personnaliser le tableau de bord'}
    </button>
  ),
}));

import { WorkspaceTopbar } from '@/features/workspace/components/workspace-topbar';

function renderTopbar(workspace, path = '/workspaces/workspace-1/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <WorkspaceTopbar workspace={workspace} />
    </MemoryRouter>,
  );
}

describe('WorkspaceTopbar', () => {
  const workspace = {
    id: 'workspace-1',
    name: 'Acme',
    status: 'active',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('utilise le token de hauteur Workspace exposé aux contenus sticky', () => {
    useWorkspaceContextMock.mockReturnValue({ can: () => false });
    useGetWorkspaceSubscriptionQueryMock.mockReturnValue({ data: undefined });

    const { container } = renderTopbar(workspace);

    expect(container.querySelector('header > div')).toHaveClass(
      'min-h-[var(--workspace-topbar-height)]',
    );
  });

  it('affiche le statut courant à côté du sélecteur de workspace', () => {
    useWorkspaceContextMock.mockReturnValue({ can: () => false });
    useGetWorkspaceSubscriptionQueryMock.mockReturnValue({ data: undefined });

    renderTopbar(workspace);

    expect(screen.getByText('Espace de travail : Acme')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
  });

  it('affiche le plan effectif uniquement avec subscription:read', () => {
    useWorkspaceContextMock.mockReturnValue({ can: () => true });
    useGetWorkspaceSubscriptionQueryMock.mockReturnValue({
      data: {
        effectiveEntitlement: {
          plan: { name: 'Free' },
        },
      },
    });

    renderTopbar(workspace);

    expect(useGetWorkspaceSubscriptionQueryMock).toHaveBeenCalledWith(
      'workspace-1',
      { skip: false },
    );
    expect(screen.getByText('Plan Free')).toBeInTheDocument();
  });

  it('ne duplique pas les recherches métier dans la topbar Workspace', () => {
    useWorkspaceContextMock.mockReturnValue({ can: () => true });
    useGetWorkspaceSubscriptionQueryMock.mockReturnValue({ data: undefined });

    const { unmount } = renderTopbar(workspace);

    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Préférences d’affichage' }))
      .toBeInTheDocument();

    unmount();
    renderTopbar(workspace, '/workspaces/workspace-1/members');

    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Préférences d’affichage' }))
      .toBeInTheDocument();
  });

  it('skip la lecture commerciale lorsque la permission manque', () => {
    useWorkspaceContextMock.mockReturnValue({ can: () => false });
    useGetWorkspaceSubscriptionQueryMock.mockReturnValue({ data: undefined });

    renderTopbar(workspace);

    expect(useGetWorkspaceSubscriptionQueryMock).toHaveBeenCalledWith(
      'workspace-1',
      { skip: true },
    );
    expect(screen.queryByText(/Plan /)).not.toBeInTheDocument();
  });
});
