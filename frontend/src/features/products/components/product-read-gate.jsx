import { PRODUCT_CAPABILITY, PRODUCT_PERMISSION } from '@/features/products/constants/product-permissions';
import { WorkspaceFeatureGate } from '@/features/workspace/components/workspace-feature-gate';
import { WorkspacePermissionGate } from '@/features/workspace/components/workspace-permission-gate';

function ProductReadAccessDenied({ description }) {
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-6">
      <h1 className="text-2xl font-semibold">Accès refusé</h1>
      <p className="text-sm text-muted-foreground">
        {description}
      </p>
    </section>
  );
}

function ProductReadGate({ children }) {
  return (
    <WorkspaceFeatureGate
      fallback={(
        <ProductReadAccessDenied description="Le référentiel Produits n’est pas disponible avec les fonctionnalités actuellement actives pour cet espace de travail." />
      )}
      feature={PRODUCT_CAPABILITY.REFERENCE_ACCESS}
    >
      <WorkspacePermissionGate
        fallback={(
          <ProductReadAccessDenied description="Votre rôle ne permet pas de consulter le catalogue Produits de cet espace de travail." />
        )}
        permission={PRODUCT_PERMISSION.READ}
      >
        {children}
      </WorkspacePermissionGate>
    </WorkspaceFeatureGate>
  );
}

export { ProductReadAccessDenied, ProductReadGate };
