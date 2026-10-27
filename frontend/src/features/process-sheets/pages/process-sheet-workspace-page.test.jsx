import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { TooltipProvider } from '@/components/ui/tooltip';
import { PROCESS_SHEET_PERMISSION } from '@/features/process-sheets/constants/process-sheet-permissions';

const mocks = vi.hoisted(() => ({
  detail: vi.fn(),
  can: vi.fn(),
}));

vi.mock('react-router', async (original) => ({
  ...(await original()),
  useParams: () => ({ dossierId: 'dossier-1', processSheetId: 'process-1' }),
}));

vi.mock('@/features/process-sheets/api/process-sheets-api', () => ({
  useGetProcessSheetQuery: mocks.detail,
}));

vi.mock('@/features/process-sheets/components/process-sheet-draft-editor', () => ({
  ProcessSheetDraftEditor: ({ initialDraft, sourceIngredients, canEdit }) => (
    <div>
      Éditeur M-006 : {initialDraft?.revision}
      {' | '}Ingrédients : {sourceIngredients?.lines?.length ?? 0}
      {' | '}Édition : {canEdit ? 'oui' : 'non'}
    </div>
  ),
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: () => ({
    workspace: { id: 'workspace-1' },
    can: mocks.can,
  }),
}));

import { ProcessSheetWorkspacePage } from '@/features/process-sheets/pages/process-sheet-workspace-page';

function view() {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <ProcessSheetWorkspacePage />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

const activeProcess = {
  id: 'process-1', title: 'Fabrication tartine', technicalSheetId: 'sheet-1',
  status: 'ACTIVE', editorialState: 'DRAFT',
};
const initialData = () => ({
  process: { ...activeProcess },
  draft: { revision: 0, phases: [], unassignedReasons: [] },
  sourceIngredients: { lines: [{ lineKey: 'line:1' }] },
  compositionOutdated: false,
  dossierOperational: true,
});
const detailResult = (data) => ({
  data, isError: false, isLoading: false, refetch: vi.fn(),
});
function expectReadOnly() {
  expect(screen.getByText(/Édition : non/)).toBeInTheDocument();
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.can.mockImplementation((permission) => permission === PROCESS_SHEET_PERMISSION.EDIT);
  mocks.detail.mockReturnValue(detailResult(initialData()));
});

describe('M-006 — ouverture du brouillon process', () => {
  it('ouvre un vrai brouillon ACTIVE et autorise l’édition avec permission et Dossier actif', () => {
    view();
    expect(screen.getByRole('heading', { name: 'Fabrication tartine' })).toBeInTheDocument();
    expect(screen.getByText(/Éditeur M-006 : 0/)).toBeInTheDocument();
    expect(screen.getByText(/Ingrédients : 1/)).toBeInTheDocument();
    expect(screen.getByText(/Édition : oui/)).toBeInTheDocument();
    expect(mocks.detail).toHaveBeenCalledWith({
      workspaceId: 'workspace-1', dossierId: 'dossier-1', processSheetId: 'process-1',
    });
    expect(mocks.can).toHaveBeenCalledWith(PROCESS_SHEET_PERMISSION.EDIT);
  });

  it.each(['ARCHIVED', 'DELETED'])(
    'n’autorise pas l’édition quand le process est %s, même avec le droit EDIT',
    (status) => {
      mocks.detail.mockReturnValue(detailResult({
        ...initialData(), process: { ...activeProcess, status },
      }));
      view();
      expectReadOnly();
    },
  );

  it('refuse l’édition pour un process dont le statut est absent ou inconnu', () => {
    const { status: _status, ...withoutStatus } = activeProcess;
    mocks.detail.mockReturnValue(detailResult({
      ...initialData(), process: withoutStatus,
    }));
    view();
    expectReadOnly();
  });

  it('ne permet pas d’éditer à un lecteur, même avec Dossier et process actifs', () => {
    mocks.can.mockReturnValue(false);
    view();
    expectReadOnly();
  });

  it.each([false, null, undefined])(
    'interdit l’édition lorsque le serveur ne confirme pas le Dossier opérationnel (%s)',
    (dossierOperational) => {
      mocks.detail.mockReturnValue(detailResult({
        ...initialData(), dossierOperational,
      }));
      view();
      expectReadOnly();
      expect(screen.getByRole('heading', { name: 'Fabrication tartine' })).toBeInTheDocument();
    },
  );

  it('signale une composition M-004 modifiée sans remapper le contenu process', () => {
    mocks.detail.mockReturnValue(detailResult({
      ...initialData(),
      process: { ...activeProcess, status: 'ARCHIVED' },
      draft: { revision: 2, phases: [], unassignedReasons: [] },
      sourceIngredients: { lines: [{ lineKey: 'validation:old:index:0' }] },
      compositionOutdated: true,
    }));
    view();
    expect(screen.getByRole('note')).toHaveTextContent('La composition M-004 a évolué');
    expectReadOnly();
    expect(screen.getByText(/Ingrédients : 1/)).toBeInTheDocument();
  });

  it('autorise l’édition du brouillon ACTIVE en cas de décalage M-004, sans rapprochement automatique', () => {
    mocks.detail.mockReturnValue(detailResult({
      ...initialData(), compositionOutdated: true,
    }));
    view();
    expect(screen.getByRole('note')).toHaveTextContent('aucune correspondance');
    expect(screen.getByText(/Édition : oui/)).toBeInTheDocument();
  });

  it('ne fabrique pas un brouillon vide quand la réponse API n’en contient pas', () => {
    mocks.detail.mockReturnValue(detailResult({
      ...initialData(), draft: null,
    }));
    view();
    expect(screen.getByRole('alert')).toHaveTextContent('Brouillon process indisponible');
    expect(screen.queryByText(/Éditeur M-006/)).not.toBeInTheDocument();
  });

  it('ne simule pas de document quand le processus a disparu', () => {
    mocks.detail.mockReturnValue({
      data: undefined, isError: true, isLoading: false, refetch: vi.fn(),
    });
    view();
    expect(screen.getByRole('alert')).toHaveTextContent('Fiche process indisponible');
  });
});
