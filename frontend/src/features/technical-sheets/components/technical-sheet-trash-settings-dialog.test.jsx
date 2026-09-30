import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  updateRetention: vi.fn(),
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

import {
  TechnicalSheetTrashSettingsDialog,
} from '@/features/technical-sheets/components/technical-sheet-trash-settings-dialog';

describe('TechnicalSheetTrashSettingsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSettings.mockReturnValue({
      data: {
        trashRetentionDays: 30,
      },
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.updateRetention.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
  });

  it('configure la durée de conservation depuis la Corbeille', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TooltipProvider>
        <TechnicalSheetTrashSettingsDialog
          onClose={onClose}
          open
          workspaceId="workspace-1"
        />
      </TooltipProvider>,
    );

    const input = screen.getByLabelText('Durée de conservation (jours)');
    expect(input).toHaveValue(30);

    await user.clear(input);
    await user.type(input, '45');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(mocks.updateRetention).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      trashRetentionDays: 45,
    });
    expect(onClose).toHaveBeenCalled();
  });
});
