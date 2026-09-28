import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

import {
  ErrorState,
} from '@/components/shared/error-state';
import {
  PageLoader,
} from '@/components/shared/page-loader';
import { Button } from '@/components/ui/button';
import {
  AuthenticatedUserIdentity,
} from '@/features/auth/components/authenticated-user-identity';
import {
  useGetSupplierReferenceAccessQuery,
} from '@/features/suppliers/api/supplier-api';
import {
  SUPPLIER_REFERENCE_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  SupplierReferencePage,
} from '@/features/suppliers/pages/supplier-reference-page';

function SupplierReferenceRoute() {
  const navigate = useNavigate();
  const accessQuery =
    useGetSupplierReferenceAccessQuery();
  const permissions = new Set(
    accessQuery.data?.permissions ?? [],
  );

  if (
    accessQuery.isLoading
    || (
      accessQuery.isFetching
      && accessQuery.data === undefined
    )
  ) {
    return <PageLoader />;
  }

  if (accessQuery.isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <ErrorState
          description="Le contexte d’autorisation du référentiel Fournisseurs n’a pas pu être chargé."
          onRetry={accessQuery.refetch}
          title="Référentiel indisponible"
        />
      </div>
    );
  }

  if (
    !permissions.has(
      SUPPLIER_REFERENCE_PERMISSION.READ,
    )
  ) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <ErrorState
          description="Votre compte ne dispose pas d’une autorisation globale Fournisseurs."
          title="Accès refusé"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <Button
            onClick={() => navigate('/workspaces')}
            type="button"
            variant="ghost"
          >
            <ArrowLeft aria-hidden="true" />
            Espaces de travail
          </Button>
          <AuthenticatedUserIdentity />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <SupplierReferencePage
          canManage={permissions.has(
            SUPPLIER_REFERENCE_PERMISSION.MANAGE,
          )}
        />
      </main>
    </div>
  );
}

export { SupplierReferenceRoute };
