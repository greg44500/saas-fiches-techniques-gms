import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  composition: vi.fn(),
}));

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useParams: () => ({ dossierId: 'dossier-1' }),
}));

vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useListTechnicalSheetsQuery: mocks.list,
}));

vi.mock('@/features/process-sheets/api/process-sheets-api', () => ({
  useGetProcessSheetCompositionQuery: mocks.composition,
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: () => ({
    workspace: { id: 'workspace-1' },
  }),
}));

import {
  ProcessSheetsPage,
} from '@/features/process-sheets/pages/process-sheets-page';

const sheets = [
  {
    id: 'sheet-1',
    name: 'Purée de légumes',
    hasDraft: true,
    currentValidatedStateId: null,
  },
  {
    id: 'sheet-2',
    name: 'Gratin',
    hasDraft: false,
    currentValidatedStateId: 'validation-2',
  },
];

function renderPage(path = '/workspaces/workspace-1/dossiers/dossier-1/process-sheets') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ProcessSheetsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockReturnValue({
    data: {
      sheets,
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.composition.mockImplementation((_args, { skip }) => ({
    data: skip ? undefined : {
      technicalSheetName: 'Gratin',
      draft: null,
      validated: null,
      requiresExplicitLegacyMapping: false,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }));
});

describe('M-006 — première page Dossier Fiches process', () => {
  it('filtre sur les Fiches techniques actives et n’invente pas de fiche process', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Fiches process' }))
      .toBeInTheDocument();
    expect(screen.getByRole('table', {
      name: 'Fiches techniques disponibles pour consultation process',
    })).toBeInTheDocument();
    expect(screen.getByText('Purée de légumes')).toBeInTheDocument();
    expect(screen.getByText('Gratin')).toBeInTheDocument();
    expect(screen.getByText('Sélectionnez une Fiche technique')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Créer une Fiche process/ }))
      .not.toBeInTheDocument();
    expect(mocks.list).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      page: 1,
      limit: 10,
      status: 'ACTIVE',
      search: undefined,
    });
    expect(mocks.composition).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      technicalSheetId: null,
    }, { skip: true });
  });

  it('sélectionne une Fiche et interroge le contexte de composition de cette Fiche', async () => {
    renderPage();
    await userEvent.setup().click(screen.getByRole('button', {
      name: 'Consulter les ingrédients de Gratin',
    }));
    expect(mocks.composition).toHaveBeenLastCalledWith({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      technicalSheetId: 'sheet-2',
    }, { skip: false });
    expect(screen.getByRole('button', {
      name: 'Consulter les ingrédients de Gratin',
    })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Composition de référence M-004')).toBeInTheDocument();
  });

  it('restaure une sélection existante par l’URL et recherche côté serveur', async () => {
    renderPage('/workspaces/workspace-1/dossiers/dossier-1/process-sheets?sheet=sheet-2');
    expect(mocks.composition).toHaveBeenLastCalledWith({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      technicalSheetId: 'sheet-2',
    }, { skip: false });

    await userEvent.setup().type(screen.getByRole('textbox', {
      name: 'Rechercher une Fiche technique pour le process',
    }), 'purée');
    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({
      search: 'purée',
      status: 'ACTIVE',
      page: 1,
    }));
  });

  it('utilise la pagination serveur et conserve la sélection en URL', async () => {
    mocks.list.mockReturnValue({
      data: {
        sheets,
        pagination: { page: 1, limit: 10, total: 22, totalPages: 3 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderPage();
    await userEvent.setup().click(screen.getByRole('button', {
      name: 'Suivant',
    }));
    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({
      page: 2,
      limit: 10,
      status: 'ACTIVE',
    }));
  });

  it('affiche les états d’erreur de la liste plutôt qu’un tableau vide trompeur', () => {
    mocks.list.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Liste des Fiches techniques indisponible',
    );
  });
});
