import { baseApi } from '@/services/api/base-api';

function compositionScopeId(workspaceId, dossierId, technicalSheetId) {
  return workspaceId + ':' + dossierId + ':' + technicalSheetId;
}

// Same RTK Query base as M-004: mutations of the parent invalidate this
// projection through its existing TechnicalSheet / TechnicalSheetDraft tags.
const processSheetsApi = baseApi.enhanceEndpoints({
  addTagTypes: [
    'ProcessSheetComposition',
    'ProcessSheetList',
    'ProcessSheet',
    'EligibleProcessTechnicalSheets',
  ],
}).injectEndpoints({
  endpoints: (builder) => ({
    listProcessSheets: builder.query({
      query: ({ workspaceId, dossierId, page = 1, limit = 20, search, status }) => ({
        url: '/workspaces/' + workspaceId + '/dossiers/' + dossierId + '/process-sheets',
        params: Object.fromEntries(Object.entries({
          page, limit, search, status,
        }).filter(([, value]) => value !== undefined && value !== '')),
      }),
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, { workspaceId, dossierId }) => [
        { type: 'ProcessSheetList', id: workspaceId + ':' + dossierId },
      ],
    }),
    listEligibleProcessTechnicalSheets: builder.query({
      query: ({ workspaceId, dossierId, page = 1, limit = 20, search }) => ({
        url: '/workspaces/' + workspaceId + '/dossiers/' + dossierId
          + '/process-sheets/eligible-technical-sheets',
        params: Object.fromEntries(Object.entries({
          page, limit, search,
        }).filter(([, value]) => value !== undefined && value !== '')),
      }),
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, { workspaceId, dossierId }) => [
        { type: 'EligibleProcessTechnicalSheets', id: workspaceId + ':' + dossierId },
        { type: 'TechnicalSheetList', id: workspaceId + ':' + dossierId },
      ],
    }),
    createProcessSheet: builder.mutation({
      query: ({ workspaceId, dossierId, title, technicalSheetId }) => ({
        url: '/workspaces/' + workspaceId + '/dossiers/' + dossierId + '/process-sheets',
        method: 'POST',
        body: { title, technicalSheetId },
      }),
      transformResponse: (response) => response.data.process,
      invalidatesTags: (_result, _error, { workspaceId, dossierId }) => [
        { type: 'ProcessSheetList', id: workspaceId + ':' + dossierId },
        { type: 'EligibleProcessTechnicalSheets', id: workspaceId + ':' + dossierId },
      ],
    }),
    getProcessSheet: builder.query({
      query: ({ workspaceId, dossierId, processSheetId }) => ({
        url: '/workspaces/' + workspaceId + '/dossiers/' + dossierId
          + '/process-sheets/' + processSheetId,
      }),
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, { workspaceId, dossierId, processSheetId }) => [
        { type: 'ProcessSheet', id: workspaceId + ':' + dossierId + ':' + processSheetId },
      ],
    }),
    saveProcessSheetDraft: builder.mutation({
      query: ({ workspaceId, dossierId, processSheetId, expectedRevision, phases, unassignedReasons }) => ({
        url: '/workspaces/' + workspaceId + '/dossiers/' + dossierId
          + '/process-sheets/' + processSheetId + '/draft',
        method: 'PUT',
        body: { expectedRevision, phases, unassignedReasons },
      }),
      transformResponse: (response) => response.data.draft,
      invalidatesTags: (_result, _error, { workspaceId, dossierId, processSheetId }) => [
        { type: 'ProcessSheet', id: workspaceId + ':' + dossierId + ':' + processSheetId },
        { type: 'ProcessSheetList', id: workspaceId + ':' + dossierId },
      ],
    }),
    getProcessSheetComposition: builder.query({
      query: ({ workspaceId, dossierId, technicalSheetId }) => ({
        url: '/workspaces/' + workspaceId
          + '/dossiers/' + dossierId
          + '/process-sheets/technical-sheets/' + technicalSheetId
          + '/composition',
      }),
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, {
        workspaceId, dossierId, technicalSheetId,
      }) => {
        const id = compositionScopeId(
          workspaceId, dossierId, technicalSheetId,
        );
        return [
          { type: 'ProcessSheetComposition', id },
          { type: 'TechnicalSheet', id },
          { type: 'TechnicalSheetDraft', id },
        ];
      },
    }),
  }),
});

const {
  useCreateProcessSheetMutation,
  useGetProcessSheetCompositionQuery,
  useGetProcessSheetQuery,
  useListEligibleProcessTechnicalSheetsQuery,
  useListProcessSheetsQuery,
  useSaveProcessSheetDraftMutation,
} = processSheetsApi;

export {
  compositionScopeId,
  processSheetsApi,
  useCreateProcessSheetMutation,
  useGetProcessSheetCompositionQuery,
  useGetProcessSheetQuery,
  useListEligibleProcessTechnicalSheetsQuery,
  useListProcessSheetsQuery,
  useSaveProcessSheetDraftMutation,
};
