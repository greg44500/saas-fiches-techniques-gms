import { baseApi } from '@/services/api/base-api';

const DOSSIER_API_TAG_TYPES = Object.freeze([
  'DossierList',
  'Dossier',
  'DossierMetadata',
  'DossierActivity',
  'DossierAccessGrants',
]);

const DOSSIER_WRITABLE_FIELDS = Object.freeze([
  'name',
  'brand',
  'location',
  'documentEmail',
  'phone',
  'contactName',
]);

function compactDossierQueryParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => (
      value !== undefined
      && value !== null
      && value !== ''
    )),
  );
}

function createDossierRequestBody(payload) {
  return Object.fromEntries(
    DOSSIER_WRITABLE_FIELDS
      .filter((field) => Object.hasOwn(payload, field))
      .map((field) => [field, payload[field]]),
  );
}

function dossierScopeId(workspaceId, dossierId) {
  return `${workspaceId}:${dossierId}`;
}

const dossierApiBase = baseApi.enhanceEndpoints({
  addTagTypes: [...DOSSIER_API_TAG_TYPES],
});

const dossierApi = dossierApiBase.injectEndpoints({
  endpoints: (build) => ({
    listDossiers: build.query({
      query: ({
        workspaceId,
        page = 1,
        limit = 20,
        search,
        status,
      }) => ({
        url: `/workspaces/${workspaceId}/dossiers`,
        params: compactDossierQueryParams({
          page,
          limit,
          search,
          status,
        }),
      }),
      transformResponse: (response) => ({
        dossiers: response?.data?.dossiers ?? [],
        pagination: response?.meta ?? null,
      }),
      providesTags: (result, _error, { workspaceId }) => [
        { type: 'DossierList', id: workspaceId },
        ...(result?.dossiers ?? []).map((dossier) => ({
          type: 'Dossier',
          id: dossierScopeId(workspaceId, dossier.id),
        })),
      ],
    }),
    getDossierMetadata: build.query({
      query: (workspaceId) => ({
        url: `/workspaces/${workspaceId}/dossiers/metadata`,
      }),
      transformResponse: (response) => response?.data?.metadata ?? null,
      providesTags: (_result, _error, workspaceId) => [
        { type: 'DossierMetadata', id: workspaceId },
      ],
    }),
    createDossier: build.mutation({
      query: ({ workspaceId, ...payload }) => ({
        url: `/workspaces/${workspaceId}/dossiers`,
        method: 'POST',
        body: createDossierRequestBody(payload),
      }),
      transformResponse: (response) => response?.data?.dossier ?? null,
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'DossierList', id: workspaceId },
      ],
    }),
    getDossierById: build.query({
      query: ({ workspaceId, dossierId }) => ({
        url: `/workspaces/${workspaceId}/dossiers/${dossierId}`,
      }),
      transformResponse: (response) => response?.data?.dossier ?? null,
      providesTags: (_result, _error, { workspaceId, dossierId }) => [
        {
          type: 'Dossier',
          id: dossierScopeId(workspaceId, dossierId),
        },
      ],
    }),
    getDossierActivity: build.query({
      query: ({
        workspaceId,
        dossierId,
        page = 1,
        limit = 20,
      }) => ({
        url: `/workspaces/${workspaceId}/dossiers/${dossierId}/activity`,
        params: { page, limit },
      }),
      transformResponse: (response) => ({
        activity: response?.data?.activity ?? [],
        pagination: response?.meta ?? null,
      }),
      providesTags: (_result, _error, { workspaceId, dossierId }) => [
        {
          type: 'DossierActivity',
          id: dossierScopeId(workspaceId, dossierId),
        },
      ],
    }),
    updateDossier: build.mutation({
      query: ({ workspaceId, dossierId, ...payload }) => ({
        url: `/workspaces/${workspaceId}/dossiers/${dossierId}`,
        method: 'PATCH',
        body: createDossierRequestBody(payload),
      }),
      transformResponse: (response) => response?.data?.dossier ?? null,
      invalidatesTags: (_result, _error, { workspaceId, dossierId }) => [
        { type: 'DossierList', id: workspaceId },
        {
          type: 'Dossier',
          id: dossierScopeId(workspaceId, dossierId),
        },
        {
          type: 'DossierActivity',
          id: dossierScopeId(workspaceId, dossierId),
        },
      ],
    }),
    updateDossierStatus: build.mutation({
      query: ({
        workspaceId,
        dossierId,
        status,
        reason,
      }) => ({
        url: `/workspaces/${workspaceId}/dossiers/${dossierId}/status`,
        method: 'PATCH',
        body: {
          status,
          ...(reason !== undefined ? { reason } : {}),
        },
      }),
      transformResponse: (response) => response?.data?.dossier ?? null,
      invalidatesTags: (_result, _error, { workspaceId, dossierId }) => [
        { type: 'DossierList', id: workspaceId },
        {
          type: 'Dossier',
          id: dossierScopeId(workspaceId, dossierId),
        },
        {
          type: 'DossierActivity',
          id: dossierScopeId(workspaceId, dossierId),
        },
        {
          type: 'DossierAccessGrants',
          id: dossierScopeId(workspaceId, dossierId),
        },
      ],
    }),
    listDossierAccessGrants: build.query({
      query: ({
        workspaceId,
        dossierId,
        page = 1,
        limit = 20,
        status,
      }) => ({
        url: `/workspaces/${workspaceId}/dossiers/${dossierId}/access-grants`,
        params: compactDossierQueryParams({
          page,
          limit,
          status,
        }),
      }),
      transformResponse: (response) => ({
        accessGrants: response?.data?.accessGrants ?? [],
        pagination: response?.meta ?? null,
      }),
      providesTags: (_result, _error, { workspaceId, dossierId }) => [
        {
          type: 'DossierAccessGrants',
          id: dossierScopeId(workspaceId, dossierId),
        },
      ],
    }),
    grantDossierAccess: build.mutation({
      query: ({ workspaceId, dossierId, membershipId }) => ({
        url: `/workspaces/${workspaceId}/dossiers/${dossierId}/access-grants/${membershipId}`,
        method: 'PUT',
        body: {},
      }),
      transformResponse: (response) => response?.data?.accessGrant ?? null,
      invalidatesTags: (_result, _error, { workspaceId, dossierId }) => [
        {
          type: 'DossierAccessGrants',
          id: dossierScopeId(workspaceId, dossierId),
        },
        {
          type: 'DossierActivity',
          id: dossierScopeId(workspaceId, dossierId),
        },
      ],
    }),
    revokeDossierAccess: build.mutation({
      query: ({ workspaceId, dossierId, membershipId }) => ({
        url: `/workspaces/${workspaceId}/dossiers/${dossierId}/access-grants/${membershipId}`,
        method: 'DELETE',
        responseHandler: 'text',
      }),
      invalidatesTags: (_result, _error, { workspaceId, dossierId }) => [
        {
          type: 'DossierAccessGrants',
          id: dossierScopeId(workspaceId, dossierId),
        },
        {
          type: 'DossierActivity',
          id: dossierScopeId(workspaceId, dossierId),
        },
      ],
    }),
  }),
});

export const {
  useCreateDossierMutation,
  useGetDossierActivityQuery,
  useGetDossierByIdQuery,
  useGetDossierMetadataQuery,
  useGrantDossierAccessMutation,
  useListDossierAccessGrantsQuery,
  useListDossiersQuery,
  useRevokeDossierAccessMutation,
  useUpdateDossierMutation,
  useUpdateDossierStatusMutation,
} = dossierApi;

export {
  DOSSIER_API_TAG_TYPES,
  compactDossierQueryParams,
  createDossierRequestBody,
  dossierApi,
  dossierScopeId,
};
