import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

vi.mock('@/features/platform/components/platform-dashboard-display-preferences', () => ({
  PlatformDashboardDisplayPreferences: ({ triggerVariant }) => (
    <button type="button">
      {triggerVariant === 'icon' ? 'Préférences d’affichage' : 'Personnaliser Platform'}
    </button>
  ),
}));

vi.mock('@/features/platform/components/platform-user-identity', () => ({
  PlatformUserIdentity: ({ actions }) => (
    <div>
      <span>Identité Platform</span>
      {actions}
    </div>
  ),
}));

vi.mock('@/features/platform/components/platform-sidebar', () => ({
  PlatformSidebar: () => <aside>Navigation administration</aside>,
}));

vi.mock('@/features/platform/components/platform-quick-access', () => ({
  PlatformQuickAccess: () => (
    <div
      aria-label="Accès rapide aux vues d’administration"
      role="search"
    />
  ),
}));

import { PlatformLayout } from '@/app/layouts/platform-layout';

function renderLayout(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<PlatformLayout />} path="/platform">
          <Route element={<p>Vue d’ensemble</p>} path="overview" />
          <Route element={<p>Utilisateurs Platform</p>} path="users" />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('PlatformLayout', () => {
  afterEach(() => cleanup());

  it('affiche l’accès rapide et les préférences d’affichage sur la vue d’ensemble Platform', () => {
    renderLayout('/platform/overview');

    expect(
      screen.getByText('Console d’administration globale'),
    ).toBeInTheDocument();
    expect(screen.getByRole('search', { name: 'Accès rapide aux vues d’administration' }))
      .toBeInTheDocument();
    expect(screen.getByText('Identité Platform')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Préférences d’affichage' }))
      .toBeInTheDocument();
  });

  it('conserve les préférences d’affichage accessibles hors vue d’ensemble', () => {
    renderLayout('/platform/users');

    expect(screen.getByText('Utilisateurs Platform')).toBeInTheDocument();
    expect(screen.getByRole('search', { name: 'Accès rapide aux vues d’administration' }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Préférences d’affichage' }))
      .toBeInTheDocument();
  });
});
