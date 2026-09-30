import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useWorkspaceContextMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: useWorkspaceContextMock,
}));

vi.mock('@/features/auth/components/authenticated-user-identity', () => ({
  AuthenticatedUserIdentity: ({
    actions,
    menuContextItems,
    secondaryText,
  }) => (
    <div>
      <span>Identité utilisateur</span>
      <span>{secondaryText}</span>
      <span>{menuContextItems.map((item) => `${item.label}: ${item.value}`).join(' | ')}</span>
      {actions}
    </div>
  ),
  getUserDisplayName: (user) => user?.email ?? 'Compte utilisateur',
}));

import {
  WorkspaceUserIdentity,
  getUserDisplayName,
  getWorkspaceIdentitySecondaryText,
  getWorkspaceMenuContextItems,
} from '@/features/workspace/components/workspace-user-identity';

describe('WorkspaceUserIdentity', () => {
  it('affiche le rôle puis le plan comme contexte compact', () => {
    useWorkspaceContextMock.mockReturnValue({
      membership: { role: { name: 'Administrateur' } },
    });

    render(<WorkspaceUserIdentity planName="Premium" />);

    expect(screen.getByText('Administrateur · Plan Premium')).toBeInTheDocument();
    expect(screen.getByText(/Rôle dans cet espace: Administrateur/)).toBeInTheDocument();
    expect(screen.getByText(/Plan: Premium/)).toBeInTheDocument();
  });

  it('transmet les actions contextuelles avant la déconnexion partagée', () => {
    useWorkspaceContextMock.mockReturnValue({
      membership: { role: { name: 'Membre' } },
    });

    render(
      <WorkspaceUserIdentity
        actions={<button type="button">Préférences d’affichage</button>}
        planName="Free"
      />,
    );

    expect(screen.getByRole('button', { name: 'Préférences d’affichage' }))
      .toBeInTheDocument();
  });

  it('gère indépendamment un rôle ou un plan absent', () => {
    expect(getWorkspaceIdentitySecondaryText({
      roleName: 'Membre',
      planName: null,
    })).toBe('Membre');

    expect(getWorkspaceIdentitySecondaryText({
      roleName: null,
      planName: 'Free',
    })).toBe('Plan Free');

    expect(getWorkspaceMenuContextItems({
      roleName: null,
      planName: null,
    })).toEqual([]);
  });

  it('réexporte le fallback de nom partagé', () => {
    expect(getUserDisplayName({ email: 'user@example.com' }))
      .toBe('user@example.com');
  });
});
