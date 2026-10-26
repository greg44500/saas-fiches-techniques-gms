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

vi.mock('@/features/process-sheets/components/process-sheet-composition-panel', () => ({
  ProcessSheetCompositionPanel: ({ technicalSheetId }) => (
    <div>Composition de {technicalSheetId}</div>
  ),
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: () => ({ workspace: { id: 'workspace-1' } }),
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
      },
      isError: false, isLoading: false, refetch: vi.fn(),
    });
  });

  it('ouvre le brouillon réel, pas une nouvelle Fiche technique', () => {
    view();
    expect(screen.getByRole('heading', { name: 'Fabrication tartine' })).toBeInTheDocument();
    expect(screen.getByText('Composition de sheet-1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Phases et étapes' })).toBeInTheDocument();
    expect(screen.getByText(/Aucune phase enregistrée/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer les phases' })).not.toBeInTheDocument();
  });

  it('ne simule pas de document quand le processus a disparu', () => {
    mocks.detail.mockReturnValue({
      data: undefined, isError: true, isLoading: false, refetch: vi.fn(),
    });
    view();
    expect(screen.getByRole('alert')).toHaveTextContent('Fiche process indisponible');
  });
});
