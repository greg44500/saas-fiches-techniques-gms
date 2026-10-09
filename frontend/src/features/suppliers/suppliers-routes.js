const dossierSupplierFrontendRoutes = Object.freeze([
  Object.freeze({
    path: 'suppliers',
    lazy: async () => {
      const { DossierSupplierPricingRoute } = await import(
        '@/features/suppliers/components/dossier-supplier-pricing-route'
      );
      return { Component: DossierSupplierPricingRoute };
    },
  }),
]);

const suppliersFrontendRouteModule = Object.freeze({
  authenticatedRoutes: Object.freeze([
    Object.freeze({
      path: 'supplier-reference',
      lazy: async () => {
        const { SupplierReferenceRoute } = await import(
          '@/features/suppliers/components/supplier-reference-route'
        );
        return { Component: SupplierReferenceRoute };
      },
    }),
  ]),
  workspaceRoutes: Object.freeze([
    Object.freeze({
      path: 'suppliers',
      lazy: async () => {
        const { SuppliersRoute } = await import(
          '@/features/suppliers/components/suppliers-route'
        );
        return { Component: SuppliersRoute };
      },
    }),
    Object.freeze({
      path: 'suppliers/catalogs/:catalogId',
      lazy: async () => {
        const { SupplierCatalogRoute } = await import(
          '@/features/suppliers/components/supplier-catalog-route'
        );
        return { Component: SupplierCatalogRoute };
      },
    }),
  ]),
});

export {
  dossierSupplierFrontendRoutes,
  suppliersFrontendRouteModule,
};
