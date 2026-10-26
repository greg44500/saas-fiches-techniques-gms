import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import {
  SUPPLIER_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';
import {
  PROCESS_SHEET_PERMISSION,
} from '@/features/process-sheets/constants/process-sheet-permissions';

const mocks = vi.hoisted(() => ({
  detailQuery: vi.fn(),
  marginQuery: vi.fn(),
  metadataQuery: vi.fn(),
  activeSheetsQuery: vi.fn(),
  location: vi.fn(),
  params: vi.fn(),
  workspaceContext: vi.fn(),
}));

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useLocation: mocks.location,
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
    <section aria-label="Recherche du prix applicable">Recherche compacte</section>
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
  mocks.location.mockReturnValue({ pathname: initialEntry });
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
    mocks.location.mockReturnValue({
      pathname: '/workspaces/workspace-1/dossiers/dossier-1',
    });
    mocks.workspaceContext.mockReturnValue({
      can: vi.fn((permission) => [
        SUPPLIER_PERMISSION.APPLICABLE_PRICE_READ,
        TECHNICAL_SHEET_PERMISSION.READ,
        TECHNICAL_SHEET_PERMISSION.SETTINGS_MANAGE,
        PROCESS_SHEET_PERMISSION.READ,
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

  it('présente la barre compacte et les coordonnées accessibles sur demande', async () => {
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
    expect(screen.queryByText(/44000/)).not.toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Nantes Centre' }));
    expect(await screen.findByText(/44000/)).toBeInTheDocument();
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
    expect(screen.getByRole('link', { name: 'Fiches process' })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/dossiers/dossier-1/process-sheets',
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

  it('maintient la recherche de prix dans la barre du Dossier jusque dans les Fiches techniques', () => {
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
      name: 'Recherche du prix applicable',
    })).toBeInTheDocument();

    const technicalSheetsTab = screen.getByRole('link', {
      name: 'Fiches techniques (3)',
    });
    expect(technicalSheetsTab).toHaveClass('border-primary');
    expect(technicalSheetsTab).toHaveClass('text-primary');

    const compactHeader = screen.getByRole('heading', {
      name: 'Nantes Centre',
    }).closest('header');
    expect(compactHeader).toHaveClass('border-b');
    expect(compactHeader).not.toHaveClass('lg:h-56');
  });

  it.each([
    '/workspaces/workspace-1/dossiers/dossier-1/technical-sheets/sheet-1',
    '/workspaces/workspace-1/dossiers/dossier-1/technical-sheets/sheet-1/optimization',
  ])(
    'masque le shell Dossier volumineux dans le poste de travail d’une Fiche (%s)',
    (pathname) => {
      mocks.detailQuery.mockReturnValue(queryResult({
        id: 'dossier-1',
        name: 'Nantes Centre',
        status: 'ACTIVE',
      }));

      renderPage(pathname);

      expect(screen.queryByRole('heading', {
        name: 'Nantes Centre',
      })).not.toBeInTheDocument();
      expect(screen.queryByRole('region', {
        name: 'Recherche du prix applicable',
      })).not.toBeInTheDocument();
    },
  );

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
    const titleButton = screen.getByRole('button', { name: 'Nantes Centre' });
    expect(titleButton).toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Afficher les informations du Dossier',
    })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fiches techniques (3)' })).toBeInTheDocument();
  });

  it('ouvre les informations du Dossier même sans coordonnées', async () => {
    mocks.detailQuery.mockReturnValue(queryResult({
      id: 'dossier-1',
      name: 'Nantes Centre',
      status: 'PAUSED',
    }));
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Nantes Centre' }));
    expect(await screen.findByText('Aucune coordonnée complémentaire renseignée.'))
      .toBeInTheDocument();
  });

  it('ne montre Fiches process que si les deux lectures process et M-004 sont autorisées', () => {
    mocks.detailQuery.mockReturnValue(queryResult({
      id: 'dossier-1', name: 'Nantes Centre', status: 'ACTIVE',
    }));
    mocks.workspaceContext.mockReturnValue({
      can: (permission) => permission === PROCESS_SHEET_PERMISSION.READ,
      canAny: () => false,
      workspace: { id: 'workspace-1', name: 'Acme' },
    });
    const view = renderPage();
    expect(screen.queryByRole('link', { name: 'Fiches process' })).not.toBeInTheDocument();
    view.unmount();

    mocks.workspaceContext.mockReturnValue({
      can: (permission) => permission === TECHNICAL_SHEET_PERMISSION.READ,
      canAny: () => false,
      workspace: { id: 'workspace-1', name: 'Acme' },
    });
    renderPage();
    expect(screen.queryByRole('link', { name: 'Fiches process' })).not.toBeInTheDocument();
  });

  it('masque la recherche de prix et l’édition de marge sans permissions', () => {
    mocks.workspaceContext.mockReturnValue({
      can: (permission) => permission === TECHNICAL_SHEET_PERMISSION.READ,
      canAny: () => false,
      workspace: { id: 'workspace-1', name: 'Acme' },
    });
    mocks.detailQuery.mockReturnValue(queryResult({
      id: 'dossier-1', name: 'Nantes Centre', status: 'ACTIVE',
    }));
    renderPage();
    expect(screen.queryByRole('region', {
      name: 'Recherche du prix applicable',
    })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nantes Centre' })).toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Modifier la marge cible par défaut des nouvelles Fiches',
    })).not.toBeInTheDocument();
  });
});
