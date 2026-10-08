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
    contactName: 'Mme Martin',
    createdAt: '2026-09-20T10:00:00.000Z',
    technicalSheetCount: 4,
    technicalSheetSettings: { defaultTargetMarginBasisPoints: 3500 },
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
    technicalSheetCount: 0,
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

  it('retourne une carte et affiche les informations de synthèse du Dossier', () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: 'Afficher les détails de Nantes Centre' }));

    expect(screen.getByText(/Mme Martin/)).toBeInTheDocument();
    expect(screen.getByText(/35 %/)).toBeInTheDocument();
    expect(screen.getByText(/Fiches techniques :/).parentElement).toHaveTextContent('4');
    expect(screen.getByRole('button', { name: 'Revenir à Nantes Centre' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Revenir à Nantes Centre' }));
    expect(screen.getByRole('button', { name: 'Afficher les détails de Nantes Centre' })).toBeInTheDocument();
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
