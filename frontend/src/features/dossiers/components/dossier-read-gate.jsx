import { WorkspacePermissionGate } from '@/features/workspace/components/workspace-permission-gate';
import { DOSSIER_PERMISSION } from '@/features/dossiers/constants/dossier-permissions';

function DossierReadAccessDenied() {
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-6">
      <h1 className="text-2xl font-semibold">Accès refusé</h1>
      <p className="text-sm text-muted-foreground">
        Votre rôle ne permet pas de consulter les dossiers de ce workspace.
      </p>
    </section>
  );
}

function DossierReadGate({ children }) {
  return (
    <WorkspacePermissionGate
      fallback={<DossierReadAccessDenied />}
      permission={DOSSIER_PERMISSION.READ}
    >
      {children}
    </WorkspacePermissionGate>
  );
}

export { DossierReadAccessDenied, DossierReadGate };
