import { WorkspacePermissionGate } from '@/features/workspace/components/workspace-permission-gate';
import { PRODUCT_PERMISSION } from '@/features/products/constants/product-permissions';

function ProductReadAccessDenied() {
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-6">
      <h1 className="text-2xl font-semibold">Accès refusé</h1>
      <p className="text-sm text-muted-foreground">
        Votre rôle ne permet pas de consulter le catalogue Produits de cet espace de travail.
      </p>
    </section>
  );
}

function ProductReadGate({ children }) {
  return (
    <WorkspacePermissionGate
      fallback={<ProductReadAccessDenied />}
      permission={PRODUCT_PERMISSION.READ}
    >
      {children}
    </WorkspacePermissionGate>
  );
}

export { ProductReadAccessDenied, ProductReadGate };
