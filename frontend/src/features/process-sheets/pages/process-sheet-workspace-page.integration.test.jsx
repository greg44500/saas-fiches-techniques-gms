import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { TooltipProvider } from '@/components/ui/tooltip';
import { PROCESS_SHEET_PERMISSION } from '@/features/process-sheets/constants/process-sheet-permissions';

const mocks = vi.hoisted(() => ({ detail: vi.fn(), save: vi.fn(), can: vi.fn() }));

vi.mock('react-router', async (original) => ({
  ...(await original()),
  useParams: () => ({ dossierId: 'dossier-1', processSheetId: 'process-1' }),
}));

vi.mock('@/features/process-sheets/api/process-sheets-api', () => ({
  useGetProcessSheetQuery: mocks.detail,
  useSaveProcessSheetDraftMutation: () => [mocks.save, { isLoading: false }],
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: () => ({
    workspace: { id: 'workspace-1' },
    can: mocks.can,
  }),
}));

// Unlike the page's isolated tests, this renders the REAL editor beneath
// the page and covers GET payload → RBAC → phase/step form → PUT payload.
import { ProcessSheetWorkspacePage } from '@/features/process-sheets/pages/process-sheet-workspace-page';

const initialData = () => ({
  process: {
    id: 'process-1', technicalSheetId: 'sheet-1',
    title: 'Assemblage tartine', status: 'ACTIVE', editorialState: 'DRAFT',
  },
  draft: { id: 'draft-1', revision: 0, phases: [], unassignedReasons: [] },
  sourceIngredients: {
    lines: [
      { lineKey: 'line:a', productVariantName: 'Tomate', sourcePosition: 0 },
      { lineKey: 'line:b', productVariantName: 'Tomate', sourcePosition: 1 },
    ],
    hasLegacyLineIdentity: false,
  },
  compositionOutdated: false,
  dossierOperational: true,
});

function view() {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <ProcessSheetWorkspacePage />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.can.mockImplementation((permission) => permission === PROCESS_SHEET_PERMISSION.EDIT);
  mocks.detail.mockReturnValue({
    data: initialData(), isError: false, isLoading: false, refetch: vi.fn(),
  });
  mocks.save.mockImplementation((body) => ({
    unwrap: vi.fn().mockResolvedValue({
      id: 'draft-1', revision: body.expectedRevision + 1,
      phases: body.phases, unassignedReasons: body.unassignedReasons,
    }),
  }));
});

describe('M-006 — chaîne page → éditeur réel → sauvegarde', () => {
  it('enregistre une étape et la bonne occurrence M-004 depuis une réponse GET réelle en forme', async () => {
    const user = userEvent.setup();
    view();
    expect(screen.getByRole('heading', { name: 'Assemblage tartine' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ajouter une phase' }));
    const phase = screen.getByRole('region', { name: 'Phase 1' });
    await user.click(within(phase).getByRole('button', { name: 'Ajouter une étape' }));
    const step = within(phase).getByRole('article', { name: 'Étape 1' });
    await user.type(within(step).getByRole('textbox', { name: 'Instructions' }), 'Assembler les éléments');
    const selection = within(step).getByRole('group', { name: 'Ingrédients affectés à cette étape' });
    await user.click(within(selection).getByRole('button', { name: 'Associer des ingrédients' }));
    await user.click(within(selection).getAllByRole('checkbox')[1]);
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(mocks.save).toHaveBeenCalledTimes(1);
    const payload = mocks.save.mock.calls[0][0];
    expect(payload).toMatchObject({
      workspaceId: 'workspace-1', dossierId: 'dossier-1', processSheetId: 'process-1',
      expectedRevision: 0,
    });
    expect(payload.phases).toHaveLength(1);
    expect(payload.phases[0].steps[0]).toMatchObject({
      instructions: 'Assembler les éléments', ingredientLineKeys: ['line:b'],
    });
    expect(screen.getByText(/Révision 1 · À jour/)).toBeInTheDocument();
  });

  it.each([
    { status: 'ACTIVE', dossierOperational: false },
    { status: 'ARCHIVED', dossierOperational: true },
  ])('maintient la lecture sans écrire si les préconditions GET/PUT ne sont pas réunies : %#', ({
    status, dossierOperational,
  }) => {
    mocks.detail.mockReturnValue({
      data: {
        ...initialData(), process: { ...initialData().process, status }, dossierOperational,
      },
      isError: false, isLoading: false, refetch: vi.fn(),
    });
    view();
    expect(screen.getByText(/Consultation uniquement/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter une phase' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer le brouillon' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aperçu du process' })).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
