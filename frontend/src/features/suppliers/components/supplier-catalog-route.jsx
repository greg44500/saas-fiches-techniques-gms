import {
  WorkspacePermissionGate,
} from '@/features/workspace/components/workspace-permission-gate';
import {
  SUPPLIER_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  SupplierCatalogPage,
} from '@/features/suppliers/pages/supplier-catalog-page';

function SupplierCatalogAccessDenied() {
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-6">
      <h1 className="text-2xl font-semibold">Accès refusé</h1>
      <p className="text-sm text-muted-foreground">
        Votre rôle ne permet pas de consulter les catalogues fournisseur de cet espace de travail.
      </p>
    </section>
  );
}

function SupplierCatalogRoute() {
  return (
    <WorkspacePermissionGate
      fallback={<SupplierCatalogAccessDenied />}
      permission={SUPPLIER_PERMISSION.CATALOG_READ}
    >
      <SupplierCatalogPage />
    </WorkspacePermissionGate>
  );
}

export {
  SupplierCatalogAccessDenied,
  SupplierCatalogRoute,
};
