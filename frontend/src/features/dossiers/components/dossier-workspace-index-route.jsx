import { Navigate } from 'react-router';

import { ErrorState } from '@/components/shared/error-state';
import {
  DOSSIER_SUPPLIER_PAGE_PERMISSIONS,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

function DossierWorkspaceIndexRoute() {
  const { can, canAny } = useWorkspaceContext();

  if (canAny(DOSSIER_SUPPLIER_PAGE_PERMISSIONS)) {
    return <Navigate replace to="suppliers" />;
  }

  if (can(TECHNICAL_SHEET_PERMISSION.READ)) {
    return <Navigate replace to="technical-sheets" />;
  }

  return (
    <ErrorState
      description="Votre rôle ne donne accès à aucun module métier de ce Dossier."
      title="Aucun module accessible"
    />
  );
}

export { DossierWorkspaceIndexRoute };
