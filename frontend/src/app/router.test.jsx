import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, Outlet } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const useGetCurrentUserQueryMock = vi.hoisted(() => vi.fn());
const useGetCurrentPlatformContextQueryMock = vi.hoisted(() => vi.fn());
const useGetWorkspaceByIdQueryMock = vi.hoisted(() => vi.fn());
const useListWorkspacesQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/api/auth-api', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useGetCurrentUserQuery: useGetCurrentUserQueryMock,
  };
});

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: useGetCurrentPlatformContextQueryMock,
}));

vi.mock('@/features/workspace/api/workspace-api', () => ({
  useGetWorkspaceByIdQuery: useGetWorkspaceByIdQueryMock,
  useListWorkspacesQuery: useListWorkspacesQueryMock,
}));

vi.mock('@/features/auth/components/user-menu', () => ({
  UserMenu: () => <button type="button">Compte test</button>,
}));

// Le router teste ici le branchement de la route lazy, pas le formulaire Login
// lui-même. La page réelle possède ses propres tests de formulaire/API.
vi.mock('@/features/auth/pages/login-page', () => ({
  LoginPage: () => (
    <>
      <h1>Connexion</h1>
      <button type="button">Se connecter</button>
    </>
  ),
}));

vi.mock('@/features/auth/pages/forgot-password-page', () => ({
  ForgotPasswordPage: () => <h1>Mot de passe oublié</h1>,
}));

vi.mock('@/features/auth/pages/reset-password-page', () => ({
  ResetPasswordPage: () => <h1>Réinitialiser le mot de passe</h1>,
}));

vi.mock('@/features/account/pages/profile-page', () => ({
  ProfilePage: () => <h1>Profil</h1>,
}));

vi.mock('@/features/account/pages/security-page', () => ({
  SecurityPage: () => <h1>Sécurité</h1>,
}));

vi.mock('@/features/workspace/pages/workspace-dashboard-page', () => ({
  WorkspaceDashboardPage: () => (
    <>
      <span>Workspace Démo</span>
      <h1>Tableau de bord</h1>
    </>
  ),
}));

vi.mock('@/features/files/components/workspace-files-route', () => ({
  WorkspaceFilesRoute: () => <h1>Fichiers</h1>,
}));

vi.mock('@/features/subscription/components/workspace-subscription-route', () => ({
  WorkspaceSubscriptionRoute: () => <h1>Abonnement</h1>,
}));

vi.mock('@/features/audit-log/components/workspace-audit-log-route', () => ({
  WorkspaceAuditLogRoute: () => <h1>Historique d’activité</h1>,
}));

vi.mock('@/features/workspace/pages/workspace-settings-page', () => ({
  WorkspaceSettingsPage: () => <h1>Paramètres du workspace</h1>,
}));

vi.mock('@/features/platform/components/platform-guard', () => ({
  PlatformGuard: () => <Outlet />,
}));

// Le test du router vérifie uniquement le branchement des routes. La page
// Overview possède ses propres tests RTK Query et ne doit pas déclencher un
// fetch réseau ici, ce qui mélangerait deux responsabilités de test.
vi.mock('@/features/platform/pages/platform-overview-page', () => ({
  PlatformOverviewPage: () => <h1>Vue d’ensemble</h1>,
}));

vi.mock('@/features/platform/pages/platform-users-page', () => ({
  PlatformUsersPage: () => <h1>Utilisateurs</h1>,
}));

import { createAppRoutes } from '@/app/router';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { ToastProvider } from '@/components/shared/toast-provider';
import { createAppStore } from '@/store/store';

function renderRoute(initialEntry, authStatus = 'unauthenticated') {
  const router = createMemoryRouter(createAppRoutes(), {
    initialEntries: [initialEntry],
  });
  const store = createAppStore({
    auth: {
      accessToken: authStatus === 'authenticated' ? 'test-token' : null,
      authStatus,
    },
  });

  render(
    <Provider store={store}>
      <ThemeProvider storageScope="router-tests">
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </ThemeProvider>
    </Provider>,
  );

  return router;
}

function mockActivePlatformAccess() {
  useGetCurrentPlatformContextQueryMock.mockReturnValue({
    data: {
      status: 'active',
      permissions: [
        'platform:overview:read',
        'platform:users:read',
      ],
    },
    error: undefined,
    isLoading: false,
    isFetching: false,
  });
}

