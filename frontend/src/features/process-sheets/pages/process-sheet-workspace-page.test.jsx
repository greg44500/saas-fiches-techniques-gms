import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({ detail: vi.fn() }));

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
    can: (permission) => permission === 'process-sheet:edit',
  }),
}));

import {
  ProcessSheetWorkspacePage,
} from '@/features/process-sheets/pages/process-sheet-workspace-page';

function view() {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <ProcessSheetWorkspacePage />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe('M-006 — ouverture du brouillon process', () => {
  beforeEach(() => {
    mocks.detail.mockReturnValue({
      data: {
        process: { id: 'process-1', title: 'Fabrication tartine', technicalSheetId: 'sheet-1' },
        draft: { revision: 0, phases: [] },
        sourceIngredients: { lines: [{ lineKey: 'line:1' }] },
        compositionOutdated: false,
      },
      isError: false, isLoading: false, refetch: vi.fn(),
    });
  });

  it('ouvre le brouillon réel, pas une nouvelle Fiche technique', () => {
    view();
    expect(screen.getByRole('heading', { name: 'Fabrication tartine' })).toBeInTheDocument();
    expect(screen.getByText(/Éditeur M-006 : 0/)).toBeInTheDocument();
    expect(screen.getByText(/Ingrédients : 1/)).toBeInTheDocument();
    expect(screen.getByText(/Édition : oui/)).toBeInTheDocument();
  });

  it('signale une composition M-004 modifiée sans remapper le contenu process', () => {
    mocks.detail.mockReturnValue({
      data: {
        process: {
          id: 'process-1', title: 'Fabrication tartine',
          technicalSheetId: 'sheet-1', status: 'ARCHIVED',
        },
        draft: { revision: 2, phases: [] },
        sourceIngredients: { lines: [{ lineKey: 'validation:old:index:0' }] },
        compositionOutdated: true,
      },
      isError: false, isLoading: false, refetch: vi.fn(),
    });
    view();
    expect(screen.getByRole('note')).toHaveTextContent('La composition M-004 a évolué');
    expect(screen.getByText(/Édition : non/)).toBeInTheDocument();
    expect(screen.getByText(/Ingrédients : 1/)).toBeInTheDocument();
  });

  it('ne simule pas de document quand le processus a disparu', () => {
    mocks.detail.mockReturnValue({
      data: undefined, isError: true, isLoading: false, refetch: vi.fn(),
    });
    view();
    expect(screen.getByRole('alert')).toHaveTextContent('Fiche process indisponible');
  });
});
