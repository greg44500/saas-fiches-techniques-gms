import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';

const mocks = vi.hoisted(() => ({
  detailQuery: vi.fn(),
  marginQuery: vi.fn(),
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

vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useGetDossierTechnicalSheetSettingsQuery: mocks.marginQuery,
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
    <MemoryRouter
      initialEntries={['/workspaces/workspace-1/dossiers/dossier-1']}
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
    expect(screen.getByRole('link', { name: 'Fiches techniques' })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/dossiers/dossier-1/technical-sheets',
    );
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
    expect(screen.getByRole('link', { name: 'Fiches techniques' })).toBeInTheDocument();
  });
});
