import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/dossiers/pages/dossiers-page', () => ({
  DossiersPage: () => <h1>Liste autorisée</h1>,
}));

vi.mock('@/features/dossiers/pages/dossier-workspace-page', () => ({
  DossierWorkspacePage: () => <h1>Contexte autorisé</h1>,
}));

import { DossierWorkspaceRoute } from '@/features/dossiers/components/dossier-workspace-route';
import { DossiersRoute } from '@/features/dossiers/components/dossiers-route';
import { DOSSIER_PERMISSION } from '@/features/dossiers/constants/dossier-permissions';
import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };
const membership = {
  id: 'membership-1',
  role: { key: 'reader', name: 'Lecteur' },
};

function renderRoute(Component, permissions) {
  render(
    <WorkspaceProvider
      features={[]}
      membership={membership}
      permissions={permissions}
      workspace={workspace}
    >
      <Component />
    </WorkspaceProvider>,
  );
}

describe('Dossiers routes', () => {
  it('refuse la liste sans dossier:read', () => {
    renderRoute(DossiersRoute, []);

    expect(screen.getByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Liste autorisée' })).not.toBeInTheDocument();
  });

  it('rend la liste avec dossier:read', () => {
    renderRoute(DossiersRoute, [DOSSIER_PERMISSION.READ]);

    expect(screen.getByRole('heading', { name: 'Liste autorisée' })).toBeInTheDocument();
  });

  it('refuse la page de travail sans dossier:read', () => {
    renderRoute(DossierWorkspaceRoute, []);

    expect(screen.getByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Contexte autorisé' })).not.toBeInTheDocument();
  });

  it('rend la page de travail avec dossier:read', () => {
    renderRoute(DossierWorkspaceRoute, [DOSSIER_PERMISSION.READ]);

    expect(screen.getByRole('heading', { name: 'Contexte autorisé' })).toBeInTheDocument();
  });
});
