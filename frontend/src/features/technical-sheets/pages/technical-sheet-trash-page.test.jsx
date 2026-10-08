import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  listTrash: vi.fn(),
  workspaceContext: vi.fn(),
}));

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useListTechnicalSheetTrashQuery: mocks.listTrash,
  useRestoreTechnicalSheetMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
  usePurgeTechnicalSheetMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
  usePurgeExpiredTechnicalSheetTrashMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
  useGetWorkspaceBusinessSettingsQuery: () => ({
    data: {
      trashRetentionDays: 30,
    },
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useUpdateWorkspaceTrashRetentionMutation: () => [
    vi.fn(),
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
  TechnicalSheetTrashPage,
} from '@/features/technical-sheets/pages/technical-sheet-trash-page';

describe('TechnicalSheetTrashPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.workspaceContext.mockReturnValue({
      can: (permission) => [
        TECHNICAL_SHEET_PERMISSION.RESTORE,
        TECHNICAL_SHEET_PERMISSION.PURGE,
        TECHNICAL_SHEET_PERMISSION.SETTINGS_MANAGE,
      ].includes(permission),
      membership: {
        role: {
          key: 'owner',
        },
      },
      workspace: {
        id: 'workspace-1',
      },
    });

    mocks.listTrash.mockReturnValue({
      data: {
        sheets: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it('reste centrée sur la Corbeille sans dupliquer le KPI de capacité', () => {
    render(
      <TooltipProvider>
        <TechnicalSheetTrashPage />
      </TooltipProvider>,
    );

    expect(screen.getByRole('heading', {
      name: 'Corbeille',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Régler la durée de conservation de la Corbeille',
    })).toBeInTheDocument();
    expect(screen.queryByText('Capacité')).not.toBeInTheDocument();
    expect(screen.getByText('Corbeille vide')).toBeInTheDocument();
    expect(screen.queryByText('Aucune Fiche technique n’attend une restauration ou une suppression définitive.')).not.toBeInTheDocument();
    expect(screen.queryByText(/Purger/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Supprimer les éléments arrivés à échéance',
    })).toBeInTheDocument();
  });
});
