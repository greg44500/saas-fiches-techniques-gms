import { Navigate, useParams } from 'react-router';

import { ErrorState } from '@/components/shared/error-state';
import { PageLoader } from '@/components/shared/page-loader';
import { SectionTabs } from '@/components/shared/section-tabs';
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
  REFERENCE_MANAGEMENT_BASE_PATH,
  REFERENCE_MANAGEMENT_SECTION,
} from '@/features/reference-management/reference-management.constants';
import {
  useGetSupplierReferenceAccessQuery,
} from '@/features/suppliers/api/supplier-api';
import {
  SUPPLIER_REFERENCE_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  SupplierReferencePage,
} from '@/features/suppliers/pages/supplier-reference-page';

function isAccessQueryPending(query) {
  return query.isLoading
    || (query.isFetching && query.data === undefined);
}

function hasPermission(query, permission) {
  return new Set(query.data?.permissions ?? []).has(permission);
}

function ReferenceManagementRoute() {
  const { section } = useParams();
  const productAccessQuery = useGetProductReferenceAccessQuery();
  const supplierAccessQuery = useGetSupplierReferenceAccessQuery();

  if (
    isAccessQueryPending(productAccessQuery)
    || isAccessQueryPending(supplierAccessQuery)
  ) {
    return <PageLoader />;
  }

  if (productAccessQuery.isError || supplierAccessQuery.isError) {
    return (
      <div className="py-12">
        <ErrorState
          description="Les autorisations des référentiels n’ont pas pu être chargées."
          onRetry={() => {
            productAccessQuery.refetch();
            supplierAccessQuery.refetch();
          }}
          title="Gestion des référentiels indisponible"
        />
      </div>
    );
  }

  const sections = [];

  if (hasPermission(
    productAccessQuery,
    PRODUCT_REFERENCE_PERMISSION.READ,
  )) {
    sections.push({
      id: REFERENCE_MANAGEMENT_SECTION.PRODUCTS,
      label: 'Produits',
    });
  }

  if (hasPermission(
    supplierAccessQuery,
    SUPPLIER_REFERENCE_PERMISSION.READ,
  )) {
    sections.push({
      id: REFERENCE_MANAGEMENT_SECTION.SUPPLIERS,
      label: 'Fournisseurs',
    });
  }

  if (sections.length === 0) {
    return <Navigate replace to="/workspaces" />;
  }

  const activeSection = sections.some(({ id }) => id === section)
    ? section
    : sections[0].id;

  if (section !== activeSection) {
    return (
      <Navigate
        replace
        to={`${REFERENCE_MANAGEMENT_BASE_PATH}/${activeSection}`}
      />
    );
  }

  const tabItems = sections.map(({ id, label }) => ({
    label,
    to: `${REFERENCE_MANAGEMENT_BASE_PATH}/${id}`,
  }));

  return (
    <div className="space-y-6">
      <SectionTabs
        ariaLabel="Gestion des référentiels"
        items={tabItems}
      />

      {activeSection === REFERENCE_MANAGEMENT_SECTION.PRODUCTS ? (
        <ProductReferencePage
          canManage={hasPermission(
            productAccessQuery,
            PRODUCT_REFERENCE_PERMISSION.MANAGE,
          )}
        />
      ) : (
        <SupplierReferencePage
          canManage={hasPermission(
            supplierAccessQuery,
            SUPPLIER_REFERENCE_PERMISSION.MANAGE,
          )}
        />
      )}
    </div>
  );
}

export { ReferenceManagementRoute };
