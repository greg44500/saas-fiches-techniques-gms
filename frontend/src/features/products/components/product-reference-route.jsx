import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

import { ErrorState } from '@/components/shared/error-state';
import { PageLoader } from '@/components/shared/page-loader';
import { Button } from '@/components/ui/button';
import { AuthenticatedUserIdentity } from '@/features/auth/components/authenticated-user-identity';
import { useGetProductReferenceAccessQuery } from '@/features/products/api/product-reference-api';
import { PRODUCT_REFERENCE_PERMISSION } from '@/features/products/constants/product-permissions';
import { ProductReferencePage } from '@/features/products/pages/product-reference-page';

function ProductReferenceRoute() {
  const navigate = useNavigate();
  const accessQuery = useGetProductReferenceAccessQuery();
  const permissions = new Set(accessQuery.data?.permissions ?? []);

  if (
    accessQuery.isLoading
    || (accessQuery.isFetching && accessQuery.data === undefined)
  ) {
    return <PageLoader />;
  }

  if (accessQuery.isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <ErrorState
          description="Le contexte d’autorisation du référentiel Produit n’a pas pu être chargé."
          onRetry={accessQuery.refetch}
          title="Référentiel indisponible"
        />
      </div>
    );
  }

  if (!permissions.has(PRODUCT_REFERENCE_PERMISSION.READ)) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <ErrorState
          description="Votre compte ne dispose pas d’une autorisation globale Produit pour consulter ce référentiel."
          title="Accès refusé"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              onClick={() => navigate('/workspaces')}
              type="button"
              variant="ghost"
            >
              <ArrowLeft aria-hidden="true" />
              Espaces de travail
            </Button>
            <div className="hidden min-w-0 border-l border-border pl-3 sm:block">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Référentiel Produit
              </p>
              <p className="truncate font-semibold">Gouvernance métier globale</p>
            </div>
          </div>

          <AuthenticatedUserIdentity />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <ProductReferencePage
          canManage={permissions.has(PRODUCT_REFERENCE_PERMISSION.MANAGE)}
        />
      </main>
    </div>
  );
}

export { ProductReferenceRoute };
