import { ErrorState } from '@/components/shared/error-state';
import {
  SUPPLIER_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  DossierSettingsPage,
} from '@/features/dossiers/pages/dossier-settings-page';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

function DossierSettingsRoute() {
  const { can } = useWorkspaceContext();

  if (!can(SUPPLIER_PERMISSION.APPLICABLE_PRICE_READ)) {
    return (
      <ErrorState
        description="Votre rôle ne permet pas de consulter les paramètres communs des Dossiers."
        title="Accès refusé"
      />
    );
  }

  return <DossierSettingsPage />;
}

export { DossierSettingsRoute };
