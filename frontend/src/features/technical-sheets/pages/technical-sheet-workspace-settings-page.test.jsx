import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  updateRetention: vi.fn(),
  workspaceContext: vi.fn(),
}));

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useGetWorkspaceBusinessSettingsQuery: mocks.getSettings,
  useUpdateWorkspaceTrashRetentionMutation: () => [
    mocks.updateRetention,
    { isLoading: false },
  ],
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: mocks.workspaceContext,
}));

import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';
import {
  TechnicalSheetWorkspaceSettingsPage,
} from '@/features/technical-sheets/pages/technical-sheet-workspace-settings-page';

function renderPage() {
  return render(
    <TooltipProvider>
      <TechnicalSheetWorkspaceSettingsPage />
    </TooltipProvider>,
  );
}

describe('TechnicalSheetWorkspaceSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.workspaceContext.mockReturnValue({
      can: (permission) => (
        permission === TECHNICAL_SHEET_PERMISSION.SETTINGS_MANAGE
      ),
      membership: {
        role: {
          key: 'owner',
        },
      },
      workspace: {
        id: 'workspace-1',
      },
    });

    mocks.getSettings.mockReturnValue({
      data: {
        trashRetentionDays: 30,
      },
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    mocks.updateRetention.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        trashRetentionDays: 45,
      }),
    });
  });

  it('affiche le réglage Workspace dans Paramètres des Dossiers', () => {
    renderPage();

    expect(screen.getByRole('heading', {
      name: 'Paramètres des Dossiers',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'À propos des paramètres des Dossiers',
    })).toBeInTheDocument();
    expect(screen.getByLabelText('Durée de conservation (jours)'))
      .toHaveValue(30);
  });

  it('enregistre une nouvelle durée de conservation', async () => {
    const user = userEvent.setup();

    renderPage();

    const input = screen.getByLabelText('Durée de conservation (jours)');
    await user.clear(input);
    await user.type(input, '45');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(mocks.updateRetention).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      trashRetentionDays: 45,
    });
  });

  it('refuse la surface aux membres qui ne sont pas Owner', () => {
    mocks.workspaceContext.mockReturnValue({
      can: () => true,
      membership: {
        role: {
          key: 'member',
        },
      },
      workspace: {
        id: 'workspace-1',
      },
    });

    renderPage();

    expect(screen.getByRole('heading', {
      name: 'Accès refusé',
    })).toBeInTheDocument();
  });
});
