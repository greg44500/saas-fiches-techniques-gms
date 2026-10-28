import {
  WorkspacePermissionGate,
} from '@/features/workspace/components/workspace-permission-gate';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';
import {
  PROCESS_SHEET_PERMISSION,
} from '@/features/process-sheets/constants/process-sheet-permissions';
import {
  ProcessSheetsPage,
} from '@/features/process-sheets/pages/process-sheets-page';

function ProcessSheetsRoute() {
  return (
    <WorkspacePermissionGate
      allOf={[
        PROCESS_SHEET_PERMISSION.READ,
        TECHNICAL_SHEET_PERMISSION.READ,
      ]}
      fallback={(
        <section className="rounded-xl border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">Accès refusé</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Votre rôle ne permet pas de consulter la préparation des Fiches process.
          </p>
        </section>
      )}
    >
      <ProcessSheetsPage />
    </WorkspacePermissionGate>
  );
}

export { ProcessSheetsRoute };
