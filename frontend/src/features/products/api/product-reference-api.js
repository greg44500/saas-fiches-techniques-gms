import { baseApi } from '@/services/api/base-api';

const PRODUCT_REFERENCE_API_TAG_TYPES = Object.freeze([
  'ProductReferenceCatalog',
  'ProductReferenceDetail',
  'ProductReferenceMetadata',
]);

function compactProductReferenceParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => (
      value !== undefined
      && value !== null
      && value !== ''
    )),
  );
}

const productReferenceApiBase = baseApi.enhanceEndpoints({
  addTagTypes: [...PRODUCT_REFERENCE_API_TAG_TYPES],
});

const productReferenceApi = productReferenceApiBase.injectEndpoints({
  endpoints: (build) => ({
    getProductReferenceAccess: build.query({
      query: () => '/product-reference/access',
      transformResponse: (response) => response?.data?.access ?? { permissions: [] },
      providesTags: [{ type: 'ProductReferenceMetadata', id: 'ACCESS' }],
    }),
    getProductReferenceMetadata: build.query({
      query: () => '/product-reference/metadata',
      transformResponse: (response) => response?.data?.metadata ?? null,
      providesTags: [{ type: 'ProductReferenceMetadata', id: 'CURRENT' }],
    }),
    listProductReferenceProducts: build.query({
      query: ({
        status,
        categoryId,
        q,
        page = 1,
        limit = 20,
      } = {}) => ({
        url: '/product-reference',
        params: compactProductReferenceParams({
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
        { type: 'ProductReferenceCatalog', id: 'LIST' },
        ...(result?.products ?? []).map((product) => ({
          type: 'ProductReferenceDetail',
          id: product.id,
        })),
      ],
    }),
    getProductReferenceDetail: build.query({
      query: (productId) => '/product-reference/' + productId,
      transformResponse: (response) => response?.data ?? null,
      providesTags: (_result, _error, productId) => [
        { type: 'ProductReferenceDetail', id: productId },
      ],
    }),
    createProductReferenceCategory: build.mutation({
      query: ({ name }) => ({
        url: '/product-reference/categories',
        method: 'POST',
        body: { name },
      }),
      transformResponse: (response) => response?.data?.category ?? null,
      invalidatesTags: [
        { type: 'ProductReferenceMetadata', id: 'CURRENT' },
      ],
    }),
    updateProductReferenceCategory: build.mutation({
      query: ({ categoryId, name }) => ({
        url: '/product-reference/categories/' + categoryId,
        method: 'PATCH',
        body: { name },
      }),
      transformResponse: (response) => response?.data?.category ?? null,
      invalidatesTags: [
        { type: 'ProductReferenceMetadata', id: 'CURRENT' },
        { type: 'ProductReferenceCatalog', id: 'LIST' },
      ],
    }),
    updateProductReferenceCategoryStatus: build.mutation({
      query: ({ categoryId, status }) => ({
        url: '/product-reference/categories/' + categoryId + '/status',
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response) => response?.data?.category ?? null,
      invalidatesTags: [
        { type: 'ProductReferenceMetadata', id: 'CURRENT' },
        { type: 'ProductReferenceCatalog', id: 'LIST' },
      ],
    }),
    updateProductReference: build.mutation({
      query: ({ productId, ...body }) => ({
        url: '/product-reference/' + productId,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response) => response?.data?.product ?? null,
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'ProductReferenceCatalog', id: 'LIST' },
        { type: 'ProductReferenceDetail', id: productId },
      ],
    }),
    approveProductReference: build.mutation({
      query: (productId) => ({
        url: '/product-reference/' + productId + '/approve',
        method: 'POST',
      }),
      transformResponse: (response) => response?.data?.product ?? null,
      invalidatesTags: (_result, _error, productId) => [
        { type: 'ProductReferenceCatalog', id: 'LIST' },
        { type: 'ProductReferenceDetail', id: productId },
      ],
    }),
    rejectProductReference: build.mutation({
      query: ({ productId, ...body }) => ({
        url: '/product-reference/' + productId + '/reject',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response?.data?.product ?? null,
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'ProductReferenceCatalog', id: 'LIST' },
        { type: 'ProductReferenceDetail', id: productId },
      ],
    }),
    updateProductReferenceStatus: build.mutation({
      query: ({ productId, status }) => ({
        url: '/product-reference/' + productId + '/status',
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response) => response?.data?.product ?? null,
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'ProductReferenceCatalog', id: 'LIST' },
        { type: 'ProductReferenceDetail', id: productId },
      ],
    }),
    updateProductReferenceVariant: build.mutation({
      query: ({ productId, variantId, ...body }) => ({
        url: '/product-reference/' + productId + '/variants/' + variantId,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response) => response?.data?.variant ?? null,
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'ProductReferenceCatalog', id: 'LIST' },
        { type: 'ProductReferenceDetail', id: productId },
      ],
    }),
    approveProductReferenceVariant: build.mutation({
      query: ({ productId, variantId }) => ({
        url: '/product-reference/' + productId + '/variants/' + variantId + '/approve',
        method: 'POST',
      }),
      transformResponse: (response) => response?.data?.variant ?? null,
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'ProductReferenceCatalog', id: 'LIST' },
        { type: 'ProductReferenceDetail', id: productId },
      ],
    }),
    rejectProductReferenceVariant: build.mutation({
      query: ({ productId, variantId, ...body }) => ({
        url: '/product-reference/' + productId + '/variants/' + variantId + '/reject',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response?.data?.variant ?? null,
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'ProductReferenceCatalog', id: 'LIST' },
        { type: 'ProductReferenceDetail', id: productId },
      ],
    }),
    updateProductReferenceVariantStatus: build.mutation({
      query: ({ productId, variantId, status }) => ({
        url: '/product-reference/' + productId + '/variants/' + variantId + '/status',
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response) => response?.data?.variant ?? null,
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'ProductReferenceCatalog', id: 'LIST' },
        { type: 'ProductReferenceDetail', id: productId },
      ],
    }),
  }),
});

export const {
  useApprovePlatformProductMutation,
  useApprovePlatformProductVariantMutation,
  useCreatePlatformProductCategoryMutation,
  useGetProductReferenceDetailQuery,
  useGetProductReferenceAccessQuery,
  useGetProductReferenceMetadataQuery,
  useLazyGetProductReferenceDetailQuery,
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
} = productReferenceApi;

export {
  PRODUCT_REFERENCE_API_TAG_TYPES,
  compactProductReferenceParams,
  productReferenceApi,
};
