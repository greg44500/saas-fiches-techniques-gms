import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { TooltipProvider } from '@/components/ui/tooltip';
import { PROCESS_SHEET_PERMISSION } from '@/features/process-sheets/constants/process-sheet-permissions';

const mocks = vi.hoisted(() => ({
  detail: vi.fn(), save: vi.fn(), can: vi.fn(),
  phaseTitles: vi.fn(), createTitle: vi.fn(),
}));

vi.mock('react-router', async (original) => ({
  ...(await original()),
  useParams: () => ({ dossierId: 'dossier-1', processSheetId: 'process-1' }),
}));

vi.mock('@/features/process-sheets/api/process-sheets-api', () => ({
  useGetProcessSheetQuery: mocks.detail,
  useSaveProcessSheetDraftMutation: () => [mocks.save, { isLoading: false }],
  useListProcessPhaseTitlesQuery: (...args) => mocks.phaseTitles(...args),
  useCreateProcessPhaseTitleMutation: () => [mocks.createTitle, { isLoading: false }],
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

async function addFreePhase(user) {
  await user.click(screen.getByRole('combobox', { name: 'Ajouter une phase' }));
  await user.click(screen.getByRole('option', { name: 'Autre phase…' }));
  await user.type(screen.getByRole('textbox', { name: 'Intitulé' }), 'Nouvelle phase');
  await user.click(screen.getByRole('button', { name: 'Ajouter la phase' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.phaseTitles.mockReturnValue({ data: { phases: [] }, isLoading: false });
  mocks.createTitle.mockImplementation(({ title }) => ({
    unwrap: vi.fn().mockResolvedValue({ id: 'new-phase', title }),
  }));
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
    await addFreePhase(user);
    expect(screen.getByRole('region', { name: 'Phase 1' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ajouter une étape' }));
    const step = screen.getByRole('article', { name: 'Étape 1' });
    expect(within(screen.getByRole('complementary', { name: 'Suivi des ingrédients' }))
      .getByRole('status')).toHaveTextContent('0 affectés · 2 à affecter');
    expect(screen.getByRole('navigation', { name: 'Navigation des phases et étapes' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Étapes de la phase 1' })).toBeInTheDocument();
    await user.type(within(step).getByRole('textbox', { name: 'Instructions' }), 'Assembler les éléments');
    const selection = within(step).getByRole('group', { name: 'Ingrédients affectés à cette étape' });
    await user.click(within(selection).getByRole('button', { name: 'Associer des ingrédients' }));
    await user.click(within(selection).getAllByRole('checkbox')[1]);
    const ingredients = screen.getByRole('complementary', { name: 'Suivi des ingrédients' });
    expect(within(ingredients).getByRole('status')).toHaveTextContent('1 affecté · 1 à affecter');
    expect(within(ingredients).getByRole('button', {
      name: 'Affecté dans : Étape : Nouvelle étape · Nouvelle phase',
    })).toBeInTheDocument();
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
    expect(await screen.findByText('Brouillon enregistré.')).toBeInTheDocument();
    expect(screen.getByText('À jour')).toBeInTheDocument();
  });

  it('reprend un titre de phase Workspace puis sauvegarde une étape libre dans la Fiche process', async () => {
    const user = userEvent.setup();
    // Workspace models are shared across dossiers, unlike draft-specific steps.
    mocks.can.mockImplementation((permission) => [
      PROCESS_SHEET_PERMISSION.EDIT, PROCESS_SHEET_PERMISSION.READ,
    ].includes(permission));
    mocks.phaseTitles.mockReturnValue({
      data: { phases: [{ id: 'shared-phase-1', title: 'Cuisson' }] },
      isLoading: false,
    });
    view();
    await user.click(screen.getByRole('combobox', { name: 'Ajouter une phase' }));
    expect(mocks.phaseTitles).toHaveBeenCalledWith(
      { workspaceId: 'workspace-1' },
      expect.objectContaining({ skip: false }),
    );
    await user.click(screen.getByRole('option', { name: 'Cuisson' }));
    expect(screen.getByRole('textbox', { name: 'Titre de la phase' })).toHaveValue('Cuisson');
    await user.click(screen.getByRole('button', { name: 'Ajouter une étape' }));
    const step = screen.getByRole('article', { name: 'Étape 1' });
    await user.clear(within(step).getByRole('textbox', { name: 'Titre de l’étape' }));
    await user.type(within(step).getByRole('textbox', { name: 'Titre de l’étape' }), 'Contrôler mon four');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));

    expect(mocks.save).toHaveBeenCalledTimes(1);
    const payload = mocks.save.mock.calls[0][0];
    expect(payload).toMatchObject({
      workspaceId: 'workspace-1', dossierId: 'dossier-1',
      expectedRevision: 0, phases: [{
        title: 'Cuisson', instructions: '', steps: [{
          title: 'Contrôler mon four',
        }],
      }],
    });
    expect(payload.phases[0].steps).toHaveLength(1);
    expect(payload.phases[0].steps[0]).not.toHaveProperty('templateId');
    expect(payload.phases[0].steps[0].title).not.toBe('Opération du modèle');
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
