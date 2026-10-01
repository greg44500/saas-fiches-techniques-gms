import {
  REFERENCE_MANAGEMENT_ROUTE_PATH,
} from '@/features/reference-management/reference-management.constants';

const referenceManagementFrontendRouteModule = Object.freeze({
  platformRoutes: Object.freeze([
    Object.freeze({
      path: REFERENCE_MANAGEMENT_ROUTE_PATH,
      lazy: async () => {
        const { ReferenceManagementRoute } = await import(
          '@/features/reference-management/components/reference-management-route'
        );
        return { Component: ReferenceManagementRoute };
      },
    }),
  ]),
});

export { referenceManagementFrontendRouteModule };
