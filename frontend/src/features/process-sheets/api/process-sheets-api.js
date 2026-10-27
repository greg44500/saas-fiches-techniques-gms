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
    'ProcessPhaseTemplates',
    'ProcessPhaseTitles',
  ],
}).injectEndpoints({
  endpoints: (builder) => ({
    listProcessPhaseTitles: builder.query({
      query: ({ workspaceId }) => ({
        url: '/workspaces/' + workspaceId + '/process-phase-titles',
      }),
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, { workspaceId }) => [
        { type: 'ProcessPhaseTitles', id: workspaceId },
      ],
    }),
    createProcessPhaseTitle: builder.mutation({
      query: ({ workspaceId, title }) => ({
        url: '/workspaces/' + workspaceId + '/process-phase-titles',
        method: 'POST',
        body: { title },
      }),
      transformResponse: (response) => response.data.phase,
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'ProcessPhaseTitles', id: workspaceId },
      ],
    }),
    // The editor reads ACTIVE PHASE templates without copying their steps.
    listWorkspacePhaseTemplates: builder.query({
      query: ({ workspaceId, page = 1, limit = 100, search }) => ({
        url: '/workspaces/' + workspaceId + '/process-library/phases',
        params: Object.fromEntries(Object.entries({
          page, limit, status: 'ACTIVE', search,
        }).filter(([, value]) => value !== undefined && value !== '')),
      }),
      transformResponse: (response) => response.data,
      providesTags: ['ProcessPhaseTemplates'],
    }),
    listDossierPhaseTemplates: builder.query({
      query: ({ workspaceId, dossierId, page = 1, limit = 100, search }) => ({
        url: '/workspaces/' + workspaceId + '/dossiers/' + dossierId
          + '/process-library/phases',
        params: Object.fromEntries(Object.entries({
          page, limit, status: 'ACTIVE', search,
        }).filter(([, value]) => value !== undefined && value !== '')),
      }),
      transformResponse: (response) => response.data,
      providesTags: ['ProcessPhaseTemplates'],
    }),
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
    validateProcessSheet: builder.mutation({
      query: ({ workspaceId, dossierId, processSheetId, expectedRevision }) => ({
        url: '/workspaces/' + workspaceId + '/dossiers/' + dossierId
          + '/process-sheets/' + processSheetId + '/validate',
        method: 'POST',
        body: { expectedRevision },
      }),
      transformResponse: (response) => response.data.process,
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
  useCreateProcessPhaseTitleMutation,
  useListProcessPhaseTitlesQuery,
  useCreateProcessSheetMutation,
  useGetProcessSheetCompositionQuery,
  useGetProcessSheetQuery,
  useListEligibleProcessTechnicalSheetsQuery,
  useListProcessSheetsQuery,
  useSaveProcessSheetDraftMutation,
  useValidateProcessSheetMutation,
  useListWorkspacePhaseTemplatesQuery,
  useListDossierPhaseTemplatesQuery,
} = processSheetsApi;

export {
  compositionScopeId,
  processSheetsApi,
  useCreateProcessPhaseTitleMutation,
  useListProcessPhaseTitlesQuery,
  useCreateProcessSheetMutation,
  useGetProcessSheetCompositionQuery,
  useGetProcessSheetQuery,
  useListEligibleProcessTechnicalSheetsQuery,
  useListProcessSheetsQuery,
  useSaveProcessSheetDraftMutation,
  useValidateProcessSheetMutation,
  useListWorkspacePhaseTemplatesQuery,
  useListDossierPhaseTemplatesQuery,
};
