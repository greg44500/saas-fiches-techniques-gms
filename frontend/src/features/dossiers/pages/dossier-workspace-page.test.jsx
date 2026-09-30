import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import {
  SUPPLIER_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';

const mocks = vi.hoisted(() => ({
  detailQuery: vi.fn(),
  marginQuery: vi.fn(),
  metadataQuery: vi.fn(),
  activeSheetsQuery: vi.fn(),
  params: vi.fn(),
  workspaceContext: vi.fn(),
}));

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useParams: mocks.params,
  };
});

vi.mock('@/features/dossiers/api/dossiers-api', () => ({
  useGetDossierByIdQuery: mocks.detailQuery,
  useGetDossierMetadataQuery: mocks.metadataQuery,
}));

vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useGetDossierTechnicalSheetSettingsQuery: mocks.marginQuery,
  useListTechnicalSheetsQuery: mocks.activeSheetsQuery,
}));

vi.mock('@/features/suppliers/components/dossier-applicable-price-card', () => ({
  DossierApplicablePriceCard: () => (
    <section aria-label="Carte prix applicable">Prix applicable compact</section>
  ),
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: mocks.workspaceContext,
}));

import { DossierWorkspacePage } from '@/features/dossiers/pages/dossier-workspace-page';

const metadata = {
  dossierStatuses: [
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'PAUSED', label: 'En pause' },
  ],
};

function queryResult(data) {
  return {
    data,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  };
}

function renderPage(
  initialEntry = '/workspaces/workspace-1/dossiers/dossier-1',
) {
  return render(
    <MemoryRouter
      initialEntries={[initialEntry]}
    >
      <TooltipProvider>
        <DossierWorkspacePage />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe('DossierWorkspacePage', () => {
  beforeEach(() => {
    mocks.params.mockReturnValue({ dossierId: 'dossier-1' });
    mocks.workspaceContext.mockReturnValue({
      can: vi.fn((permission) => [
        SUPPLIER_PERMISSION.APPLICABLE_PRICE_READ,
        TECHNICAL_SHEET_PERMISSION.READ,
        TECHNICAL_SHEET_PERMISSION.SETTINGS_MANAGE,
      ].includes(permission)),
      canAny: vi.fn(() => true),
      workspace: { id: 'workspace-1', name: 'Acme' },
    });
    mocks.metadataQuery.mockReturnValue(queryResult(metadata));
    mocks.marginQuery.mockReturnValue(queryResult({
      defaultTargetMarginBasisPoints: 3000,
    }));
    mocks.activeSheetsQuery.mockReturnValue(queryResult({
      sheets: [],
      pagination: {
        page: 1,
        limit: 1,
        total: 3,
        totalPages: 3,
      },
    }));
  });

  it('présente le contexte Dossier compact et ses onglets métier', () => {
    mocks.detailQuery.mockReturnValue(queryResult({
      id: 'dossier-1',
      name: 'Nantes Centre',
      brand: 'Leclerc',
      location: {
        postalCode: '44000',
        city: 'Nantes',
      },
      contactName: 'Responsable',
      documentEmail: 'docs@example.test',
      phone: '0200000000',
      status: 'ACTIVE',
    }));

    renderPage();

    expect(screen.getByRole('heading', { name: 'Nantes Centre' })).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
    expect(screen.getByText(/44000/)).toBeInTheDocument();
    expect(screen.getByText('Responsable')).toBeInTheDocument();
    expect(screen.getByText('docs@example.test')).toBeInTheDocument();
    expect(screen.getByText('0200000000')).toBeInTheDocument();
    expect(screen.queryByText('Acme')).not.toBeInTheDocument();
    expect(screen.queryByText('Leclerc')).not.toBeInTheDocument();

    expect(screen.getByRole('button', {
      name: 'Modifier la marge cible par défaut des nouvelles Fiches',
    })).toHaveTextContent('Marge cible 30 %');

    expect(screen.getByRole('link', { name: 'Dossiers' })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/dossiers',
    );
    expect(screen.getByRole('link', { name: 'Fournisseurs et prix' })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/dossiers/dossier-1/suppliers',
    );
    expect(screen.getByRole('link', { name: 'Fiches techniques (3)' })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/dossiers/dossier-1/technical-sheets',
    );

    expect(mocks.activeSheetsQuery).toHaveBeenCalledWith(
      {
        workspaceId: 'workspace-1',
        dossierId: 'dossier-1',
        page: 1,
        limit: 1,
        status: 'ACTIVE',
      },
      {
        skip: false,
      },
    );
  });

  it('maintient la carte de prix dans le contexte Dossier jusque dans les Fiches techniques', () => {
    mocks.detailQuery.mockReturnValue(queryResult({
      id: 'dossier-1',
      name: 'Nantes Centre',
      location: null,
      contactName: null,
      documentEmail: null,
      phone: null,
      status: 'ACTIVE',
    }));

    renderPage(
      '/workspaces/workspace-1/dossiers/dossier-1/technical-sheets',
    );

    expect(screen.getByRole('region', {
      name: 'Carte prix applicable',
    })).toBeInTheDocument();

    const technicalSheetsTab = screen.getByRole('link', {
      name: 'Fiches techniques (3)',
    });
    expect(technicalSheetsTab).toHaveClass('border-primary');
    expect(technicalSheetsTab).toHaveClass('text-primary');

    const identityCard = screen.getByRole('heading', {
      name: 'Nantes Centre',
    }).closest('header');
    expect(identityCard).toHaveClass('lg:h-56');
  });

  it('masque les coordonnées absentes et conserve la consultation d’un Dossier non actif', () => {
    mocks.detailQuery.mockReturnValue(queryResult({
      id: 'dossier-1',
      name: 'Nantes Centre',
      brand: null,
      location: null,
      contactName: null,
      documentEmail: null,
      phone: null,
      status: 'PAUSED',
    }));

    renderPage();

    expect(screen.getByText('Dossier non opérationnel')).toBeInTheDocument();
    expect(screen.getByText('En pause')).toBeInTheDocument();
    expect(screen.queryByText('Responsable non renseigné')).not.toBeInTheDocument();
    expect(screen.queryByText('Email documents non renseigné')).not.toBeInTheDocument();
    expect(screen.queryByText('Téléphone non renseigné')).not.toBeInTheDocument();
    expect(screen.queryByText('Non renseignée')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fiches techniques (3)' })).toBeInTheDocument();
  });
});
