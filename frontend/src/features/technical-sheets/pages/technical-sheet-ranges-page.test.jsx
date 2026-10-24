import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { TECHNICAL_SHEET_PERMISSION } from '@/features/technical-sheets/constants/technical-sheet-permissions';

const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  create: vi.fn(),
  rename: vi.fn(),
  changeStatus: vi.fn(),
  remove: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: () => ({
    can: mocks.can,
    workspace: { id: 'workspace-1' },
  }),
}));
vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));
vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useListTechnicalSheetRangesQuery: () => ({
    data: {
      ranges: [
        { id: 'range-1', name: 'Snacking', status: 'ACTIVE', revision: 0 },
        { id: 'range-2', name: 'Traiteur', status: 'ARCHIVED', revision: 1 },
      ],
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    },
    isError: false,
    isFetching: false,
  }),
  useCreateTechnicalSheetRangeMutation: () => [mocks.create, { isLoading: false }],
  useUpdateTechnicalSheetRangeMutation: () => [mocks.rename, { isLoading: false }],
  useChangeTechnicalSheetRangeStatusMutation: () => [mocks.changeStatus, { isLoading: false }],
  useDeleteTechnicalSheetRangeMutation: () => [mocks.remove, { isLoading: false }],
}));

import { TechnicalSheetRangesPage } from '@/features/technical-sheets/pages/technical-sheet-ranges-page';

function renderPage() {
  return render(
    <TooltipProvider>
      <TechnicalSheetRangesPage />
    </TooltipProvider>,
  );
}

describe('M-004 Gammes — gestion Workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.can.mockReturnValue(true);
    for (const action of [mocks.create, mocks.rename, mocks.changeStatus, mocks.remove]) {
      action.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
    }
  });

  it('affiche le référentiel commun avec les états courants', () => {
    renderPage();
    expect(screen.getByText('Snacking')).toBeInTheDocument();
    expect(screen.getByText('Traiteur')).toBeInTheDocument();
    expect(screen.getByText('Archivée')).toBeInTheDocument();
  });

  it('crée une gamme après saisie et validation', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText('Nouvelle gamme'), 'Pâtisserie');
    await user.click(screen.getByRole('button', { name: 'Créer la gamme' }));
    expect(mocks.create).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      name: 'Pâtisserie',
    });
  });

  it('refuse les fonctions d’administration en lecture seule', () => {
    mocks.can.mockImplementation((permission) =>
      permission === TECHNICAL_SHEET_PERMISSION.READ);
    renderPage();
    expect(screen.queryByRole('button', { name: 'Créer la gamme' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument();
  });
});
