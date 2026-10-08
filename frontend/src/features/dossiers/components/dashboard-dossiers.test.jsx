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
    totalPages: 1,
    page: 1,
    pageSize: 3,
    canCreate: true,
    onCreate: vi.fn(),
    onPageChange: vi.fn(),
    onSearch: (event) => event.preventDefault(),
    onSearchChange: vi.fn(),
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

    expect(screen.getByRole('heading', { name: 'Dossiers (2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer un dossier' })).toBeInTheDocument();
    expect(screen.getByText('1–2 sur 2')).toBeInTheDocument();
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
    renderDashboard({ dossiers: [], total: 0, canCreate: false });
    expect(screen.queryByRole('button', { name: 'Créer un dossier' })).not.toBeInTheDocument();

    expect(screen.getByText('Aucun dossier accessible')).toBeInTheDocument();
    expect(
      screen.getByText('Les dossiers auxquels vous avez accès apparaîtront ici.'),
    ).toBeInTheDocument();
  });

  it('navigue dans les pages sans charger tous les Dossiers', () => {
    const onPageChange = vi.fn();
    renderDashboard({ total: 100, totalPages: 34, onPageChange });
    fireEvent.click(screen.getByRole('button', { name: 'Cartes suivantes' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(screen.getByText('Dossiers (100)')).toBeInTheDocument();
  });

  it('soumet une recherche sur les Dossiers accessibles', () => {
    const onSearch = vi.fn((event) => event.preventDefault());
    const onSearchChange = vi.fn();
    renderDashboard({ onSearch, onSearchChange });
    fireEvent.change(screen.getByRole('textbox', { name: 'Rechercher un dossier dans le tableau de bord' }), {
      target: { value: 'Nantes' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lancer la recherche de dossiers' }));
    expect(onSearchChange).toHaveBeenCalledWith('Nantes');
    expect(onSearch).toHaveBeenCalledTimes(1);
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
