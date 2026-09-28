import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';

const mocks = vi.hoisted(() => ({
  detailQuery: vi.fn(),
  metadataQuery: vi.fn(),
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

function renderPage() {
  return render(
    <MemoryRouter>
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
      can: vi.fn((permission) => (
        permission === TECHNICAL_SHEET_PERMISSION.SETTINGS_MANAGE
      )),
      canAny: vi.fn(() => false),
      workspace: { id: 'workspace-1', name: 'Acme' },
    });
    mocks.metadataQuery.mockReturnValue(queryResult(metadata));
  });

  it('présente un dossier ACTIVE dans une entête compacte sans contexte redondant', () => {
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
    expect(screen.queryByText('Contexte actif')).not.toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Régler la marge par défaut du Dossier',
    })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tableau de bord' })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/dashboard',
    );
  });

  it('refuse le contexte opérationnel pour un dossier non ACTIVE', () => {
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

    expect(screen.getByText('Contexte de travail indisponible')).toBeInTheDocument();
    expect(screen.getByText('En pause')).toBeInTheDocument();
    expect(screen.queryByText('Contexte actif')).not.toBeInTheDocument();
  });
});
