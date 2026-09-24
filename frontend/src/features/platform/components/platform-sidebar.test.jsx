import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  PLATFORM_NAVIGATION_ICONS,
  PlatformSidebar,
  getPlatformNavigationIcon,
} from '@/features/platform/components/platform-sidebar';
import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const useGetCurrentPlatformContextQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: useGetCurrentPlatformContextQueryMock,
}));

const allNavigationPermissions = Object.values(PLATFORM_PERMISSION);

function renderSidebar({
  collapsed = false,
  path = '/platform/overview',
} = {}) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <TooltipProvider delay={0}>
        <SidebarProvider defaultOpen={!collapsed}>
          <PlatformSidebar />
        </SidebarProvider>
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe('PlatformSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: {
        status: 'active',
        permissions: allNavigationPermissions,
      },
    });
  });

  afterEach(() => cleanup());

  it('rend la structure Platform autorisée dans un landmark de navigation', () => {
    renderSidebar();

    expect(
      screen.getByRole('navigation', { name: 'Navigation de la plateforme' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Vue d’ensemble' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gestion clients' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Offre commerciale' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Équipe Platform' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sécurité & données' })).toBeInTheDocument();
  });

  it('associe une icône distincte à chaque entrée Platform', () => {
    const icons = Object.values(PLATFORM_NAVIGATION_ICONS);

    expect(new Set(icons).size).toBe(icons.length);
  });

  it('utilise l’icône déclarée par une entrée applicative', () => {
    const DerivedIcon = () => null;

    expect(getPlatformNavigationIcon({
      id: 'derived-reference',
      icon: DerivedIcon,
    })).toBe(DerivedIcon);
  });

  it('ouvre le groupe de la route active et ne garde qu’un groupe ouvert', async () => {
    const user = userEvent.setup();
    renderSidebar({ path: '/platform/retention' });

    const securityGroup = screen.getByRole('button', { name: 'Sécurité & données' });
    const clientGroup = screen.getByRole('button', { name: 'Gestion clients' });

    expect(securityGroup).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Rétention & purge' })).toBeInTheDocument();

    await user.click(clientGroup);

    expect(clientGroup).toHaveAttribute('aria-expanded', 'true');
    expect(securityGroup).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Rétention & purge' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Utilisateurs' })).toBeInTheDocument();
  });

  it('masque entièrement les groupes sans enfant autorisé', () => {
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: {
        status: 'active',
        permissions: [PLATFORM_PERMISSION.OVERVIEW_READ],
      },
    });

    renderSidebar();

    expect(screen.getByRole('link', { name: 'Vue d’ensemble' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gestion clients' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sécurité & données' })).not.toBeInTheDocument();
  });

  it('utilise le tooltip shadcn pour les groupes en mode réduit', async () => {
    const user = userEvent.setup();
    renderSidebar({ collapsed: true });

    const clientGroup = screen.getByRole('button', { name: 'Gestion clients' });

    expect(clientGroup).not.toHaveAttribute('title');

    await user.hover(clientGroup);

    expect(
      (await screen.findAllByText('Gestion clients', { exact: true })).length,
    ).toBeGreaterThan(1);
  });

  it('ouvre un groupe Platform en popover quand la sidebar est réduite puis le ferme après navigation', async () => {
    const user = userEvent.setup();
    renderSidebar({ collapsed: true });

    const securityGroup = screen.getByRole('button', { name: 'Sécurité & données' });
    await user.click(securityGroup);

    const retentionLink = await screen.findByRole('link', { name: 'Rétention & purge' });
    expect(retentionLink).toBeInTheDocument();

    await user.click(retentionLink);

    expect(screen.queryByRole('link', { name: 'Rétention & purge' })).not.toBeInTheDocument();
  });

  it('fait piloter le mode icône par le SidebarProvider via le trigger shadcn', async () => {
    const user = userEvent.setup();
    renderSidebar();

    const trigger = screen.getByRole('button', {
      name: 'Réduire la navigation d’administration',
    });

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.click(trigger);

    expect(
      screen.getByRole('button', { name: 'Déployer la navigation d’administration' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });
});
