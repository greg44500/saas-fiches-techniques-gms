import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useGetDossierTechnicalSheetSettingsQuery: mocks.getSettings,
  useUpdateDossierTechnicalSheetSettingsMutation: () => [
    mocks.updateSettings,
    { isLoading: false },
  ],
}));

import {
  DossierTechnicalSheetMarginDialog,
} from '@/features/technical-sheets/components/dossier-technical-sheet-margin-dialog';

describe('DossierTechnicalSheetMarginDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSettings.mockReturnValue({
      data: {
        defaultTargetMarginBasisPoints: 7000,
      },
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.updateSettings.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
  });

  it('modifie la marge par défaut du Dossier depuis la modale', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TooltipProvider>
        <DossierTechnicalSheetMarginDialog
          dossierId="dossier-1"
          onClose={onClose}
          open
          workspaceId="workspace-1"
        />
      </TooltipProvider>,
    );

    const input = screen.getByLabelText('Marge cible (%)');
    expect(input).toHaveValue('70');

    await user.clear(input);
    await user.type(input, '65');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(mocks.updateSettings).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      defaultTargetMarginBasisPoints: 6500,
    });
    expect(onClose).toHaveBeenCalled();
  });
});
