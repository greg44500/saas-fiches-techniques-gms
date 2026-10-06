import { baseApi } from '@/services/api/base-api';

const TECHNICAL_SHEET_API_TAG_TYPES = Object.freeze([
  'TechnicalSheetList',
  'TechnicalSheet',
  'TechnicalSheetDraft',
  'TechnicalSheetHistory',
  'TechnicalSheetCapacity',
  'TechnicalSheetExportUsage',
  'TechnicalSheetTrash',
  'TechnicalSheetSettings',
  'WorkspaceBusinessSettings',
]);

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => (
      value !== undefined
      && value !== null
      && value !== ''
    )),
  );
}

function parseDownloadFileName(contentDisposition, fallbackName) {
  if (!contentDisposition) return fallbackName;

  const encodedMatch = contentDisposition.match(
    /filename\*=UTF-8''([^;]+)/i,
  );

  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch {
      return fallbackName;
    }
  }

  const plainMatch = contentDisposition.match(
    /filename="?([^";]+)"?/i,
  );

  return plainMatch?.[1] ?? fallbackName;
}

function dossierScopeId(workspaceId, dossierId) {
  return workspaceId + ':' + dossierId;
}

function technicalSheetScopeId(workspaceId, dossierId, technicalSheetId) {
  return workspaceId + ':' + dossierId + ':' + technicalSheetId;
}

const technicalSheetsApiBase = baseApi.enhanceEndpoints({
  addTagTypes: [...TECHNICAL_SHEET_API_TAG_TYPES],
});

