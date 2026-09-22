import { ErrorState } from '@/components/shared/error-state';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';
import { PlatformTablePageSkeleton } from '@/features/platform/components/platform-loading-skeletons';
import { PLATFORM_PRODUCT_PERMISSION } from '@/features/products/constants/product-permissions';
import { PlatformProductsPage } from '@/features/products/pages/platform-products-page';

function PlatformProductsRoute() {
  const contextQuery = useGetCurrentPlatformContextQuery();
  const permissions = new Set(contextQuery.data?.permissions ?? []);

  if (contextQuery.isLoading || (contextQuery.isFetching && contextQuery.data === undefined)) {
    return <PlatformTablePageSkeleton columns={5} showFilters />;
  }

  if (contextQuery.isError || !permissions.has(PLATFORM_PRODUCT_PERMISSION.READ)) {
    return (
      <ErrorState
        description="Votre accès Platform ne permet pas de consulter la gouvernance du référentiel Produits."
        title="Accès refusé"
      />
    );
  }

  return (
    <PlatformProductsPage
      canManage={permissions.has(PLATFORM_PRODUCT_PERMISSION.MANAGE)}
    />
  );
}

export { PlatformProductsRoute };
