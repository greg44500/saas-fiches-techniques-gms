import {
  WorkspacePermissionGate,
} from '@/features/workspace/components/workspace-permission-gate';
import { PROCESS_SHEET_PERMISSION } from '@/features/process-sheets/constants/process-sheet-permissions';
import { ProcessSheetWorkspacePage } from '@/features/process-sheets/pages/process-sheet-workspace-page';

function ProcessSheetWorkspaceRoute() {
  return (
    <WorkspacePermissionGate permission={PROCESS_SHEET_PERMISSION.READ}>
      <ProcessSheetWorkspacePage />
    </WorkspacePermissionGate>
  );
}

export { ProcessSheetWorkspaceRoute };
