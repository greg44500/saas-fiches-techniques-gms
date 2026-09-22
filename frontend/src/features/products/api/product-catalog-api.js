import { baseApi } from '@/services/api/base-api';

const PRODUCT_API_TAG_TYPES = Object.freeze([
  'ProductCatalog',
  'ProductDetail',
  'ProductMetadata',
  'ProductSummary',
  'ProductImport',
]);

function compactProductQueryParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => (
      value !== undefined
      && value !== null
      && value !== ''
    )),
  );
}

function productScopeId(workspaceId, productId) {
  return workspaceId + ':' + productId;
}

const productApiBase = baseApi.enhanceEndpoints({
  addTagTypes: [...PRODUCT_API_TAG_TYPES],
});

const productCatalogApi = productApiBase.injectEndpoints({
  endpoints: (build) => ({
    getProductMetadata: build.query({
      query: (workspaceId) => ({
        url: '/workspaces/' + workspaceId + '/products/metadata',
      }),
      transformResponse: (response) => response?.data?.metadata ?? null,
      providesTags: (_result, _error, workspaceId) => [
        { type: 'ProductMetadata', id: workspaceId },
      ],
    }),
    getProductSummary: build.query({
      query: (workspaceId) => ({
        url: '/workspaces/' + workspaceId + '/products/summary',
      }),
      transformResponse: (response) => response?.data?.summary ?? null,
      providesTags: (_result, _error, workspaceId) => [
        { type: 'ProductSummary', id: workspaceId },
      ],
    }),
    searchProducts: build.query({
      query: ({
        workspaceId,
        q,
        scope = 'WORKSPACE',
        categoryId,
        status,
        page = 1,
        limit = 20,
      }) => ({
        url: '/workspaces/' + workspaceId + '/products/search',
        params: compactProductQueryParams({
          q,
          scope,
          categoryId,
          status,
          page,
          limit,
        }),
      }),
      transformResponse: (response) => ({
        results: response?.data?.results ?? [],
        pagination: response?.meta ?? null,
      }),
      providesTags: (result, _error, { workspaceId }) => [
        { type: 'ProductCatalog', id: workspaceId },
        ...(result?.results ?? []).map(({ product }) => ({
          type: 'ProductDetail',
          id: productScopeId(workspaceId, product.id),
        })),
      ],
    }),
    getWorkspaceProductDetail: build.query({
      query: ({ workspaceId, productId }) => ({
        url: '/workspaces/' + workspaceId + '/products/' + productId,
      }),
      transformResponse: (response) => response?.data ?? null,
      providesTags: (_result, _error, { workspaceId, productId }) => [
        { type: 'ProductDetail', id: productScopeId(workspaceId, productId) },
      ],
    }),
    duplicateCheckProduct: build.mutation({
      query: ({ workspaceId, name, aliases = [] }) => ({
        url: '/workspaces/' + workspaceId + '/products/duplicate-check',
        method: 'POST',
        body: { name, aliases },
      }),
      transformResponse: (response) => response?.data ?? null,
    }),
    contributeProduct: build.mutation({
      query: ({ workspaceId, ...body }) => ({
        url: '/workspaces/' + workspaceId + '/products/contributions',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'ProductCatalog', id: workspaceId },
        { type: 'ProductSummary', id: workspaceId },
      ],
    }),
    contributeVariant: build.mutation({
      query: ({ workspaceId, productId, ...body }) => ({
        url: '/workspaces/' + workspaceId + '/products/' + productId + '/variants/contributions',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: (_result, _error, { workspaceId, productId }) => [
        { type: 'ProductCatalog', id: workspaceId },
        { type: 'ProductSummary', id: workspaceId },
        { type: 'ProductDetail', id: productScopeId(workspaceId, productId) },
      ],
    }),
    attachProductVariant: build.mutation({
      query: ({ workspaceId, variantId }) => ({
        url: '/workspaces/' + workspaceId + '/products/catalog/' + variantId,
        method: 'PUT',
        body: {},
      }),
      transformResponse: (response) => response?.data?.workspaceEntry ?? null,
      invalidatesTags: (_result, _error, { workspaceId, productId }) => [
        { type: 'ProductCatalog', id: workspaceId },
        { type: 'ProductSummary', id: workspaceId },
        ...(productId
          ? [{ type: 'ProductDetail', id: productScopeId(workspaceId, productId) }]
          : []),
      ],
    }),
    archiveProductVariant: build.mutation({
      query: ({ workspaceId, variantId }) => ({
        url: '/workspaces/' + workspaceId + '/products/catalog/' + variantId,
        method: 'DELETE',
      }),
      transformResponse: (response) => response?.data?.workspaceEntry ?? null,
      invalidatesTags: (_result, _error, { workspaceId, productId }) => [
        { type: 'ProductCatalog', id: workspaceId },
        { type: 'ProductSummary', id: workspaceId },
        ...(productId
          ? [{ type: 'ProductDetail', id: productScopeId(workspaceId, productId) }]
          : []),
      ],
    }),
    inspectProductImport: build.mutation({
      query: ({ workspaceId, file }) => {
        const body = new FormData();
        body.append('file', file);

        return {
          url: '/workspaces/' + workspaceId + '/products/imports/inspect',
          method: 'POST',
          body,
        };
      },
      transformResponse: (response) => response?.data ?? null,
    }),
    previewProductImport: build.mutation({
      query: ({ workspaceId, importId, mapping, defaults = {} }) => ({
        url: '/workspaces/' + workspaceId + '/products/imports/' + importId + '/preview',
        method: 'POST',
        body: { mapping, defaults },
      }),
      transformResponse: (response) => response?.data ?? null,
    }),
    commitProductImport: build.mutation({
      query: ({ workspaceId, importId, decisions = [] }) => ({
        url: '/workspaces/' + workspaceId + '/products/imports/' + importId + '/commit',
        method: 'POST',
        body: { decisions },
      }),
      transformResponse: (response) => response?.data ?? null,
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'ProductCatalog', id: workspaceId },
        { type: 'ProductSummary', id: workspaceId },
      ],
    }),
  }),
});

export const {
  useArchiveProductVariantMutation,
  useAttachProductVariantMutation,
  useCommitProductImportMutation,
  useContributeProductMutation,
  useContributeVariantMutation,
  useDuplicateCheckProductMutation,
  useGetProductMetadataQuery,
  useGetProductSummaryQuery,
  useGetWorkspaceProductDetailQuery,
  useInspectProductImportMutation,
  useLazyGetWorkspaceProductDetailQuery,
  usePreviewProductImportMutation,
  useSearchProductsQuery,
} = productCatalogApi;

export {
  PRODUCT_API_TAG_TYPES,
  compactProductQueryParams,
  productCatalogApi,
  productScopeId,
};
