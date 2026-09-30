import { baseApi } from '@/services/api/base-api';

const SUPPLIER_API_TAG_TYPES = Object.freeze([
  'Supplier',
  'SupplierArticle',
  'SupplierCatalog',
  'SupplierPricing',
  'SupplierReference',
]);

const supplierApiBase = baseApi.enhanceEndpoints({
  addTagTypes: [...SUPPLIER_API_TAG_TYPES],
});

const supplierApi = supplierApiBase.injectEndpoints({
  endpoints: (builder) => ({
    getSupplierMetadata: builder.query({
      query: (workspaceId) => ({
        url: '/workspaces/' + workspaceId + '/suppliers/metadata',
      }),
      transformResponse: (response) => response.data.metadata,
      providesTags: ['Supplier'],
    }),
    listSuppliers: builder.query({
      query: ({
        workspaceId,
        page = 1,
        limit = 20,
        search,
        status = 'ACTIVE',
        scope,
      }) => ({
        url: '/workspaces/' + workspaceId + '/suppliers',
        params: { page, limit, search, status, scope },
      }),
      transformResponse: (response) => response.data,
      providesTags: ['Supplier'],
    }),
    createSupplier: builder.mutation({
      query: ({ workspaceId, ...body }) => ({
        url: '/workspaces/' + workspaceId + '/suppliers',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data.supplier,
      invalidatesTags: ['Supplier'],
    }),
    updateSupplier: builder.mutation({
      query: ({ workspaceId, supplierId, ...body }) => ({
        url: '/workspaces/' + workspaceId + '/suppliers/' + supplierId,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response) => response.data.supplier,
      invalidatesTags: ['Supplier', 'SupplierArticle', 'SupplierCatalog'],
    }),
    updateSupplierStatus: builder.mutation({
      query: ({ workspaceId, supplierId, status }) => ({
        url: '/workspaces/' + workspaceId + '/suppliers/' + supplierId + '/status',
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response) => response.data.supplier,
      invalidatesTags: ['Supplier', 'SupplierArticle', 'SupplierCatalog'],
    }),
    listSupplierArticles: builder.query({
      query: ({
        workspaceId,
        page = 1,
        limit = 20,
        search,
        status = 'ACTIVE',
        scope,
        supplierId,
        productId,
        productVariantId,
      }) => ({
        url: '/workspaces/' + workspaceId + '/supplier-articles',
        params: {
          page,
          limit,
          search,
          status,
          scope,
          supplierId,
          productId,
          productVariantId,
        },
      }),
      transformResponse: (response) => response.data,
      providesTags: ['SupplierArticle'],
    }),
    createSupplierArticle: builder.mutation({
      query: ({ workspaceId, ...body }) => ({
        url: '/workspaces/' + workspaceId + '/supplier-articles',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data.article,
      invalidatesTags: ['SupplierArticle', 'SupplierCatalog', 'SupplierPricing'],
    }),
    updateSupplierArticle: builder.mutation({
      query: ({ workspaceId, articleId, ...body }) => ({
        url: '/workspaces/' + workspaceId + '/supplier-articles/' + articleId,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response) => response.data.article,
      invalidatesTags: ['SupplierArticle', 'SupplierCatalog', 'SupplierPricing'],
    }),
    updateSupplierArticleStatus: builder.mutation({
      query: ({ workspaceId, articleId, status }) => ({
        url: '/workspaces/' + workspaceId + '/supplier-articles/' + articleId + '/status',
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response) => response.data.article,
      invalidatesTags: ['SupplierArticle', 'SupplierCatalog', 'SupplierPricing'],
    }),
    replaceSupplierArticle: builder.mutation({
      query: ({ workspaceId, articleId, ...body }) => ({
        url: '/workspaces/' + workspaceId + '/supplier-articles/' + articleId + '/replacement',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['SupplierArticle', 'SupplierCatalog', 'SupplierPricing'],
    }),
    getSupplierCatalogMetadata: builder.query({
      query: (workspaceId) => ({
        url: '/workspaces/' + workspaceId + '/supplier-catalogs/metadata',
      }),
      transformResponse: (response) => response.data.metadata,
      providesTags: ['SupplierCatalog'],
    }),
    listSupplierCatalogs: builder.query({
      query: ({
        workspaceId,
        page = 1,
        limit = 20,
        supplierId,
        status = 'ACTIVE',
        scope,
      }) => ({
        url: '/workspaces/' + workspaceId + '/supplier-catalogs',
        params: { page, limit, supplierId, status, scope },
      }),
      transformResponse: (response) => response.data,
      providesTags: ['SupplierCatalog'],
    }),
    listSupplierCatalogLines: builder.query({
      query: ({ workspaceId, catalogId, page = 1, limit = 50 }) => ({
        url: '/workspaces/' + workspaceId + '/supplier-catalogs/' + catalogId + '/lines',
        params: { page, limit },
      }),
      transformResponse: (response) => response.data,
      providesTags: ['SupplierCatalog'],
    }),
    createSupplierCatalog: builder.mutation({
      query: ({ workspaceId, ...body }) => ({
        url: '/workspaces/' + workspaceId + '/supplier-catalogs',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['SupplierCatalog'],
    }),
    updateSupplierCatalogStatus: builder.mutation({
      query: ({ workspaceId, catalogId, status }) => ({
        url: '/workspaces/' + workspaceId + '/supplier-catalogs/' + catalogId + '/status',
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response) => response.data.catalog,
      invalidatesTags: ['SupplierCatalog', 'SupplierPricing'],
    }),
    inspectSupplierCatalogImport: builder.mutation({
      query: ({ workspaceId, file }) => {
        const body = new FormData();
        body.append('file', file);
        return {
          url: '/workspaces/' + workspaceId + '/supplier-catalogs/imports/inspect',
          method: 'POST',
          body,
        };
      },
      transformResponse: (response) => response.data,
    }),
    previewSupplierCatalogImport: builder.mutation({
      query: ({ workspaceId, importId, ...body }) => ({
        url: '/workspaces/' + workspaceId + '/supplier-catalogs/imports/' + importId + '/preview',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
    }),
    commitSupplierCatalogImport: builder.mutation({
      query: ({ workspaceId, importId }) => ({
        url: '/workspaces/' + workspaceId + '/supplier-catalogs/imports/' + importId + '/commit',
        method: 'POST',
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['Supplier', 'SupplierArticle', 'SupplierCatalog', 'SupplierPricing'],
    }),
    getSupplierPricingMetadata: builder.query({
      query: ({ workspaceId, dossierId }) => ({
        url: '/workspaces/' + workspaceId + '/dossiers/' + dossierId + '/supplier-pricing/metadata',
      }),
      transformResponse: (response) => response.data.metadata,
      providesTags: ['SupplierPricing'],
    }),
    getPricingPolicy: builder.query({
      query: (workspaceId) => ({
        url: '/workspaces/' + workspaceId + '/supplier-pricing-policy',
      }),
      transformResponse: (response) => response.data.policy,
      providesTags: ['SupplierPricing'],
    }),
    updatePricingPolicy: builder.mutation({
      query: ({ workspaceId, mode }) => ({
        url: '/workspaces/' + workspaceId + '/supplier-pricing-policy',
        method: 'PUT',
        body: { mode },
      }),
      transformResponse: (response) => response.data.policy,
      invalidatesTags: ['SupplierPricing'],
    }),
    listNegotiatedPrices: builder.query({
      query: ({ workspaceId, dossierId, articleId, status }) => ({
        url: '/workspaces/' + workspaceId + '/dossiers/' + dossierId + '/supplier-pricing/negotiated-prices',
        params: { articleId, status },
      }),
      transformResponse: (response) => response.data.prices,
      providesTags: ['SupplierPricing'],
    }),
    createNegotiatedPrice: builder.mutation({
      query: ({ workspaceId, dossierId, ...body }) => ({
        url: '/workspaces/' + workspaceId + '/dossiers/' + dossierId + '/supplier-pricing/negotiated-prices',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data.price,
      invalidatesTags: ['SupplierPricing'],
    }),
    archiveNegotiatedPrice: builder.mutation({
      query: ({ workspaceId, dossierId, priceId }) => ({
        url: '/workspaces/' + workspaceId + '/dossiers/' + dossierId + '/supplier-pricing/negotiated-prices/' + priceId + '/archive',
        method: 'PATCH',
      }),
      transformResponse: (response) => response.data.price,
      invalidatesTags: ['SupplierPricing'],
    }),
    listInvoicedPrices: builder.query({
      query: ({ workspaceId, dossierId, articleId, status }) => ({
        url: '/workspaces/' + workspaceId + '/dossiers/' + dossierId + '/supplier-pricing/invoiced-prices',
        params: { articleId, status },
      }),
      transformResponse: (response) => response.data.prices,
      providesTags: ['SupplierPricing'],
    }),
    createInvoicedPrice: builder.mutation({
      query: ({ workspaceId, dossierId, ...body }) => ({
        url: '/workspaces/' + workspaceId + '/dossiers/' + dossierId + '/supplier-pricing/invoiced-prices',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data.price,
      invalidatesTags: ['SupplierPricing'],
    }),
    decideInvoicedPrice: builder.mutation({
      query: ({ workspaceId, dossierId, priceId, status }) => ({
        url: '/workspaces/' + workspaceId + '/dossiers/' + dossierId + '/supplier-pricing/invoiced-prices/' + priceId + '/status',
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response) => response.data.price,
      invalidatesTags: ['SupplierPricing'],
    }),
    listDossierSupplierReferences: builder.query({
      query: ({ workspaceId, dossierId }) => ({
        url: '/workspaces/' + workspaceId + '/dossiers/' + dossierId + '/supplier-pricing/references',
      }),
      transformResponse: (response) => response.data.references,
      providesTags: ['SupplierPricing'],
    }),
    addDossierSupplierReference: builder.mutation({
      query: ({ workspaceId, dossierId, articleId }) => ({
        url: '/workspaces/' + workspaceId + '/dossiers/' + dossierId + '/supplier-pricing/references/' + articleId,
        method: 'PUT',
      }),
      transformResponse: (response) => response.data.reference,
      invalidatesTags: ['SupplierPricing'],
    }),
    removeDossierSupplierReference: builder.mutation({
      query: ({ workspaceId, dossierId, articleId }) => ({
        url: '/workspaces/' + workspaceId + '/dossiers/' + dossierId + '/supplier-pricing/references/' + articleId,
        method: 'DELETE',
      }),
      transformResponse: (response) => response.data.reference,
      invalidatesTags: ['SupplierPricing'],
    }),
    getApplicableSupplierPrice: builder.query({
      query: ({ workspaceId, dossierId, articleId, productVariantId, atDate }) => ({
        url: '/workspaces/' + workspaceId + '/dossiers/' + dossierId + '/supplier-pricing/applicable',
        params: { articleId, productVariantId, atDate },
      }),
      transformResponse: (response) => response.data.applicablePrice,
      providesTags: ['SupplierPricing'],
    }),
    listWorkspaceIndicativePrices: builder.query({
      query: ({
        workspaceId,
        productId,
        productVariantId,
        status = 'ACTIVE',
      }) => ({
        url: '/workspaces/' + workspaceId + '/supplier-pricing/indicative-prices',
        params: { productId, productVariantId, status },
      }),
      transformResponse: (response) => response.data.prices,
      providesTags: ['SupplierPricing'],
    }),
    setWorkspaceIndicativePrice: builder.mutation({
      query: ({ workspaceId, productVariantId, ...body }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/supplier-pricing/indicative-prices/' + productVariantId,
        method: 'PUT',
        body,
      }),
      transformResponse: (response) => response.data.price,
      invalidatesTags: ['SupplierPricing'],
    }),
    archiveWorkspaceIndicativePrice: builder.mutation({
      query: ({ workspaceId, productVariantId }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/supplier-pricing/indicative-prices/' + productVariantId,
        method: 'DELETE',
      }),
      transformResponse: (response) => response.data.price,
      invalidatesTags: ['SupplierPricing'],
    }),
    listDossierIndicativePrices: builder.query({
      query: ({ workspaceId, dossierId, productVariantId, status = 'ACTIVE' }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/supplier-pricing/indicative-prices',
        params: { productVariantId, status },
      }),
      transformResponse: (response) => response.data.prices,
      providesTags: ['SupplierPricing'],
    }),
    setDossierIndicativePrice: builder.mutation({
      query: ({ workspaceId, dossierId, productVariantId, ...body }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/supplier-pricing/indicative-prices/' + productVariantId,
        method: 'PUT',
        body,
      }),
      transformResponse: (response) => response.data.price,
      invalidatesTags: ['SupplierPricing'],
    }),
    archiveDossierIndicativePrice: builder.mutation({
      query: ({ workspaceId, dossierId, productVariantId }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/supplier-pricing/indicative-prices/' + productVariantId,
        method: 'DELETE',
      }),
      transformResponse: (response) => response.data.price,
      invalidatesTags: ['SupplierPricing'],
    }),
    getSupplierReferenceAccess: builder.query({
      query: () => ({ url: '/supplier-reference/access' }),
      transformResponse: (response) => response.data.access,
      providesTags: ['SupplierReference'],
    }),
    getGlobalSupplierMetadata: builder.query({
      query: () => ({ url: '/supplier-reference/metadata' }),
      transformResponse: (response) => response.data.metadata,
      providesTags: ['SupplierReference'],
    }),
    listGlobalSuppliers: builder.query({
      query: ({ page = 1, limit = 20, search, status = 'ACTIVE' } = {}) => ({
        url: '/supplier-reference/suppliers',
        params: { page, limit, search, status },
      }),
      transformResponse: (response) => response.data,
      providesTags: ['SupplierReference'],
    }),
    createGlobalSupplier: builder.mutation({
      query: (body) => ({
        url: '/supplier-reference/suppliers',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data.supplier,
      invalidatesTags: ['SupplierReference', 'Supplier'],
    }),
    updateGlobalSupplier: builder.mutation({
      query: ({ supplierId, ...body }) => ({
        url: '/supplier-reference/suppliers/' + supplierId,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response) => response.data.supplier,
      invalidatesTags: ['SupplierReference', 'Supplier', 'SupplierArticle', 'SupplierCatalog'],
    }),
    updateGlobalSupplierStatus: builder.mutation({
      query: ({ supplierId, status }) => ({
        url: '/supplier-reference/suppliers/' + supplierId + '/status',
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response) => response.data.supplier,
      invalidatesTags: ['SupplierReference', 'Supplier', 'SupplierArticle', 'SupplierCatalog'],
    }),
    listGlobalSupplierArticles: builder.query({
      query: ({ page = 1, limit = 20, search, status = 'ACTIVE', supplierId } = {}) => ({
        url: '/supplier-reference/articles',
        params: { page, limit, search, status, supplierId },
      }),
      transformResponse: (response) => response.data,
      providesTags: ['SupplierReference'],
    }),
    createGlobalSupplierArticle: builder.mutation({
      query: (body) => ({
        url: '/supplier-reference/articles',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data.article,
      invalidatesTags: ['SupplierReference', 'SupplierArticle'],
    }),
    updateGlobalSupplierArticle: builder.mutation({
      query: ({ articleId, ...body }) => ({
        url: '/supplier-reference/articles/' + articleId,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response) => response.data.article,
      invalidatesTags: ['SupplierReference', 'SupplierArticle', 'SupplierCatalog'],
    }),
    updateGlobalSupplierArticleStatus: builder.mutation({
      query: ({ articleId, status }) => ({
        url: '/supplier-reference/articles/' + articleId + '/status',
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response) => response.data.article,
      invalidatesTags: ['SupplierReference', 'SupplierArticle', 'SupplierCatalog'],
    }),
    replaceGlobalSupplierArticle: builder.mutation({
      query: ({ articleId, ...body }) => ({
        url: '/supplier-reference/articles/' + articleId + '/replacement',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['SupplierReference', 'SupplierArticle', 'SupplierCatalog'],
    }),
    listGlobalSupplierCatalogs: builder.query({
      query: ({ page = 1, limit = 20, supplierId, status = 'ACTIVE' } = {}) => ({
        url: '/supplier-reference/catalogs',
        params: { page, limit, supplierId, status },
      }),
      transformResponse: (response) => response.data,
      providesTags: ['SupplierReference'],
    }),
    createGlobalSupplierCatalog: builder.mutation({
      query: (body) => ({
        url: '/supplier-reference/catalogs',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['SupplierReference', 'SupplierCatalog'],
    }),
    updateGlobalSupplierCatalogStatus: builder.mutation({
      query: ({ catalogId, status }) => ({
        url: '/supplier-reference/catalogs/' + catalogId + '/status',
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response) => response.data.catalog,
      invalidatesTags: ['SupplierReference', 'SupplierCatalog'],
    }),
    listGlobalSupplierCatalogLines: builder.query({
      query: ({ catalogId, page = 1, limit = 50 }) => ({
        url: '/supplier-reference/catalogs/' + catalogId + '/lines',
        params: { page, limit },
      }),
      transformResponse: (response) => response.data,
      providesTags: ['SupplierReference'],
    }),
    inspectGlobalSupplierCatalogImport: builder.mutation({
      query: ({ file }) => {
        const body = new FormData();
        body.append('file', file);
        return {
          url: '/supplier-reference/catalogs/imports/inspect',
          method: 'POST',
          body,
        };
      },
      transformResponse: (response) => response.data,
    }),
    previewGlobalSupplierCatalogImport: builder.mutation({
      query: ({ importId, ...body }) => ({
        url: '/supplier-reference/catalogs/imports/' + importId + '/preview',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
    }),
    commitGlobalSupplierCatalogImport: builder.mutation({
      query: ({ importId }) => ({
        url: '/supplier-reference/catalogs/imports/' + importId + '/commit',
        method: 'POST',
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['SupplierReference', 'Supplier', 'SupplierArticle', 'SupplierCatalog'],
    }),
  }),
});

export const {
  useAddDossierSupplierReferenceMutation,
  useArchiveDossierIndicativePriceMutation,
  useArchiveNegotiatedPriceMutation,
  useArchiveWorkspaceIndicativePriceMutation,
  useCommitGlobalSupplierCatalogImportMutation,
  useCommitSupplierCatalogImportMutation,
  useCreateGlobalSupplierArticleMutation,
  useCreateGlobalSupplierCatalogMutation,
  useCreateGlobalSupplierMutation,
  useCreateInvoicedPriceMutation,
  useCreateNegotiatedPriceMutation,
  useCreateSupplierArticleMutation,
  useCreateSupplierCatalogMutation,
  useCreateSupplierMutation,
  useDecideInvoicedPriceMutation,
  useGetApplicableSupplierPriceQuery,
  useLazyGetApplicableSupplierPriceQuery,
  useGetGlobalSupplierMetadataQuery,
  useGetPricingPolicyQuery,
  useGetSupplierCatalogMetadataQuery,
  useGetSupplierMetadataQuery,
  useGetSupplierPricingMetadataQuery,
  useGetSupplierReferenceAccessQuery,
  useInspectGlobalSupplierCatalogImportMutation,
  useInspectSupplierCatalogImportMutation,
  useListDossierIndicativePricesQuery,
  useListDossierSupplierReferencesQuery,
  useListGlobalSupplierArticlesQuery,
  useListGlobalSupplierCatalogLinesQuery,
  useListGlobalSupplierCatalogsQuery,
  useListGlobalSuppliersQuery,
  useListInvoicedPricesQuery,
  useListNegotiatedPricesQuery,
  useListSupplierArticlesQuery,
  useListSupplierCatalogLinesQuery,
  useListSupplierCatalogsQuery,
  useListSuppliersQuery,
  useListWorkspaceIndicativePricesQuery,
  usePreviewGlobalSupplierCatalogImportMutation,
  usePreviewSupplierCatalogImportMutation,
  useRemoveDossierSupplierReferenceMutation,
  useReplaceGlobalSupplierArticleMutation,
  useReplaceSupplierArticleMutation,
  useUpdateGlobalSupplierArticleMutation,
  useUpdateGlobalSupplierArticleStatusMutation,
  useUpdateGlobalSupplierCatalogStatusMutation,
  useUpdateGlobalSupplierMutation,
  useUpdateGlobalSupplierStatusMutation,
  useSetDossierIndicativePriceMutation,
  useSetWorkspaceIndicativePriceMutation,
  useUpdatePricingPolicyMutation,
  useUpdateSupplierArticleMutation,
  useUpdateSupplierArticleStatusMutation,
  useUpdateSupplierCatalogStatusMutation,
  useUpdateSupplierMutation,
  useUpdateSupplierStatusMutation,
} = supplierApi;

export {
  SUPPLIER_API_TAG_TYPES,
  supplierApi,
};
