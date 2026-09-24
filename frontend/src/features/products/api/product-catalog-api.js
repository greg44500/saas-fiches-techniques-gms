import { baseApi } from '@/services/api/base-api';
import { PRODUCT_API_TAG_TYPES } from '@/features/products/api/product-api-tags';

const productCatalogApiBase = baseApi.enhanceEndpoints({
  addTagTypes: [...PRODUCT_API_TAG_TYPES],
});

const productCatalogApi = productCatalogApiBase.injectEndpoints({
  endpoints: (builder) => ({
    getProductMetadata: builder.query({
      query: (workspaceId) => ({
        url: '/workspaces/' + workspaceId + '/products/metadata',
      }),
      transformResponse: (response) => response.data.metadata,
      providesTags: ['ProductCatalog'],
    }),
    getProductSummary: builder.query({
      query: (workspaceId) => ({
        url: '/workspaces/' + workspaceId + '/products/summary',
      }),
      transformResponse: (response) => response.data.summary,
      providesTags: ['ProductCatalog'],
    }),
    searchProducts: builder.query({
      query: ({
        workspaceId,
        scope = 'WORKSPACE',
        q,
        categoryId,
        status,
        conservationType,
        foodRange,
        sort = 'NAME',
        page = 1,
        limit = 20,
      }) => ({
        url: '/workspaces/' + workspaceId + '/products/search',
        params: {
          scope,
          q,
          categoryId,
          status,
          conservationType,
          foodRange,
          sort,
          page,
          limit,
        },
      }),
      transformResponse: (response) => ({
        results: response.data.results,
        pagination: response.meta,
      }),
      providesTags: ['ProductCatalog'],
    }),
    getProductDimensions: builder.query({
      query: ({ workspaceId, productId }) => ({
        url: '/workspaces/' + workspaceId + '/products/' + productId + '/dimensions',
      }),
      transformResponse: (response) => response.data,
      providesTags: ['ProductCatalog', 'ProductReference'],
    }),
    getWorkspaceProductDetail: builder.query({
      query: ({ workspaceId, productId }) => ({
        url: '/workspaces/' + workspaceId + '/products/' + productId,
      }),
      transformResponse: (response) => response.data,
      providesTags: ['ProductCatalog'],
    }),
    duplicateCheckProduct: builder.mutation({
      query: ({ workspaceId, name, aliases }) => ({
        url: '/workspaces/' + workspaceId + '/products/duplicate-check',
        method: 'POST',
        body: { name, aliases },
      }),
      transformResponse: (response) => response.data,
    }),
    createProduct: builder.mutation({
      query: ({ workspaceId, ...body }) => ({
        url: '/workspaces/' + workspaceId + '/products',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['ProductCatalog', 'ProductReference'],
    }),
    contributeProductReference: builder.mutation({
      query: ({ workspaceId, ...body }) => ({
        url: '/workspaces/' + workspaceId + '/products/contributions',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['ProductCatalog', 'ProductReference'],
    }),
    createVariant: builder.mutation({
      query: ({ workspaceId, productId, ...body }) => ({
        url: '/workspaces/' + workspaceId + '/products/' + productId + '/variants',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['ProductCatalog', 'ProductReference'],
    }),
    attachProductVariant: builder.mutation({
      query: ({ workspaceId, variantId }) => ({
        url: '/workspaces/' + workspaceId + '/products/catalog/' + variantId,
        method: 'PUT',
      }),
      transformResponse: (response) => response.data.workspaceEntry,
      invalidatesTags: ['ProductCatalog'],
    }),
    archiveProductVariant: builder.mutation({
      query: ({ workspaceId, variantId }) => ({
        url: '/workspaces/' + workspaceId + '/products/catalog/' + variantId,
        method: 'DELETE',
      }),
      transformResponse: (response) => response.data.workspaceEntry,
      invalidatesTags: ['ProductCatalog'],
    }),
    inspectProductImport: builder.mutation({
      query: ({ workspaceId, file }) => {
        const body = new FormData();
        body.append('file', file);

        return {
          url: '/workspaces/' + workspaceId + '/products/imports/inspect',
          method: 'POST',
          body,
        };
      },
      transformResponse: (response) => response.data,
    }),
    previewProductImport: builder.mutation({
      query: ({ workspaceId, importId, mapping, defaults }) => ({
        url: '/workspaces/' + workspaceId + '/products/imports/' + importId + '/preview',
        method: 'POST',
        body: { mapping, defaults },
      }),
      transformResponse: (response) => response.data,
    }),
    commitProductImport: builder.mutation({
      query: ({ workspaceId, importId, decisions }) => ({
        url: '/workspaces/' + workspaceId + '/products/imports/' + importId + '/commit',
        method: 'POST',
        body: { decisions },
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['ProductCatalog', 'ProductReference'],
    }),
  }),
});

export const {
  useArchiveProductVariantMutation,
  useAttachProductVariantMutation,
  useCommitProductImportMutation,
  useContributeProductReferenceMutation,
  useCreateProductMutation,
  useCreateVariantMutation,
  useDuplicateCheckProductMutation,
  useGetProductDimensionsQuery,
  useGetProductMetadataQuery,
  useGetProductSummaryQuery,
  useGetWorkspaceProductDetailQuery,
  useInspectProductImportMutation,
  useLazyGetWorkspaceProductDetailQuery,
  usePreviewProductImportMutation,
  useSearchProductsQuery,
} = productCatalogApi;

export { productCatalogApi };