describe('application routing', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    useGetCurrentUserQueryMock.mockReset();
    useGetCurrentPlatformContextQueryMock.mockReset();
    useGetWorkspaceByIdQueryMock.mockReset();
    useListWorkspacesQueryMock.mockReset();
    useGetCurrentUserQueryMock.mockReturnValue({
      data: {
        id: 'user-current',
      },
      error: undefined,
      isLoading: false,
      isFetching: false,
    });
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: null,
      error: undefined,
      isLoading: false,
      isFetching: false,
    });
    useGetWorkspaceByIdQueryMock.mockReturnValue({
      data: {
        workspace: {
          id: 'workspace-123',
          name: 'Workspace Démo',
          status: 'active',
        },
        membership: {
          id: 'membership-123',
          role: { key: 'owner', name: 'Propriétaire' },
        },
        permissions: [
          'workspace:read',
          'workspace:update',
          'member:read',
          'file:read',
          'subscription:read',
          'audit:read',
        ],
        features: [
          'file_upload',
          'team_management',
          'audit_logs',
        ],
        nextEntitlementChangeAt: null,
      },
      error: undefined,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useListWorkspacesQueryMock.mockReturnValue({
      data: [{ id: 'workspace-123', name: 'Workspace Démo' }],
      isLoading: false,
      isFetching: false,
    });
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('rend la route publique racine dans PublicLayout', () => {
    renderRoute('/');

    expect(
      screen.getByRole('heading', {
        name: 'Une base professionnelle pour construire votre application SaaS.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
      'href',
      '/register',
    );
    expect(screen.getAllByRole('link', { name: 'Se connecter' })[0]).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('rend Login pour un visiteur non authentifié', async () => {
    renderRoute('/login');
    expect(
      await screen.findByRole('heading', { name: 'Connexion' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Se connecter' }),
    ).toBeInTheDocument();
  });

  it('laisse les parcours de récupération publics', async () => {
    renderRoute('/forgot-password');
    expect(
      await screen.findByRole('heading', { name: 'Mot de passe oublié' }),
    ).toBeInTheDocument();

    cleanup();

    renderRoute('/reset-password?token=test-token');
    expect(
      await screen.findByRole('heading', { name: 'Réinitialiser le mot de passe' }),
    ).toBeInTheDocument();
  });

  it('redirige une route protégée vers Login en conservant la destination', async () => {
    const router = renderRoute('/workspaces/workspace-123/dashboard');
    expect(
      await screen.findByRole('heading', { name: 'Connexion' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.state.from.pathname).toBe(
      '/workspaces/workspace-123/dashboard',
    );
  });

  it('protège le compte personnel et rend son layout après authentification', async () => {
    const unauthenticatedRouter = renderRoute('/account/profile');
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    expect(unauthenticatedRouter.state.location.state.from.pathname).toBe('/account/profile');

    cleanup();

    renderRoute('/account/profile', 'authenticated');
    expect(await screen.findByRole('heading', { name: 'Profil' })).toBeInTheDocument();
    expect(screen.getByText('Paramètres personnels')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sécurité' })).toBeInTheDocument();
  });

  it('rend le workspace réel pour une session authentifiée', async () => {
    renderRoute('/workspaces/workspace-123/dashboard', 'authenticated');
    expect(await screen.findAllByText('Workspace Démo')).not.toHaveLength(0);
    expect(
      screen.getByRole('heading', { name: 'Tableau de bord' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compte test' })).toBeInTheDocument();
  });

  it('rend la route Files sans exposer Fichiers dans la navigation Workspace', async () => {
    renderRoute('/workspaces/workspace-123/files', 'authenticated');

    expect(
      await screen.findByRole('heading', { name: 'Fichiers' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Fichiers' }),
    ).not.toBeInTheDocument();
  });

  it('rend la route Abonnement dans le shell workspace', async () => {
    renderRoute('/workspaces/workspace-123/subscription', 'authenticated');

    expect(
      await screen.findByRole('heading', { name: 'Abonnement' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abonnement' })).toBeInTheDocument();
  });

  it('rend la route Activité dans le shell workspace', async () => {
    renderRoute('/workspaces/workspace-123/activity', 'authenticated');

    expect(
      await screen.findByRole('heading', { name: 'Historique d’activité' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Activité' })).toBeInTheDocument();
  });

  it('rend la route Paramètres dans le shell workspace', async () => {
    renderRoute('/workspaces/workspace-123/settings', 'authenticated');

    expect(
      await screen.findByRole('heading', { name: 'Paramètres du workspace' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Paramètres' })).toBeInTheDocument();
  });

  it('rend le shell Platform et sa navigation pour une session authentifiée', async () => {
    const user = userEvent.setup();
    mockActivePlatformAccess();
    renderRoute('/platform/overview', 'authenticated');

    expect(
      await screen.findByText('Console d’administration globale'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Navigation de la plateforme' }),
    ).toBeInTheDocument();

    const clientsGroup = screen.getByRole('button', { name: 'Gestion clients' });
    expect(clientsGroup).toHaveAttribute('aria-expanded', 'false');

    await user.click(clientsGroup);

    expect(screen.getByRole('link', { name: 'Utilisateurs' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Vue d’ensemble' })).toBeInTheDocument();
  });

  it('navigue vers une section Platform préparée', async () => {
    const user = userEvent.setup();
    mockActivePlatformAccess();
    const router = renderRoute('/platform/overview', 'authenticated');

    await user.click(
      await screen.findByRole('button', { name: 'Gestion clients' }),
    );
    await user.click(await screen.findByRole('link', { name: 'Utilisateurs' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/platform/users');
    });
    expect(await screen.findByRole('heading', { name: 'Utilisateurs' })).toBeInTheDocument();
  });

  it('affiche NotFound et permet un retour vers l’accueil', async () => {
    const user = userEvent.setup();
    const router = renderRoute('/route-inconnue');
    expect(
      await screen.findByRole('heading', { name: 'Page introuvable' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Retour à l’accueil' }));
    expect(router.state.location.pathname).toBe('/');
  });
});