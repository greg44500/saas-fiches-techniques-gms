import {
  ErrorState,
} from '@/components/shared/error-state';
import {
  DossierReadGate,
} from '@/features/dossiers/components/dossier-read-gate';
import {
  DOSSIER_SUPPLIER_PAGE_PERMISSIONS,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  DossierSupplierPricingPage,
} from '@/features/suppliers/pages/dossier-supplier-pricing-page';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

function DossierSupplierPricingRoute() {
  const { canAny } = useWorkspaceContext();

  if (!canAny(DOSSIER_SUPPLIER_PAGE_PERMISSIONS)) {
    return (
      <ErrorState
        description="Votre rôle ne permet pas de consulter les données Fournisseurs de ce Dossier."
        title="Accès refusé"
      />
    );
  }

  return (
    <DossierReadGate>
      <DossierSupplierPricingPage />
    </DossierReadGate>
  );
}

export { DossierSupplierPricingRoute };
