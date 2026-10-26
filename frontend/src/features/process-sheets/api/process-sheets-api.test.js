import { describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({
  addTagTypes: null,
  endpoints: null,
}));

vi.mock('@/services/api/base-api', () => ({
  baseApi: {
    enhanceEndpoints: vi.fn(({ addTagTypes }) => {
      captured.addTagTypes = addTagTypes;
      return {
        injectEndpoints: vi.fn(({ endpoints }) => {
          captured.endpoints = endpoints({
            query: (definition) => definition,
          });
          return {
            endpoints: captured.endpoints,
            useGetProcessSheetCompositionQuery: vi.fn(),
          };
        }),
      };
    }),
  },
}));

import {
  compositionScopeId,
  processSheetsApi,
  useGetProcessSheetCompositionQuery,
} from '@/features/process-sheets/api/process-sheets-api';

describe('M-006 RTK Query — composition process', () => {
  it('déclare une lecture seule sur le contrat HTTP du backend', () => {
    expect(captured.addTagTypes).toContain('ProcessSheetComposition');
    expect(processSheetsApi.endpoints).toBe(captured.endpoints);
    expect(useGetProcessSheetCompositionQuery).toBeTypeOf('function');
    expect(Object.keys(captured.endpoints)).toEqual([
      'getProcessSheetComposition',
    ]);
    const endpoint = captured.endpoints.getProcessSheetComposition;
    expect(endpoint.query({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      technicalSheetId: 'sheet-1',
    })).toEqual({
      url: '/workspaces/workspace-1/dossiers/dossier-1'
        + '/process-sheets/technical-sheets/sheet-1/composition',
    });
    expect(endpoint.transformResponse({
      status: 'success',
      data: { currentSourceKind: 'DRAFT' },
    })).toEqual({ currentSourceKind: 'DRAFT' });
  });

  it('partage les tags M-004 pour rafraîchir la projection quand la recette change', () => {
    expect(compositionScopeId('w', 'd', 's')).toBe('w:d:s');
    expect(captured.endpoints.getProcessSheetComposition.providesTags(
      undefined,
      undefined,
      {
        workspaceId: 'w',
        dossierId: 'd',
        technicalSheetId: 's',
      },
    )).toEqual([
      { type: 'ProcessSheetComposition', id: 'w:d:s' },
      { type: 'TechnicalSheet', id: 'w:d:s' },
      { type: 'TechnicalSheetDraft', id: 'w:d:s' },
    ]);
  });
});
