import { baseApi } from '@/services/api/base-api';
import { PRODUCT_API_TAG_TYPES } from '@/features/products/api/product-api-tags';

const productReferenceApiBase = baseApi.enhanceEndpoints({
  addTagTypes: [...PRODUCT_API_TAG_TYPES],
});

const productReferenceApi = productReferenceApiBase.injectEndpoints({
  endpoints: (builder) => ({
    getProductReferenceAccess: builder.query({
      query: () => ({
        url: '/product-reference/access',
      }),
      transformResponse: (response) => response.data.access,
      providesTags: ['ProductReference'],
    }),
    getProductReferenceMetadata: builder.query({
      query: () => ({
        url: '/product-reference/metadata',
      }),
      transformResponse: (response) => response.data.metadata,
      providesTags: ['ProductReference'],
    }),
    listProductReferenceProducts: builder.query({
      query: ({
        status,
        categoryId,
        q,
        page = 1,
        limit = 20,
      }) => ({
        url: '/product-reference',
        params: {
          status,
          categoryId,
          q,
          page,
          limit,
        },
      }),
      transformResponse: (response) => ({
        products: response.data.products,
        pagination: response.meta,
      }),
      providesTags: ['ProductReference'],
    }),
    getProductReferenceDetail: builder.query({
      query: (productId) => ({
        url: '/product-reference/' + productId,
      }),
      transformResponse: (response) => response.data,
      providesTags: ['ProductReference'],
    }),
    duplicateCheckProductReference: builder.mutation({
      query: ({ name, aliases }) => ({
        url: '/product-reference/duplicate-check',
        method: 'POST',
        body: { name, aliases },
      }),
      transformResponse: (response) => response.data,
    }),
    createProductReference: builder.mutation({
      query: (body) => ({
        url: '/product-reference',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['ProductReference', 'ProductCatalog'],
    }),
    createProductReferenceVariant: builder.mutation({
      query: ({ productId, ...body }) => ({
        url: '/product-reference/' + productId + '/variants',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['ProductReference', 'ProductCatalog'],
    }),
    createProductReferenceCategory: builder.mutation({
      query: (body) => ({
        url: '/product-reference/categories',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data.category,
      invalidatesTags: ['ProductReference'],
    }),
    updateProductReferenceCategory: builder.mutation({
      query: ({ categoryId, ...body }) => ({
        url: '/product-reference/categories/' + categoryId,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response) => response.data.category,
      invalidatesTags: ['ProductReference'],
    }),
    updateProductReferenceCategoryStatus: builder.mutation({
      query: ({ categoryId, status }) => ({
        url: '/product-reference/categories/' + categoryId + '/status',
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response) => response.data.category,
      invalidatesTags: ['ProductReference'],
    }),
    updateProductReference: builder.mutation({
      query: ({ productId, ...body }) => ({
        url: '/product-reference/' + productId,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response) => response.data.product,
      invalidatesTags: ['ProductReference', 'ProductCatalog'],
    }),
    updateProductReferenceStatus: builder.mutation({
      query: ({ productId, status }) => ({
        url: '/product-reference/' + productId + '/status',
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response) => response.data.product,
      invalidatesTags: ['ProductReference', 'ProductCatalog'],
    }),
    updateProductReferenceVariant: builder.mutation({
      query: ({ productId, variantId, ...body }) => ({
        url: '/product-reference/' + productId + '/variants/' + variantId,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response) => response.data.variant,
      invalidatesTags: ['ProductReference', 'ProductCatalog'],
    }),
    updateProductReferenceVariantStatus: builder.mutation({
      query: ({ productId, variantId, status }) => ({
        url: '/product-reference/' + productId + '/variants/' + variantId + '/status',
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response) => response.data.variant,
      invalidatesTags: ['ProductReference', 'ProductCatalog'],
    }),
    inspectProductReferenceImport: builder.mutation({
      query: ({ file }) => {
        const body = new FormData();
        body.append('file', file);

        return {
          url: '/product-reference/imports/inspect',
          method: 'POST',
          body,
        };
      },
      transformResponse: (response) => response.data,
    }),
    previewProductReferenceImport: builder.mutation({
      query: ({ importId, mapping, defaults }) => ({
        url: '/product-reference/imports/' + importId + '/preview',
        method: 'POST',
        body: { mapping, defaults },
      }),
      transformResponse: (response) => response.data,
    }),
    commitProductReferenceImport: builder.mutation({
      query: ({ importId, decisions }) => ({
        url: '/product-reference/imports/' + importId + '/commit',
        method: 'POST',
        body: { decisions },
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['ProductReference', 'ProductCatalog'],
    }),
  }),
});

export const {
  useCommitProductReferenceImportMutation,
  useCreateProductReferenceCategoryMutation,
  useCreateProductReferenceMutation,
  useCreateProductReferenceVariantMutation,
  useDuplicateCheckProductReferenceMutation,
  useGetProductReferenceAccessQuery,
  useGetProductReferenceDetailQuery,
  useGetProductReferenceMetadataQuery,
  useInspectProductReferenceImportMutation,
  useLazyGetProductReferenceDetailQuery,
  useListProductReferenceProductsQuery,
  usePreviewProductReferenceImportMutation,
  useUpdateProductReferenceCategoryMutation,
  useUpdateProductReferenceCategoryStatusMutation,
  useUpdateProductReferenceMutation,
  useUpdateProductReferenceStatusMutation,
  useUpdateProductReferenceVariantMutation,
  useUpdateProductReferenceVariantStatusMutation,
} = productReferenceApi;

export { productReferenceApi };
