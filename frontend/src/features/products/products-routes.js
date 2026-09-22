const productsFrontendRouteModule = Object.freeze({
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
  platformRoutes: Object.freeze([
    Object.freeze({
      path: 'products',
      lazy: async () => {
        const { PlatformProductsRoute } = await import(
          '@/features/products/components/platform-products-route'
        );
        return { Component: PlatformProductsRoute };
      },
    }),
  ]),
});

export { productsFrontendRouteModule };
