import { baseApi } from '@/services/api/base-api';

function compositionScopeId(workspaceId, dossierId, technicalSheetId) {
  return workspaceId + ':' + dossierId + ':' + technicalSheetId;
}

// Same RTK Query base as M-004: mutations of the parent invalidate this
// projection through its existing TechnicalSheet / TechnicalSheetDraft tags.
const processSheetsApi = baseApi.enhanceEndpoints({
  addTagTypes: ['ProcessSheetComposition'],
}).injectEndpoints({
  endpoints: (builder) => ({
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

const { useGetProcessSheetCompositionQuery } = processSheetsApi;

export {
  compositionScopeId,
  processSheetsApi,
  useGetProcessSheetCompositionQuery,
};
