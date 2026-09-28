import {
  TechnicalSheetReadGate,
} from '@/features/technical-sheets/components/technical-sheet-read-gate';
import {
  TechnicalSheetWorkspaceSettingsPage,
} from '@/features/technical-sheets/pages/technical-sheet-workspace-settings-page';

function TechnicalSheetWorkspaceSettingsRoute() {
  return (
    <TechnicalSheetReadGate>
      <TechnicalSheetWorkspaceSettingsPage />
    </TechnicalSheetReadGate>
  );
}

export { TechnicalSheetWorkspaceSettingsRoute };
