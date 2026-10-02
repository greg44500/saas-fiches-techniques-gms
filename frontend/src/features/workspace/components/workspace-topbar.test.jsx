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
vi.mock('@/features/workspace/components/workspace-quick-access', () => ({
  WorkspaceQuickAccess: () => (
    <div aria-label="Accès rapide Workspace" role="search">
      Recherche Workspace
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

  it('aligne la hauteur de la topbar sur le header de la sidebar', () => {
    useWorkspaceContextMock.mockReturnValue({ can: () => false });
    useGetWorkspaceSubscriptionQueryMock.mockReturnValue({ data: undefined });

    const { container } = renderTopbar(workspace);

    expect(container.querySelector('header > div')).toHaveClass('h-16');
    expect(container.querySelector('header > div')).not.toHaveClass(
      'min-h-[var(--workspace-topbar-height)]',
    );
  });

  it('regroupe visuellement le workspace et son statut sous la forme nom | badge', () => {
    useWorkspaceContextMock.mockReturnValue({ can: () => false });
    useGetWorkspaceSubscriptionQueryMock.mockReturnValue({ data: undefined });

    const { container } = renderTopbar(workspace);

    const context = container.querySelector('[data-workspace-status-context]');
    const separator = container.querySelector('[data-workspace-status-separator]');
    const workspaceLabel = screen.getByText('Espace de travail : Acme');
    const status = screen.getByText('Actif');

    expect(context).toContainElement(workspaceLabel);
    expect(context).toContainElement(separator);
    expect(context).toContainElement(status);
    expect(separator).toHaveTextContent('|');
    expect(
      workspaceLabel.compareDocumentPosition(separator)
      & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      separator.compareDocumentPosition(status)
      & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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

  it('affiche l’accès rapide aux vues dans la topbar Workspace', () => {
    useWorkspaceContextMock.mockReturnValue({ can: () => true });
    useGetWorkspaceSubscriptionQueryMock.mockReturnValue({ data: undefined });

    const { unmount } = renderTopbar(workspace);

    expect(screen.getByRole('search', { name: 'Accès rapide Workspace' }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Préférences d’affichage' }))
      .toBeInTheDocument();

    unmount();
    renderTopbar(workspace, '/workspaces/workspace-1/members');

    expect(screen.getByRole('search', { name: 'Accès rapide Workspace' }))
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
