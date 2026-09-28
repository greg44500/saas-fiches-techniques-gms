import {
  TechnicalSheetReadGate,
} from '@/features/technical-sheets/components/technical-sheet-read-gate';
import {
  TechnicalSheetSettingsPage,
} from '@/features/technical-sheets/pages/technical-sheet-settings-page';

function TechnicalSheetSettingsRoute() {
  return (
    <TechnicalSheetReadGate>
      <TechnicalSheetSettingsPage />
    </TechnicalSheetReadGate>
  );
}

export { TechnicalSheetSettingsRoute };
