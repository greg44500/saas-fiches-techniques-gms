import { baseApi } from '@/services/api/base-api';

const PLATFORM_PRODUCT_API_TAG_TYPES = Object.freeze([
  'PlatformProductCatalog',
  'PlatformProductDetail',
  'PlatformProductMetadata',
]);

function compactPlatformProductParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => (
      value !== undefined
      && value !== null
      && value !== ''
    )),
  );
}

const platformProductApiBase = baseApi.enhanceEndpoints({
  addTagTypes: [...PLATFORM_PRODUCT_API_TAG_TYPES],
});

const platformProductCatalogApi = platformProductApiBase.injectEndpoints({
  endpoints: (build) => ({
    getPlatformProductMetadata: build.query({
      query: () => '/platform/products/metadata',
      transformResponse: (response) => response?.data?.metadata ?? null,
      providesTags: [{ type: 'PlatformProductMetadata', id: 'CURRENT' }],
    }),
    listPlatformProducts: build.query({
      query: ({
        status,
        categoryId,
        q,
        page = 1,
        limit = 20,
      } = {}) => ({
        url: '/platform/products',
        params: compactPlatformProductParams({
          status,
          categoryId,
          q,
          page,
          limit,
        }),
      }),
      transformResponse: (response) => ({
        products: response?.data?.products ?? [],
        pagination: response?.meta ?? null,
      }),
      providesTags: (result) => [
        { type: 'PlatformProductCatalog', id: 'LIST' },
        ...(result?.products ?? []).map((product) => ({
          type: 'PlatformProductDetail',
          id: product.id,
        })),
      ],
    }),
    getPlatformProductDetail: build.query({
      query: (productId) => '/platform/products/' + productId,
      transformResponse: (response) => response?.data ?? null,
      providesTags: (_result, _error, productId) => [
        { type: 'PlatformProductDetail', id: productId },
      ],
    }),
    createPlatformProductCategory: build.mutation({
      query: ({ name }) => ({
        url: '/platform/products/categories',
        method: 'POST',
        body: { name },
      }),
      transformResponse: (response) => response?.data?.category ?? null,
      invalidatesTags: [
        { type: 'PlatformProductMetadata', id: 'CURRENT' },
      ],
    }),
    updatePlatformProductCategory: build.mutation({
      query: ({ categoryId, name }) => ({
        url: '/platform/products/categories/' + categoryId,
        method: 'PATCH',
        body: { name },
      }),
      transformResponse: (response) => response?.data?.category ?? null,
      invalidatesTags: [
        { type: 'PlatformProductMetadata', id: 'CURRENT' },
        { type: 'PlatformProductCatalog', id: 'LIST' },
      ],
    }),
    updatePlatformProductCategoryStatus: build.mutation({
      query: ({ categoryId, status }) => ({
        url: '/platform/products/categories/' + categoryId + '/status',
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response) => response?.data?.category ?? null,
      invalidatesTags: [
        { type: 'PlatformProductMetadata', id: 'CURRENT' },
        { type: 'PlatformProductCatalog', id: 'LIST' },
      ],
    }),
    updatePlatformProduct: build.mutation({
      query: ({ productId, ...body }) => ({
        url: '/platform/products/' + productId,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response) => response?.data?.product ?? null,
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'PlatformProductCatalog', id: 'LIST' },
        { type: 'PlatformProductDetail', id: productId },
      ],
    }),
    approvePlatformProduct: build.mutation({
      query: (productId) => ({
        url: '/platform/products/' + productId + '/approve',
        method: 'POST',
      }),
      transformResponse: (response) => response?.data?.product ?? null,
      invalidatesTags: (_result, _error, productId) => [
        { type: 'PlatformProductCatalog', id: 'LIST' },
        { type: 'PlatformProductDetail', id: productId },
      ],
    }),
    rejectPlatformProduct: build.mutation({
      query: ({ productId, ...body }) => ({
        url: '/platform/products/' + productId + '/reject',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response?.data?.product ?? null,
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'PlatformProductCatalog', id: 'LIST' },
        { type: 'PlatformProductDetail', id: productId },
      ],
    }),
    updatePlatformProductStatus: build.mutation({
      query: ({ productId, status }) => ({
        url: '/platform/products/' + productId + '/status',
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response) => response?.data?.product ?? null,
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'PlatformProductCatalog', id: 'LIST' },
        { type: 'PlatformProductDetail', id: productId },
      ],
    }),
    updatePlatformProductVariant: build.mutation({
      query: ({ productId, variantId, ...body }) => ({
        url: '/platform/products/' + productId + '/variants/' + variantId,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response) => response?.data?.variant ?? null,
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'PlatformProductCatalog', id: 'LIST' },
        { type: 'PlatformProductDetail', id: productId },
      ],
    }),
    approvePlatformProductVariant: build.mutation({
      query: ({ productId, variantId }) => ({
        url: '/platform/products/' + productId + '/variants/' + variantId + '/approve',
        method: 'POST',
      }),
      transformResponse: (response) => response?.data?.variant ?? null,
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'PlatformProductCatalog', id: 'LIST' },
        { type: 'PlatformProductDetail', id: productId },
      ],
    }),
    rejectPlatformProductVariant: build.mutation({
      query: ({ productId, variantId, ...body }) => ({
        url: '/platform/products/' + productId + '/variants/' + variantId + '/reject',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response?.data?.variant ?? null,
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'PlatformProductCatalog', id: 'LIST' },
        { type: 'PlatformProductDetail', id: productId },
      ],
    }),
    updatePlatformProductVariantStatus: build.mutation({
      query: ({ productId, variantId, status }) => ({
        url: '/platform/products/' + productId + '/variants/' + variantId + '/status',
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response) => response?.data?.variant ?? null,
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'PlatformProductCatalog', id: 'LIST' },
        { type: 'PlatformProductDetail', id: productId },
      ],
    }),
  }),
});

export const {
  useApprovePlatformProductMutation,
  useApprovePlatformProductVariantMutation,
  useCreatePlatformProductCategoryMutation,
  useGetPlatformProductDetailQuery,
  useGetPlatformProductMetadataQuery,
  useLazyGetPlatformProductDetailQuery,
  useLazyListPlatformProductsQuery,
  useListPlatformProductsQuery,
  useRejectPlatformProductMutation,
  useRejectPlatformProductVariantMutation,
  useUpdatePlatformProductCategoryMutation,
  useUpdatePlatformProductCategoryStatusMutation,
  useUpdatePlatformProductMutation,
  useUpdatePlatformProductStatusMutation,
  useUpdatePlatformProductVariantMutation,
  useUpdatePlatformProductVariantStatusMutation,
} = platformProductCatalogApi;

export {
  PLATFORM_PRODUCT_API_TAG_TYPES,
  compactPlatformProductParams,
  platformProductCatalogApi,
};
