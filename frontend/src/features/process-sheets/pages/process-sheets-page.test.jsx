import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { PROCESS_SHEET_PERMISSION } from '@/features/process-sheets/constants/process-sheet-permissions';
import { TECHNICAL_SHEET_PERMISSION } from '@/features/technical-sheets/constants/technical-sheet-permissions';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  dossier: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('react-router', async (original) => ({
  ...(await original()),
  useNavigate: () => mocks.navigate,
  useParams: () => ({ dossierId: 'dossier-1' }),
}));

vi.mock('@/features/process-sheets/api/process-sheets-api', () => ({
  useListProcessSheetsQuery: mocks.list,
}));

vi.mock('@/features/dossiers/api/dossiers-api', () => ({
  useGetDossierByIdQuery: mocks.dossier,
}));

vi.mock('@/features/process-sheets/components/process-sheet-create-dialog', () => ({
  ProcessSheetCreateDialog: ({ onCreated }) => (
    <div role="dialog" aria-label="Création">
      <button onClick={() => onCreated({ id: 'new-process' })} type="button">
        Simuler la création réussie
      </button>
    </div>
  ),
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: () => ({
    workspace: { id: 'workspace-1' },
    can: (p) => [
      PROCESS_SHEET_PERMISSION.READ,
      PROCESS_SHEET_PERMISSION.CREATE,
      TECHNICAL_SHEET_PERMISSION.READ,
    ].includes(p),
  }),
}));

import { ProcessSheetsPage } from '@/features/process-sheets/pages/process-sheets-page';

const processes = [{
  id: 'process-1',
  title: 'Fabrication tartine',
  technicalSheetId: 'sheet-1',
  technicalSheetName: 'Tartine auvergnate',
  editorialState: 'DRAFT',
  status: 'ACTIVE',
  updatedAt: '2026-10-26T12:00:00.000Z',
}, {
  id: 'process-2',
  title: 'Préparation bourguignon',
  technicalSheetId: 'sheet-2',
  technicalSheetName: 'Bœuf Bourguignon',
  editorialState: 'VALIDATED',
  status: 'ARCHIVED',
  updatedAt: '2026-10-26T12:00:00.000Z',
}];

function renderPage() {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <ProcessSheetsPage />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.dossier.mockReturnValue({ data: { status: 'ACTIVE' } });
  mocks.list.mockReturnValue({
    data: { processes, pagination: { page: 1, limit: 10, total: 2, totalPages: 1 } },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
});

describe('M-006 — liste des Fiches process uniquement', () => {
  it('liste les process enregistrés avec leur lien M-004, pas les Fiches techniques', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Fiches process' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Fiches process du Dossier' })).toBeInTheDocument();
    expect(screen.getByText('Fabrication tartine')).toBeInTheDocument();
    expect(screen.getByText('Tartine auvergnate')).toBeInTheDocument();
    expect(screen.getByText('Préparation bourguignon')).toBeInTheDocument();
    expect(screen.getByText('Archivée')).toBeInTheDocument();
    expect(screen.queryByText('Composition de référence M-004')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer une Fiche process' })).toBeInTheDocument();
    expect(mocks.list).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      page: 1,
      limit: 10,
      search: undefined,
    });
  });

  it('ouvre le process sélectionné et non sa Fiche technique', async () => {
    renderPage();
    await userEvent.setup().click(screen.getByRole('button', {
      name: 'Ouvrir la Fiche process Fabrication tartine',
    }));
    expect(mocks.navigate).toHaveBeenCalledWith(
      '/workspaces/workspace-1/dossiers/dossier-1/process-sheets/process-1',
    );
  });

  it('ouvre la modale puis la Fiche process créée', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Créer une Fiche process' }));
    expect(screen.getByRole('dialog', { name: 'Création' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Simuler la création réussie' }));
    expect(mocks.navigate).toHaveBeenCalledWith(
      '/workspaces/workspace-1/dossiers/dossier-1/process-sheets/new-process',
    );
  });

  it('gère recherche et pagination serveur plutôt qu’un filtre de M-004', async () => {
    mocks.list.mockReturnValue({
      data: { processes, pagination: { page: 1, limit: 10, total: 22, totalPages: 3 } },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', {
      name: 'Rechercher une Fiche process',
    }), 'tartine');
    expect(mocks.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'tartine', page: 1 }),
    );
    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(mocks.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, limit: 10 }),
    );
  });

  it('montre le vide et les erreurs sans présenter des M-004 comme process', () => {
    mocks.list.mockReturnValue({
      data: { processes: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
      isLoading: false, isFetching: false, isError: false, refetch: vi.fn(),
    });
    const view = renderPage();
    expect(screen.getByText('Aucune Fiche process')).toBeInTheDocument();
    view.unmount();

    mocks.list.mockReturnValue({
      data: null, isLoading: false, isFetching: false,
      isError: true, refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('Fiches process indisponibles');
  });
});