const technicalSheetsApi = technicalSheetsApiBase.injectEndpoints({
  endpoints: (builder) => ({
    getTechnicalSheetMetadata: builder.query({
      query: ({ workspaceId, dossierId }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/metadata',
      }),
      transformResponse: (response) => response.data.metadata,
      providesTags: (_result, _error, { workspaceId, dossierId }) => [
        {
          type: 'TechnicalSheetSettings',
          id: dossierScopeId(workspaceId, dossierId),
        },
      ],
    }),

    listTechnicalSheets: builder.query({
      query: ({
        workspaceId,
        dossierId,
        page = 1,
        limit = 20,
        search,
        status,
      }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets',
        params: compactParams({
          page,
          limit,
          search,
          status,
        }),
      }),
      transformResponse: (response) => response.data,
      providesTags: (result, _error, { workspaceId, dossierId }) => [
        {
          type: 'TechnicalSheetList',
          id: dossierScopeId(workspaceId, dossierId),
        },
        ...(result?.sheets ?? []).map((sheet) => ({
          type: 'TechnicalSheet',
          id: technicalSheetScopeId(workspaceId, dossierId, sheet.id),
        })),
      ],
    }),

    createTechnicalSheet: builder.mutation({
      query: ({ workspaceId, dossierId, ...body }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, { workspaceId, dossierId }) => [
        {
          type: 'TechnicalSheetList',
          id: dossierScopeId(workspaceId, dossierId),
        },
        { type: 'TechnicalSheetCapacity', id: workspaceId },
      ],
    }),

    getTechnicalSheet: builder.query({
      query: ({ workspaceId, dossierId, technicalSheetId }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/' + technicalSheetId,
      }),
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, {
        workspaceId,
        dossierId,
        technicalSheetId,
      }) => [
        {
          type: 'TechnicalSheet',
          id: technicalSheetScopeId(
            workspaceId,
            dossierId,
            technicalSheetId,
          ),
        },
        {
          type: 'TechnicalSheetDraft',
          id: technicalSheetScopeId(
            workspaceId,
            dossierId,
            technicalSheetId,
          ),
        },
      ],
    }),

    updateTechnicalSheet: builder.mutation({
      query: ({
        workspaceId,
        dossierId,
        technicalSheetId,
        ...body
      }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/' + technicalSheetId,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response) => response.data.sheet,
      invalidatesTags: (_result, _error, {
        workspaceId,
        dossierId,
        technicalSheetId,
      }) => [
        {
          type: 'TechnicalSheet',
          id: technicalSheetScopeId(
            workspaceId,
            dossierId,
            technicalSheetId,
          ),
        },
        {
          type: 'TechnicalSheetList',
          id: dossierScopeId(workspaceId, dossierId),
        },
      ],
    }),

    getTechnicalSheetDraft: builder.query({
      query: ({ workspaceId, dossierId, technicalSheetId }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/' + technicalSheetId
          + '/draft',
      }),
      transformResponse: (response) => response.data.draft,
      providesTags: (_result, _error, {
        workspaceId,
        dossierId,
        technicalSheetId,
      }) => [
        {
          type: 'TechnicalSheetDraft',
          id: technicalSheetScopeId(
            workspaceId,
            dossierId,
            technicalSheetId,
          ),
        },
      ],
    }),

    startTechnicalSheetDraft: builder.mutation({
      query: ({
        workspaceId,
        dossierId,
        technicalSheetId,
        expectedSheetRevision,
      }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/' + technicalSheetId
          + '/draft',
        method: 'POST',
        body: { expectedSheetRevision },
      }),
      transformResponse: (response) => response.data.draft,
      invalidatesTags: (_result, _error, {
        workspaceId,
        dossierId,
        technicalSheetId,
      }) => [
        {
          type: 'TechnicalSheetDraft',
          id: technicalSheetScopeId(
            workspaceId,
            dossierId,
            technicalSheetId,
          ),
        },
      ],
    }),

    saveTechnicalSheetDraft: builder.mutation({
      query: ({
        workspaceId,
        dossierId,
        technicalSheetId,
        ...body
      }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/' + technicalSheetId
          + '/draft',
        method: 'PUT',
        body,
      }),
      transformResponse: (response) => response.data.draft,
      invalidatesTags: (_result, _error, {
        workspaceId,
        dossierId,
        technicalSheetId,
      }) => [
        {
          type: 'TechnicalSheetDraft',
          id: technicalSheetScopeId(
            workspaceId,
            dossierId,
            technicalSheetId,
          ),
        },
        {
          type: 'TechnicalSheet',
          id: technicalSheetScopeId(
            workspaceId,
            dossierId,
            technicalSheetId,
          ),
        },
      ],
    }),

    selectTechnicalSheetSupplierArticle: builder.mutation({
      query: ({
        workspaceId,
        dossierId,
        technicalSheetId,
        expectedRevision,
        lineId,
        supplierArticleId,
      }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/' + technicalSheetId
          + '/draft/sourcing',
        method: 'PATCH',
        body: {
          expectedRevision,
          lineId,
          supplierArticleId,
        },
      }),
      transformResponse: (response) => response.data.draft,
      invalidatesTags: (_result, _error, {
        workspaceId,
        dossierId,
        technicalSheetId,
      }) => [
        {
          type: 'TechnicalSheetDraft',
          id: technicalSheetScopeId(
            workspaceId,
            dossierId,
            technicalSheetId,
          ),
        },
      ],
    }),

    valuateTechnicalSheet: builder.mutation({
      query: ({
        workspaceId,
        dossierId,
        technicalSheetId,
        expectedRevision,
      }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/' + technicalSheetId
          + '/valuate',
        method: 'POST',
        body: { expectedRevision },
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, {
        workspaceId,
        dossierId,
        technicalSheetId,
      }) => [
        {
          type: 'TechnicalSheetDraft',
          id: technicalSheetScopeId(
            workspaceId,
            dossierId,
            technicalSheetId,
          ),
        },
      ],
    }),

    validateTechnicalSheet: builder.mutation({
      query: ({
        workspaceId,
        dossierId,
        technicalSheetId,
        ...body
      }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/' + technicalSheetId
          + '/validate',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, {
        workspaceId,
        dossierId,
        technicalSheetId,
      }) => [
        {
          type: 'TechnicalSheet',
          id: technicalSheetScopeId(
            workspaceId,
            dossierId,
            technicalSheetId,
          ),
        },
        {
          type: 'TechnicalSheetDraft',
          id: technicalSheetScopeId(
            workspaceId,
            dossierId,
            technicalSheetId,
          ),
        },
        {
          type: 'TechnicalSheetHistory',
          id: technicalSheetScopeId(
            workspaceId,
            dossierId,
            technicalSheetId,
          ),
        },
        {
          type: 'TechnicalSheetList',
          id: dossierScopeId(workspaceId, dossierId),
        },
      ],
    }),

    exportTechnicalSheet: builder.mutation({
      query: ({
        workspaceId,
        dossierId,
        technicalSheetId,
        format,
      }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/' + technicalSheetId
          + '/exports',
        method: 'POST',
        body: { format },
        responseHandler: async (response) => {
          if (!response.ok) {
            return response.json();
          }

          const blob = await response.blob();
          const fallbackName =
            'fiche-technique.'
            + format.toLowerCase();

          return {
            blob,
            fileName: parseDownloadFileName(
              response.headers.get('content-disposition'),
              fallbackName,
            ),
          };
        },
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        {
          type: 'TechnicalSheetExportUsage',
          id: workspaceId,
        },
      ],
    }),

    getTechnicalSheetExportUsage: builder.query({
      query: (workspaceId) => ({
        url:
          '/workspaces/' + workspaceId
          + '/technical-sheets/exports/usage',
      }),
      transformResponse: (response) => response.data.usage,
      providesTags: (_result, _error, workspaceId) => [
        {
          type: 'TechnicalSheetExportUsage',
          id: workspaceId,
        },
      ],
    }),

    listTechnicalSheetHistory: builder.query({
      query: ({
        workspaceId,
        dossierId,
        technicalSheetId,
        page = 1,
        limit = 20,
      }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/' + technicalSheetId
          + '/history',
        params: { page, limit },
      }),
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, {
        workspaceId,
        dossierId,
        technicalSheetId,
      }) => [
        {
          type: 'TechnicalSheetHistory',
          id: technicalSheetScopeId(
            workspaceId,
            dossierId,
            technicalSheetId,
          ),
        },
      ],
    }),

    getTechnicalSheetValidation: builder.query({
      query: ({
        workspaceId,
        dossierId,
        technicalSheetId,
        validationId,
      }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/' + technicalSheetId
          + '/history/' + validationId,
      }),
      transformResponse: (response) => response.data.validation,
      providesTags: (_result, _error, {
        workspaceId,
        dossierId,
        technicalSheetId,
      }) => [
        {
          type: 'TechnicalSheetHistory',
          id: technicalSheetScopeId(
            workspaceId,
            dossierId,
            technicalSheetId,
          ),
        },
      ],
    }),

    archiveTechnicalSheet: builder.mutation({
      query: ({ workspaceId, dossierId, technicalSheetId, expectedRevision }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/' + technicalSheetId
          + '/archive',
        method: 'POST',
        body: { expectedRevision },
      }),
      transformResponse: (response) => response.data.sheet,
      invalidatesTags: (_result, _error, { workspaceId, dossierId, technicalSheetId }) => [
        {
          type: 'TechnicalSheetList',
          id: dossierScopeId(workspaceId, dossierId),
        },
        {
          type: 'TechnicalSheet',
          id: technicalSheetScopeId(
            workspaceId,
            dossierId,
            technicalSheetId,
          ),
        },
      ],
    }),

    reactivateTechnicalSheet: builder.mutation({
      query: ({ workspaceId, dossierId, technicalSheetId, expectedRevision }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/' + technicalSheetId
          + '/reactivate',
        method: 'POST',
        body: { expectedRevision },
      }),
      transformResponse: (response) => response.data.sheet,
      invalidatesTags: (_result, _error, { workspaceId, dossierId, technicalSheetId }) => [
        {
          type: 'TechnicalSheetList',
          id: dossierScopeId(workspaceId, dossierId),
        },
        {
          type: 'TechnicalSheet',
          id: technicalSheetScopeId(
            workspaceId,
            dossierId,
            technicalSheetId,
          ),
        },
      ],
    }),

    deleteTechnicalSheet: builder.mutation({
      query: ({ workspaceId, dossierId, technicalSheetId, expectedRevision }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/' + technicalSheetId
          + '/delete',
        method: 'POST',
        body: { expectedRevision },
      }),
      transformResponse: (response) => response.data.sheet,
      invalidatesTags: (_result, _error, { workspaceId, dossierId, technicalSheetId }) => [
        {
          type: 'TechnicalSheetList',
          id: dossierScopeId(workspaceId, dossierId),
        },
        {
          type: 'TechnicalSheet',
          id: technicalSheetScopeId(
            workspaceId,
            dossierId,
            technicalSheetId,
          ),
        },
        { type: 'TechnicalSheetTrash', id: workspaceId },
      ],
    }),

    restoreTechnicalSheet: builder.mutation({
      query: ({ workspaceId, dossierId, technicalSheetId, expectedRevision }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/' + technicalSheetId
          + '/restore',
        method: 'POST',
        body: { expectedRevision },
      }),
      transformResponse: (response) => response.data.sheet,
      invalidatesTags: (_result, _error, { workspaceId, dossierId, technicalSheetId }) => [
        {
          type: 'TechnicalSheetList',
          id: dossierScopeId(workspaceId, dossierId),
        },
        {
          type: 'TechnicalSheet',
          id: technicalSheetScopeId(
            workspaceId,
            dossierId,
            technicalSheetId,
          ),
        },
        { type: 'TechnicalSheetTrash', id: workspaceId },
      ],
    }),

    purgeTechnicalSheet: builder.mutation({
      query: ({
        workspaceId,
        dossierId,
        technicalSheetId,
        expectedRevision,
      }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/' + technicalSheetId
          + '/purge',
        method: 'POST',
        body: {
          expectedRevision,
          confirmation: 'PURGE',
        },
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'TechnicalSheetTrash', id: workspaceId },
        { type: 'TechnicalSheetCapacity', id: workspaceId },
      ],
    }),

    copyTechnicalSheet: builder.mutation({
      query: ({
        workspaceId,
        dossierId,
        technicalSheetId,
        targetDossierId,
      }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/' + technicalSheetId
          + '/copy',
        method: 'POST',
        body: { targetDossierId },
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'TechnicalSheetCapacity', id: workspaceId },
        { type: 'TechnicalSheetList' },
      ],
    }),

    getDossierTechnicalSheetSettings: builder.query({
      query: ({ workspaceId, dossierId }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/settings',
      }),
      transformResponse: (response) => response.data.settings,
      providesTags: (_result, _error, { workspaceId, dossierId }) => [
        {
          type: 'TechnicalSheetSettings',
          id: dossierScopeId(workspaceId, dossierId),
        },
      ],
    }),

    updateDossierTechnicalSheetSettings: builder.mutation({
      query: ({ workspaceId, dossierId, defaultTargetMarginBasisPoints }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/technical-sheets/settings',
        method: 'PUT',
        body: { defaultTargetMarginBasisPoints },
      }),
      transformResponse: (response) => response.data.settings,
      invalidatesTags: (_result, _error, { workspaceId, dossierId }) => [
        {
          type: 'TechnicalSheetSettings',
          id: dossierScopeId(workspaceId, dossierId),
        },
      ],
    }),

    getTechnicalSheetCapacity: builder.query({
      query: (workspaceId) => ({
        url: '/workspaces/' + workspaceId + '/technical-sheets/capacity',
      }),
      transformResponse: (response) => response.data.capacity,
      providesTags: (_result, _error, workspaceId) => [
        { type: 'TechnicalSheetCapacity', id: workspaceId },
      ],
    }),

    listTechnicalSheetTrash: builder.query({
      query: ({ workspaceId, page = 1, limit = 20 }) => ({
        url: '/workspaces/' + workspaceId + '/technical-sheets/trash',
        params: { page, limit },
      }),
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, { workspaceId }) => [
        { type: 'TechnicalSheetTrash', id: workspaceId },
      ],
    }),

    purgeExpiredTechnicalSheetTrash: builder.mutation({
      query: ({ workspaceId }) => ({
        url: '/workspaces/' + workspaceId + '/technical-sheets/trash/purge',
        method: 'POST',
        body: { confirmation: 'PURGE_EXPIRED' },
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'TechnicalSheetTrash', id: workspaceId },
        { type: 'TechnicalSheetCapacity', id: workspaceId },
      ],
    }),

    getWorkspaceBusinessSettings: builder.query({
      query: (workspaceId) => ({
        url: '/workspaces/' + workspaceId + '/business-settings',
      }),
      transformResponse: (response) => response.data.settings,
      providesTags: (_result, _error, workspaceId) => [
        { type: 'WorkspaceBusinessSettings', id: workspaceId },
      ],
    }),

    updateWorkspaceTrashRetention: builder.mutation({
      query: ({ workspaceId, trashRetentionDays }) => ({
        url:
          '/workspaces/' + workspaceId
          + '/business-settings/trash-retention',
        method: 'PUT',
        body: { trashRetentionDays },
      }),
      transformResponse: (response) => response.data.settings,
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceBusinessSettings', id: workspaceId },
      ],
    }),
  }),
});

