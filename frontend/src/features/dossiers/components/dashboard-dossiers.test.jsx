import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import {
  DashboardDossiers,
  createDossierStatusLabelMap,
  formatAccessibleDossierCount,
  getDossierSecondaryLabel,
} from '@/features/dossiers/components/dashboard-dossiers';

const metadata = {
  dossierStatuses: [
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'PAUSED', label: 'En pause' },
  ],
};

const dossiers = [
  {
    id: 'dossier-1',
    name: 'Nantes Centre',
    brand: 'Leclerc',
    location: {
      postalCode: '44000',
      city: 'Nantes',
    },
    status: 'ACTIVE',
  },
  {
    id: 'dossier-2',
    name: 'Saint-Nazaire',
    brand: null,
    location: {
      postalCode: '44600',
      city: 'Saint-Nazaire',
    },
    status: 'PAUSED',
  },
];

function renderDashboard(props = {}) {
  const defaultProps = {
    dossiers,
    isError: false,
    isLoading: false,
    metadata,
    onRetry: vi.fn(),
    total: 2,
    workspaceId: 'workspace-1',
  };

  return render(
    <MemoryRouter>
      <TooltipProvider>
        <DashboardDossiers {...defaultProps} {...props} />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe('DashboardDossiers', () => {
  it('affiche les dossiers accessibles et ouvre uniquement un dossier ACTIVE', () => {
    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Dossiers' })).toBeInTheDocument();
    expect(screen.getByText('2 dossiers accessibles')).toBeInTheDocument();
    expect(screen.getByText('Nantes Centre')).toBeInTheDocument();
    expect(screen.getByText('Leclerc · 44000 Nantes')).toBeInTheDocument();
    expect(screen.getByText('Saint-Nazaire')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
    expect(screen.getByText('En pause')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Voir tous' })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/dossiers',
    );
    expect(screen.getByRole('link', { name: 'Ouvrir' })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/dossiers/dossier-1',
    );
    expect(screen.getAllByRole('link', { name: 'Ouvrir' })).toHaveLength(1);
  });

  it('affiche un état vide sans inventer de droit de création', () => {
    renderDashboard({ dossiers: [], total: 0 });

    expect(screen.getByText('Aucun dossier accessible')).toBeInTheDocument();
    expect(
      screen.getByText('Les dossiers auxquels vous avez accès apparaîtront ici.'),
    ).toBeInTheDocument();
  });

  it('propose un retry en cas d’erreur serveur', () => {
    const onRetry = vi.fn();

    renderDashboard({
      dossiers: [],
      isError: true,
      onRetry,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('dérive les labels de statut depuis les metadata backend', () => {
    const labels = createDossierStatusLabelMap(metadata);

    expect(labels.get('ACTIVE')).toBe('Actif');
    expect(labels.get('PAUSED')).toBe('En pause');
  });

  it('formate les informations secondaires et le compteur', () => {
    expect(getDossierSecondaryLabel(dossiers[0])).toBe('Leclerc · 44000 Nantes');
    expect(getDossierSecondaryLabel({
      location: null,
      brand: null,
    })).toBe('Informations complémentaires non renseignées');
    expect(formatAccessibleDossierCount(1)).toBe('1 dossier accessible');
    expect(formatAccessibleDossierCount(3)).toBe('3 dossiers accessibles');
  });
});
