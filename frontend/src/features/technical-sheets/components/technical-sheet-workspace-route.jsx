import {
  TechnicalSheetReadGate,
} from '@/features/technical-sheets/components/technical-sheet-read-gate';
import {
  TechnicalSheetWorkspacePage,
} from '@/features/technical-sheets/pages/technical-sheet-workspace-page';

function TechnicalSheetWorkspaceRoute() {
  return (
    <TechnicalSheetReadGate>
      <TechnicalSheetWorkspacePage />
    </TechnicalSheetReadGate>
  );
}

export { TechnicalSheetWorkspaceRoute };
