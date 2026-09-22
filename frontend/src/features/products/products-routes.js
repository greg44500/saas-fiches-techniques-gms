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
});

export { productsFrontendRouteModule };
