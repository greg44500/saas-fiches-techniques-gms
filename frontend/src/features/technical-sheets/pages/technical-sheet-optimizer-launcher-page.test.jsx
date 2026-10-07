import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  startDraft: vi.fn(),
}));

vi.mock('react-router', () => ({
  useNavigate: () =>
    mocks.navigate,
}));

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/features/dossiers/api/dossiers-api', () => ({
  useListDossiersQuery: () => ({
    data: {
      dossiers: [{
        id: 'dossier-1',
        name: 'Magasin A',
      }],
    },
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useListTechnicalSheetsQuery: (_args, options) => (
    options?.skip
      ? {
        data: undefined,
        isError: false,
        isLoading: false,
        refetch: vi.fn(),
      }
      : {
        data: {
          sheets: [{
            id: 'sheet-1',
            name: 'Purée de carottes',
            status: 'ACTIVE',
            hasDraft: true,
            currentValidatedStateId: null,
            revision: 3,
          }],
        },
        isError: false,
        isLoading: false,
        refetch: vi.fn(),
      }
  ),
  useStartTechnicalSheetDraftMutation: () => [
    mocks.startDraft,
  ],
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: () => ({
    can: () => true,
    hasFeature: () => true,
    workspace: {
      id: 'workspace-1',
    },
  }),
}));

import {
  TechnicalSheetOptimizerLauncherPage,
} from '@/features/technical-sheets/pages/technical-sheet-optimizer-launcher-page';

describe('TechnicalSheetOptimizerLauncherPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.startDraft.mockReturnValue({
      unwrap: vi.fn()
        .mockResolvedValue({}),
    });
  });

  it('ouvre le même Atelier canonique depuis la sidebar Workspace', async () => {
    const user =
      userEvent.setup();

    render(
      <TechnicalSheetOptimizerLauncherPage />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Atelier d’optimisation',
      }),
    ).toBeInTheDocument();

    await user.click(
      await screen.findByRole(
        'button',
        {
          name:
            /Optimiser/,
        },
      ),
    );

    expect(
      mocks.navigate,
    ).toHaveBeenCalledWith(
      '/workspaces/workspace-1/dossiers/dossier-1/technical-sheets/sheet-1/optimization',
    );
    expect(
      mocks.startDraft,
    ).not.toHaveBeenCalled();
  });
});
