const productsFrontendRouteModule = Object.freeze({
  authenticatedRoutes: Object.freeze([
    Object.freeze({
      path: 'product-reference',
      lazy: async () => {
        const { ProductReferenceRoute } = await import(
          '@/features/products/components/product-reference-route'
        );
        return { Component: ProductReferenceRoute };
      },
    }),
  ]),
  workspaceRoutes: Object.freeze([
    Object.freeze({
      path: 'products',
      lazy: async () => {
        const { ProductsRoute } = await import(
          '@/features/products/components/products-route'
        );
        return { Component: ProductsRoute };
      },
    }),
  ]),
});

export { productsFrontendRouteModule };
