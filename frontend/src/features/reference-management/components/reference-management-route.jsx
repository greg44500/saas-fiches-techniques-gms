import { ArrowLeft } from 'lucide-react';
import {
  Navigate,
  useNavigate,
  useParams,
} from 'react-router';

import { ErrorState } from '@/components/shared/error-state';
import { PageLoader } from '@/components/shared/page-loader';
import { SectionTabs } from '@/components/shared/section-tabs';
import { Button } from '@/components/ui/button';
import {
  AuthenticatedUserIdentity,
} from '@/features/auth/components/authenticated-user-identity';
import {
  useGetProductReferenceAccessQuery,
} from '@/features/products/api/product-reference-api';
import {
  PRODUCT_REFERENCE_PERMISSION,
} from '@/features/products/constants/product-permissions';
import {
  ProductReferencePage,
} from '@/features/products/pages/product-reference-page';
import {
  useGetSupplierReferenceAccessQuery,
} from '@/features/suppliers/api/supplier-api';
import {
  SUPPLIER_REFERENCE_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  SupplierReferencePage,
} from '@/features/suppliers/pages/supplier-reference-page';

const REFERENCE_MANAGEMENT_SECTION = Object.freeze({
  PRODUCTS: 'products',
  SUPPLIERS: 'suppliers',
});

function isInitialAccessLoading(query) {
  return query.isLoading
    || (query.isFetching && query.data === undefined);
}

function ReferenceManagementRoute() {
  const navigate = useNavigate();
  const { section } = useParams();
  const productAccessQuery = useGetProductReferenceAccessQuery();
  const supplierAccessQuery = useGetSupplierReferenceAccessQuery();

  if (
    isInitialAccessLoading(productAccessQuery)
    || isInitialAccessLoading(supplierAccessQuery)
  ) {
    return <PageLoader />;
  }

  const productPermissions = new Set(
    productAccessQuery.data?.permissions ?? [],
  );
  const supplierPermissions = new Set(
    supplierAccessQuery.data?.permissions ?? [],
  );

  const canReadProducts = productPermissions.has(
    PRODUCT_REFERENCE_PERMISSION.READ,
  );
  const canReadSuppliers = supplierPermissions.has(
    SUPPLIER_REFERENCE_PERMISSION.READ,
  );

  const availableSections = [
    ...(canReadProducts
      ? [{
        key: REFERENCE_MANAGEMENT_SECTION.PRODUCTS,
        label: 'Produits',
        to: '/reference-management/products',
      }]
      : []),
    ...(canReadSuppliers
      ? [{
        key: REFERENCE_MANAGEMENT_SECTION.SUPPLIERS,
        label: 'Fournisseurs',
        to: '/reference-management/suppliers',
      }]
      : []),
  ];

  if (availableSections.length === 0) {
    const hasAccessError = (
      productAccessQuery.isError
      || supplierAccessQuery.isError
    );

    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <ErrorState
          description={
            hasAccessError
              ? 'Le contexte d’autorisation des référentiels n’a pas pu être chargé.'
              : 'Votre compte ne dispose d’aucune autorisation globale pour consulter les référentiels métier.'
          }
          onRetry={
            hasAccessError
              ? () => {
                if (productAccessQuery.isError) {
                  productAccessQuery.refetch();
                }
                if (supplierAccessQuery.isError) {
                  supplierAccessQuery.refetch();
                }
              }
              : undefined
          }
          title={hasAccessError ? 'Référentiels indisponibles' : 'Accès refusé'}
        />
      </div>
    );
  }

  const activeSection = availableSections.find(
    (item) => item.key === section,
  );

  if (!activeSection) {
    return (
      <Navigate
        replace
        to={availableSections[0].to}
      />
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
                Gestion des référentiels
              </p>
              <p className="truncate font-semibold">
                Gouvernance métier globale
              </p>
            </div>
          </div>

          <AuthenticatedUserIdentity />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-semibold tracking-tight">
              Gestion des référentiels
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gérez les référentiels métier globaux auxquels votre compte est autorisé.
            </p>
          </header>

          <SectionTabs
            ariaLabel="Gestion des référentiels"
            items={availableSections.map(({ label, to }) => ({
              label,
              to,
            }))}
          />

          {section === REFERENCE_MANAGEMENT_SECTION.PRODUCTS && (
            <ProductReferencePage
              canManage={productPermissions.has(
                PRODUCT_REFERENCE_PERMISSION.MANAGE,
              )}
              embedded
            />
          )}

          {section === REFERENCE_MANAGEMENT_SECTION.SUPPLIERS && (
            <SupplierReferencePage
              canManage={supplierPermissions.has(
                SUPPLIER_REFERENCE_PERMISSION.MANAGE,
              )}
              embedded
            />
          )}
        </div>
      </main>
    </div>
  );
}

export {
  REFERENCE_MANAGEMENT_SECTION,
  ReferenceManagementRoute,
};
