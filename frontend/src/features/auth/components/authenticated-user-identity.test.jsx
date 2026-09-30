import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useGetCurrentUserQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/api/auth-api', () => ({
  useGetCurrentUserQuery: useGetCurrentUserQueryMock,
}));
vi.mock('@/features/auth/components/user-menu', () => ({
  UserMenu: ({ contextItems }) => (
    <button type="button">
      Avatar utilisateur {contextItems?.map((item) => item.value).join(' ')}
    </button>
  ),
}));
vi.mock('@/features/auth/components/logout-shortcut', () => ({
  LogoutShortcut: () => <button type="button">Déconnexion</button>,
}));

import {
  AuthenticatedUserIdentity,
  getUserDisplayName,
} from '@/features/auth/components/authenticated-user-identity';

describe('AuthenticatedUserIdentity', () => {
  it('affiche une identité cohérente avec un sous-titre contextuel', () => {
    useGetCurrentUserQueryMock.mockReturnValue({
      data: {
        firstName: 'Laetitia',
        lastName: 'BALLAT',
        email: 'laetitia@test.com',
      },
    });

    render(<AuthenticatedUserIdentity secondaryText="Plan Free" />);

    expect(screen.getByText('Laetitia BALLAT')).toBeInTheDocument();
    expect(screen.getByText('Plan Free')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Avatar utilisateur' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Déconnexion' })).toBeInTheDocument();
  });

  it('transmet les détails contextuels au menu sans connaître leur domaine', () => {
    useGetCurrentUserQueryMock.mockReturnValue({
      data: {
        firstName: 'Laetitia',
        lastName: 'BALLAT',
        email: 'laetitia@test.com',
      },
    });

    render(
      <AuthenticatedUserIdentity
        menuContextItems={[
          { label: 'Contexte', value: 'Administrateur' },
        ]}
      />,
    );

    expect(screen.getByRole('button', {
      name: 'Avatar utilisateur Administrateur',
    })).toBeInTheDocument();
  });

  it('place les actions contextuelles juste avant la déconnexion', () => {
    useGetCurrentUserQueryMock.mockReturnValue({
      data: {
        firstName: 'Laetitia',
        lastName: 'BALLAT',
        email: 'laetitia@test.com',
      },
    });

    render(
      <AuthenticatedUserIdentity
        actions={<button type="button">Préférences d’affichage</button>}
      />,
    );

    const preferences = screen.getByRole('button', { name: 'Préférences d’affichage' });
    const logout = screen.getByRole('button', { name: 'Déconnexion' });

    expect(preferences.compareDocumentPosition(logout) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });

  it('utilise l’email comme sous-titre par défaut hors contexte workspace', () => {
    useGetCurrentUserQueryMock.mockReturnValue({
      data: {
        firstName: 'Laetitia',
        lastName: 'BALLAT',
        email: 'laetitia@test.com',
      },
    });

    render(<AuthenticatedUserIdentity />);

    expect(screen.getByText('laetitia@test.com')).toBeInTheDocument();
  });

  it('retombe sur l’email lorsqu’aucun nom n’est disponible', () => {
    expect(getUserDisplayName({ email: 'user@example.com' }))
      .toBe('user@example.com');
  });
});
