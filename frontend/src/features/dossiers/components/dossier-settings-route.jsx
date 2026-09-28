import {
  WorkspacePermissionGate,
} from '@/features/workspace/components/workspace-permission-gate';
import {
  SUPPLIER_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  DossierSettingsPage,
} from '@/features/dossiers/pages/dossier-settings-page';

function DossierSettingsRoute() {
  return (
    <WorkspacePermissionGate
      permission={SUPPLIER_PERMISSION.APPLICABLE_PRICE_READ}
    >
      <DossierSettingsPage />
    </WorkspacePermissionGate>
  );
}

export { DossierSettingsRoute };
