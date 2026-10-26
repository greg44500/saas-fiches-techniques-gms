import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

vi.mock('@/features/technical-sheets/components/technical-sheet-range-search', () => ({
  TechnicalSheetRangeSearch: () => <div>Recherche prédictive des gammes</div>,
}));
import { TECHNICAL_SHEET_PERMISSION } from '@/features/technical-sheets/constants/technical-sheet-permissions';

const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  create: vi.fn(),
  rename: vi.fn(),
  changeStatus: vi.fn(),
  remove: vi.fn(),
  suggest: vi.fn(),
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
  useGetTechnicalSheetRangeSuggestionsQuery: (args, options) => (
    options.skip ? { currentData: null, isError: false, isFetching: false }
      : mocks.suggest(args)
  ),
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
    mocks.suggest.mockReturnValue({
      currentData: { exactMatch: null, candidates: [] },
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    for (const action of [mocks.create, mocks.rename, mocks.changeStatus, mocks.remove]) {
      action.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
    }
  });

  it('affiche le référentiel commun avec les états courants', () => {
    renderPage();
    expect(screen.getByText('Snacking')).toBeInTheDocument();
    expect(screen.getByText('Traiteur')).toBeInTheDocument();
    expect(screen.getByText('Archivée')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gamme de produits finis' }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'À propos des gammes de produits finis' }))
      .toBeInTheDocument();
    expect(screen.getByText('Recherche prédictive des gammes')).toBeInTheDocument();
  });

  it('crée une gamme après saisie et validation', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.queryByLabelText('Nouvelle gamme')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Créer une gamme' }));
    expect(await screen.findByRole('dialog', { name: 'Créer une gamme' })).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Nom de la gamme' }), 'Pâtisserie');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Créer la gamme' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Créer la gamme' }));
    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledWith({
        workspaceId: 'workspace-1',
        name: 'Pâtisserie',
        reviewedCandidateIds: [],
      });
    });
  });

  it('conserve la Gamme et le dialogue quand la suppression est refusée par le serveur', async () => {
    const user = userEvent.setup();
    const refusal = 'Cette Gamme est encore associée à des Fiches techniques.';
    mocks.remove.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({ data: { message: refusal } }),
    });

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Actions de Traiteur' }));
    await user.click(screen.getByRole('button', { name: 'Supprimer définitivement' }));

    const dialog = screen.getByRole('dialog', { name: /Supprimer « Traiteur »/ });
    await user.click(within(dialog).getByRole('button', {
      name: 'Supprimer définitivement',
    }));

    expect(mocks.remove).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      rangeId: 'range-2',
      expectedRevision: 1,
    });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({
      title: 'Suppression impossible',
      description: refusal,
      variant: 'destructive',
    }));
    expect(dialog).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));
    expect(screen.getByText('Traiteur')).toBeInTheDocument();
    expect(screen.getByText('Archivée')).toBeInTheDocument();
  });

  it('refuse les fonctions d’administration en lecture seule', () => {
    mocks.can.mockImplementation((permission) =>
      permission === TECHNICAL_SHEET_PERMISSION.READ);
    renderPage();
    expect(screen.queryByRole('button', { name: 'Créer une gamme' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Créer la gamme' })).not.toBeInTheDocument();
    expect(screen.getByText(/Vous pouvez consulter les gammes/)).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument();
  });
});
