import {
  WorkspacePermissionGate,
} from '@/features/workspace/components/workspace-permission-gate';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';

function TechnicalSheetReadAccessDenied() {
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-6">
      <h1 className="text-2xl font-semibold">Accès refusé</h1>
      <p className="text-sm text-muted-foreground">
        Votre rôle ne permet pas de consulter les Fiches techniques de cet espace de travail.
      </p>
    </section>
  );
}

function TechnicalSheetReadGate({ children }) {
  return (
    <WorkspacePermissionGate
      fallback={<TechnicalSheetReadAccessDenied />}
      permission={TECHNICAL_SHEET_PERMISSION.READ}
    >
      {children}
    </WorkspacePermissionGate>
  );
}

export {
  TechnicalSheetReadAccessDenied,
  TechnicalSheetReadGate,
};
