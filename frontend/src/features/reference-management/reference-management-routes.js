const referenceManagementFrontendRouteModule = Object.freeze({
  authenticatedRoutes: Object.freeze([
    Object.freeze({
      path: 'reference-management/:section?',
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
