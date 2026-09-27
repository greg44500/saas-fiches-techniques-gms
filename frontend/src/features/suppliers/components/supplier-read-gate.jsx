import {
  WorkspacePermissionGate,
} from '@/features/workspace/components/workspace-permission-gate';
import {
  SUPPLIER_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';

function SupplierReadAccessDenied() {
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-6">
      <h1 className="text-2xl font-semibold">Accès refusé</h1>
      <p className="text-sm text-muted-foreground">
        Votre rôle ne permet pas de consulter les Fournisseurs de cet espace de travail.
      </p>
    </section>
  );
}

function SupplierReadGate({ children }) {
  return (
    <WorkspacePermissionGate
      fallback={<SupplierReadAccessDenied />}
      permission={SUPPLIER_PERMISSION.SUPPLIER_READ}
    >
      {children}
    </WorkspacePermissionGate>
  );
}

export {
  SupplierReadAccessDenied,
  SupplierReadGate,
};
