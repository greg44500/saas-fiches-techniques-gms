import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';

import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WorkspaceSidebar } from '@/features/workspace/components/workspace-sidebar';
import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';
import { coreWorkspaceNavigation } from '@/features/workspace/navigation/core-workspace-navigation';

const workspace = {
  id: 'workspace-1',
  name: 'Acme',
  status: 'active',
};

const membership = {
  id: 'membership-1',
  role: {
    key: 'member',
    name: 'Membre',
  },
};

function renderSidebar(
  permissions,
  {
    collapsed = false,
    features = [],
    initialEntry = '/workspaces/workspace-1/dashboard',
    navigation = coreWorkspaceNavigation,
  } = {},
) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <TooltipProvider delay={0}>
        <WorkspaceProvider
          features={features}
          membership={membership}
          permissions={permissions}
          workspace={workspace}
        >
          <SidebarProvider defaultOpen={!collapsed}>
            <WorkspaceSidebar
              navigation={navigation}
              workspace={workspace}
            />
          </SidebarProvider>
        </WorkspaceProvider>
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe('WorkspaceSidebar', () => {
  afterEach(() => cleanup());

  it('expose un landmark de navigation et retire les groupes sans entrée autorisée', () => {
    renderSidebar([WORKSPACE_PERMISSION.WORKSPACE_READ]);

    expect(
      screen.getByRole('navigation', { name: 'Navigation du workspace' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tableau de bord' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ressources' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gestion du workspace' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Compte & offre' })).not.toBeInTheDocument();
  });

  it('combine permission et feature avant de rendre la gestion d’équipe', () => {
    renderSidebar([
      WORKSPACE_PERMISSION.WORKSPACE_READ,
      WORKSPACE_PERMISSION.MEMBER_READ,
      WORKSPACE_PERMISSION.ROLE_READ,
    ]);

    expect(screen.queryByRole('button', { name: 'Gestion du workspace' })).not.toBeInTheDocument();
  });

  it('n’ouvre qu’un groupe à la fois et permet de le refermer', async () => {
    const user = userEvent.setup();

    renderSidebar(
      [
        WORKSPACE_PERMISSION.WORKSPACE_READ,
        WORKSPACE_PERMISSION.MEMBER_READ,
        WORKSPACE_PERMISSION.SUBSCRIPTION_READ,
      ],
      { features: [WORKSPACE_FEATURE.TEAM_MANAGEMENT] },
    );

    const workspaceGroup = screen.getByRole('button', { name: 'Gestion du workspace' });
    const accountGroup = screen.getByRole('button', { name: 'Compte & offre' });

    await user.click(workspaceGroup);
    expect(workspaceGroup).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Membres' })).toBeInTheDocument();

    await user.click(accountGroup);
    expect(workspaceGroup).toHaveAttribute('aria-expanded', 'false');
    expect(accountGroup).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Abonnement' })).toBeInTheDocument();

    await user.click(accountGroup);
    expect(accountGroup).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Abonnement' })).not.toBeInTheDocument();
  });

  it('ouvre automatiquement le groupe contenant la route courante', () => {
    renderSidebar(
      [
        WORKSPACE_PERMISSION.WORKSPACE_READ,
        WORKSPACE_PERMISSION.AUDIT_READ,
      ],
      {
        features: [WORKSPACE_FEATURE.AUDIT_LOGS],
        initialEntry: '/workspaces/workspace-1/activity',
      },
    );

    expect(screen.getByRole('button', { name: 'Compte & offre' }))
      .toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Activité' })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/activity',
    );
  });

  it('rend Fichiers avec file:read sans exiger la feature d’upload', async () => {
    const user = userEvent.setup();

    renderSidebar([
      WORKSPACE_PERMISSION.WORKSPACE_READ,
      WORKSPACE_PERMISSION.FILE_READ,
    ]);

    await user.click(screen.getByRole('button', { name: 'Ressources' }));
    expect(screen.getByRole('link', { name: 'Fichiers' })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/files',
    );
  });

  it('masque entièrement Activité quand la feature audit_logs est absente', () => {
    renderSidebar([
      WORKSPACE_PERMISSION.WORKSPACE_READ,
      WORKSPACE_PERMISSION.AUDIT_READ,
    ]);

    expect(screen.queryByRole('button', { name: 'Compte & offre' })).not.toBeInTheDocument();
  });

  it('rend Paramètres avec workspace:update', async () => {
    const user = userEvent.setup();

    renderSidebar([
      WORKSPACE_PERMISSION.WORKSPACE_READ,
      WORKSPACE_PERMISSION.WORKSPACE_UPDATE,
    ]);

    await user.click(screen.getByRole('button', { name: 'Gestion du workspace' }));
    expect(screen.getByRole('link', { name: 'Paramètres' })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/settings',
    );
  });

  it('conserve les tooltips shadcn/Base UI pour les entrées directes en mode icône', async () => {
    const user = userEvent.setup();

    renderSidebar(
      [WORKSPACE_PERMISSION.WORKSPACE_READ],
      { collapsed: true },
    );

    const dashboardLink = screen.getByRole('link', { name: 'Tableau de bord' });
    await user.hover(dashboardLink);

    expect((await screen.findAllByText('Tableau de bord')).length).toBeGreaterThan(1);
  });

  it('ouvre les enfants d’un groupe dans un popover en mode icône et restitue le focus avec Escape', async () => {
    const user = userEvent.setup();

    renderSidebar(
      [
        WORKSPACE_PERMISSION.WORKSPACE_READ,
        WORKSPACE_PERMISSION.MEMBER_READ,
      ],
      {
        collapsed: true,
        features: [WORKSPACE_FEATURE.TEAM_MANAGEMENT],
      },
    );

    const workspaceGroup = screen.getByRole('button', { name: 'Gestion du workspace' });
    await user.click(workspaceGroup);

    expect(await screen.findByRole('link', { name: 'Membres' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('link', { name: 'Membres' })).not.toBeInTheDocument();
    expect(workspaceGroup).toHaveFocus();
  });

  it('supporte plusieurs groupes métier sans modifier le renderer Core', async () => {
    const user = userEvent.setup();
    const moduleNavigation = [
      ...coreWorkspaceNavigation,
      {
        id: 'module-a',
        type: 'group',
        label: 'Module métier A',
        items: [
          { id: 'module-a-dashboard', label: 'Vue module A', path: 'module-a' },
          { id: 'module-a-items', label: 'Éléments module A', path: 'module-a/items' },
        ],
      },
      {
        id: 'module-b',
        type: 'group',
        label: 'Module métier B',
        items: [
          { id: 'module-b-dashboard', label: 'Vue module B', path: 'module-b' },
        ],
      },
    ];

    renderSidebar(
      [WORKSPACE_PERMISSION.WORKSPACE_READ],
      { navigation: moduleNavigation },
    );

    await user.click(screen.getByRole('button', { name: 'Module métier A' }));
    expect(screen.getByRole('link', { name: 'Vue module A' })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/module-a',
    );

    await user.click(screen.getByRole('button', { name: 'Module métier B' }));
    expect(screen.queryByRole('link', { name: 'Vue module A' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Vue module B' })).toBeInTheDocument();
  });
});
