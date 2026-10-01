import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';

import { composeWorkspaceNavigation } from '@/app/workspace-navigation';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { compactNavigationSeparators } from '@/components/shared/navigation-separators';
import {
  WorkspaceSidebar,
} from '@/features/workspace/components/workspace-sidebar';
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

  it('rend une navigation Core plate et retire les entrées non autorisées', () => {
    renderSidebar([WORKSPACE_PERMISSION.WORKSPACE_READ]);

    expect(
      screen.getByRole('navigation', { name: 'Navigation du workspace' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tableau de bord' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Fichiers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Membres' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gestion du workspace' }))
      .not.toBeInTheDocument();
  });

  it('combine permission et feature avant de rendre les entrées de gestion d’équipe', () => {
    renderSidebar([
      WORKSPACE_PERMISSION.WORKSPACE_READ,
      WORKSPACE_PERMISSION.MEMBER_READ,
      WORKSPACE_PERMISSION.ROLE_READ,
    ]);

    expect(screen.queryByRole('link', { name: 'Membres' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Rôles et permissions' }))
      .not.toBeInTheDocument();
  });

  it('rend directement les entrées Core autorisées sans groupe intermédiaire', () => {
    renderSidebar(
      [
        WORKSPACE_PERMISSION.WORKSPACE_READ,
        WORKSPACE_PERMISSION.FILE_READ,
        WORKSPACE_PERMISSION.MEMBER_READ,
        WORKSPACE_PERMISSION.SUBSCRIPTION_READ,
      ],
      { features: [WORKSPACE_FEATURE.TEAM_MANAGEMENT] },
    );

    expect(screen.getByRole('link', { name: 'Fichiers' })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/files',
    );
    expect(screen.getByRole('link', { name: 'Membres' })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/members',
    );
    expect(screen.getByRole('link', { name: 'Abonnement' })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/subscription',
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

  it('ouvre les groupes applicatifs avec une transition et un seul groupe à la fois', async () => {
    const user = userEvent.setup();
    const navigation = [
      {
        id: 'module-a',
        type: 'group',
        label: 'Module métier A',
        items: [
          { id: 'module-a-dashboard', label: 'Vue module A', path: 'module-a' },
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
      { navigation },
    );

    const moduleA = screen.getByRole('button', { name: 'Module métier A' });
    const moduleB = screen.getByRole('button', { name: 'Module métier B' });

    await user.click(moduleA);
    const moduleALink = screen.getByRole('link', { name: 'Vue module A' });
    const animatedPanel = moduleALink.closest('[data-slot="collapsible-content"]');

    expect(moduleA).toHaveAttribute('aria-expanded', 'true');
    expect(animatedPanel).toHaveClass('transition-[height,opacity]');
    expect(animatedPanel).toHaveClass('data-[starting-style]:h-0');

    await user.click(moduleB);

    expect(moduleA).toHaveAttribute('aria-expanded', 'false');
    expect(moduleB).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Vue module A' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Vue module B' })).toBeInTheDocument();
  });

  it('ouvre automatiquement le groupe applicatif contenant la route courante', () => {
    renderSidebar(
      [WORKSPACE_PERMISSION.WORKSPACE_READ],
      {
        initialEntry: '/workspaces/workspace-1/module-a/items',
        navigation: [
          {
            id: 'module-a',
            type: 'group',
            label: 'Module métier A',
            items: [
              {
                id: 'module-a-items',
                label: 'Éléments module A',
                path: 'module-a/items',
              },
            ],
          },
        ],
      },
    );

    expect(screen.getByRole('button', { name: 'Module métier A' }))
      .toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Éléments module A' }))
      .toBeInTheDocument();
  });

  it('ouvre les enfants d’un groupe dans un popover en mode icône et restitue le focus avec Escape', async () => {
    const user = userEvent.setup();

    renderSidebar(
      [WORKSPACE_PERMISSION.WORKSPACE_READ],
      {
        collapsed: true,
        navigation: [
          {
            id: 'module-a',
            type: 'group',
            label: 'Module métier A',
            items: [
              { id: 'module-a-dashboard', label: 'Vue module A', path: 'module-a' },
            ],
          },
        ],
      },
    );

    const group = screen.getByRole('button', { name: 'Module métier A' });
    await user.click(group);

    expect(await screen.findByRole('link', { name: 'Vue module A' }))
      .toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('link', { name: 'Vue module A' })).not.toBeInTheDocument();
    expect(group).toHaveFocus();
  });

  it('garde le Dashboard avec les modules applicatifs avant le séparateur d’administration', () => {
    const navigation = composeWorkspaceNavigation([
      {
        groups: [
          {
            id: 'catalog',
            type: 'item',
            label: 'Catalogue',
            path: 'catalog',
          },
        ],
      },
    ]);

    renderSidebar(
      [
        WORKSPACE_PERMISSION.WORKSPACE_READ,
        WORKSPACE_PERMISSION.FILE_READ,
      ],
      { navigation },
    );

    const dashboard = screen.getByRole('link', { name: 'Tableau de bord' });
    const catalog = screen.getByRole('link', { name: 'Catalogue' });
    const separator = screen.getByRole('separator', {
      name: 'Administration de l’espace',
    });
    const files = screen.getByRole('link', { name: 'Fichiers' });

    expect(separator).toHaveAttribute(
      'data-navigation-id',
      'workspace-administration-separator',
    );
    expect(
      dashboard.compareDocumentPosition(catalog)
      & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      catalog.compareDocumentPosition(separator)
      & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      separator.compareDocumentPosition(files)
      & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('retire les séparateurs en tête, en fin et les doublons consécutifs', () => {
    expect(compactNavigationSeparators([
      { id: 'leading', type: 'separator' },
      { id: 'dashboard', type: 'item' },
      { id: 'separator-a', type: 'separator' },
      { id: 'separator-b', type: 'separator' },
      { id: 'files', type: 'item' },
      { id: 'trailing', type: 'separator' },
    ]).map((entry) => entry.id)).toEqual([
      'dashboard',
      'separator-a',
      'files',
    ]);
  });
  it('rend une section visuelle partagée sans la transformer en groupe repliable', async () => {
    const user = userEvent.setup();
    const navigation = [
      {
        id: 'application-management',
        type: 'section',
        label: 'Gestion applicative',
        items: [
          {
            id: 'application-reference',
            label: 'Référentiel',
            path: 'reference',
          },
        ],
      },
    ];

    renderSidebar(
      [WORKSPACE_PERMISSION.WORKSPACE_READ],
      { navigation },
    );

    expect(screen.getByText('Gestion applicative')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gestion applicative' }))
      .not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Référentiel' }))
      .toHaveAttribute(
        'href',
        '/workspaces/workspace-1/reference',
      );

    const trigger = screen.getByRole('button', {
      name: 'Réduire la navigation',
    });
    await user.click(trigger);

    expect(screen.queryByText('Gestion applicative')).not.toBeInTheDocument();
    const referenceLink = screen.getByRole('link', { name: 'Référentiel' });
    await user.hover(referenceLink);
    expect((await screen.findAllByText('Référentiel')).length)
      .toBeGreaterThan(1);
  });

  it('ne rend pas de séparateur de tête pour une section seule', () => {
    renderSidebar(
      [WORKSPACE_PERMISSION.WORKSPACE_READ],
      {
        navigation: [
          {
            id: 'application-management',
            type: 'section',
            label: 'Gestion applicative',
            items: [
              {
                id: 'application-reference',
                label: 'Référentiel',
                path: 'reference',
              },
            ],
          },
        ],
      },
    );

    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });
  it('conserve uniquement un séparateur muet entre sections en mode compact', async () => {
    const user = userEvent.setup();

    renderSidebar(
      [WORKSPACE_PERMISSION.WORKSPACE_READ],
      {
        navigation: [
          {
            id: 'application-management',
            type: 'section',
            label: 'Gestion applicative',
            items: [
              {
                id: 'application-reference',
                label: 'Référentiel',
                path: 'reference',
              },
            ],
          },
          {
            id: 'application-operations',
            type: 'section',
            label: 'Opérations applicatives',
            items: [
              {
                id: 'application-jobs',
                label: 'Traitements',
                path: 'jobs',
              },
            ],
          },
        ],
      },
    );

    expect(screen.getByText('Gestion applicative')).toBeInTheDocument();
    expect(screen.getByText('Opérations applicatives')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Réduire la navigation',
    }));

    expect(screen.queryByText('Gestion applicative')).not.toBeInTheDocument();
    expect(screen.queryByText('Opérations applicatives')).not.toBeInTheDocument();

    const separators = screen.getAllByRole('separator');
    expect(separators).toHaveLength(1);
    expect(separators[0]).not.toHaveAttribute('aria-label');
    expect(separators[0]).toHaveAttribute(
      'data-navigation-id',
      'application-operations',
    );
    expect(screen.getByRole('link', { name: 'Référentiel' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Traitements' })).toBeInTheDocument();
  });
});