export const {
  useArchiveTechnicalSheetMutation,
  useCopyTechnicalSheetMutation,
  useCreateTechnicalSheetMutation,
  useDeleteTechnicalSheetMutation,
  useExportTechnicalSheetMutation,
  useGetDossierTechnicalSheetSettingsQuery,
  useGetTechnicalSheetCapacityQuery,
  useGetTechnicalSheetDraftQuery,
  useGetTechnicalSheetExportUsageQuery,
  useGetTechnicalSheetMetadataQuery,
  useGetTechnicalSheetQuery,
  useGetTechnicalSheetValidationQuery,
  useGetWorkspaceBusinessSettingsQuery,
  useListTechnicalSheetHistoryQuery,
  useListTechnicalSheetTrashQuery,
  useListTechnicalSheetsQuery,
  usePurgeExpiredTechnicalSheetTrashMutation,
  usePurgeTechnicalSheetMutation,
  useReactivateTechnicalSheetMutation,
  useRestoreTechnicalSheetMutation,
  useSaveTechnicalSheetDraftMutation,
  useSelectTechnicalSheetSupplierArticleMutation,
  useStartTechnicalSheetDraftMutation,
  useUpdateDossierTechnicalSheetSettingsMutation,
  useUpdateTechnicalSheetMutation,
  useUpdateWorkspaceTrashRetentionMutation,
  useValidateTechnicalSheetMutation,
  useValuateTechnicalSheetMutation,
} = technicalSheetsApi;

export {
  TECHNICAL_SHEET_API_TAG_TYPES,
  compactParams,
  dossierScopeId,
  parseDownloadFileName,
  technicalSheetScopeId,
  technicalSheetsApi,
};
