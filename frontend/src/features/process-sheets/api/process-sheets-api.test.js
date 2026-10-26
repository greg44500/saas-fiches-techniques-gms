import { describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({ tags: [], endpoints: {} }));

vi.mock('@/services/api/base-api', () => ({
  baseApi: {
    enhanceEndpoints: vi.fn(({ addTagTypes }) => {
      captured.tags = addTagTypes;
      return {
        injectEndpoints: vi.fn(({ endpoints }) => {
          captured.endpoints = endpoints({
            query: (definition) => definition,
            mutation: (definition) => definition,
          });
          return { endpoints: captured.endpoints };
        }),
      };
    }),
  },
}));

import {
  compositionScopeId,
  processSheetsApi,
} from '@/features/process-sheets/api/process-sheets-api';

const scope = {
  workspaceId: 'w', dossierId: 'd',
};

describe('M-006 — contrats frontend RTK Query', () => {
  it('déclare les seules routes réelles du backend M-006', () => {
    expect(processSheetsApi.endpoints).toBe(captured.endpoints);
    expect(Object.keys(captured.endpoints).sort()).toEqual([
      'createProcessSheet', 'getProcessSheet', 'getProcessSheetComposition',
      'listEligibleProcessTechnicalSheets', 'listProcessSheets',
      'saveProcessSheetDraft',
    ].sort());
    expect(captured.tags).toEqual(expect.arrayContaining([
      'ProcessSheetComposition', 'ProcessSheetList', 'ProcessSheet',
      'EligibleProcessTechnicalSheets',
    ]));
  });

  it('sépare liste de process et liste éligible M-004', () => {
    expect(captured.endpoints.listProcessSheets.query({
      ...scope, page: 2, limit: 10, search: 'cuisson',
    })).toEqual({
      url: '/workspaces/w/dossiers/d/process-sheets',
      params: { page: 2, limit: 10, search: 'cuisson' },
    });
    expect(captured.endpoints.listEligibleProcessTechnicalSheets.query({
      ...scope, page: 1, limit: 10,
    })).toEqual({
      url: '/workspaces/w/dossiers/d/process-sheets/eligible-technical-sheets',
      params: { page: 1, limit: 10 },
    });
  });

  it('crée un process sans données M-004 ni champs de média dans le corps de requête', () => {
    expect(captured.endpoints.createProcessSheet.query({
      ...scope, technicalSheetId: 'sheet-1', title: 'Fabrication',
    })).toEqual({
      url: '/workspaces/w/dossiers/d/process-sheets',
      method: 'POST',
      body: { title: 'Fabrication', technicalSheetId: 'sheet-1' },
    });
    expect(captured.endpoints.createProcessSheet.transformResponse({
      data: { process: { id: 'process-1' } },
    })).toEqual({ id: 'process-1' });
    expect(captured.endpoints.createProcessSheet.invalidatesTags(
      undefined, undefined, scope,
    )).toEqual([
      { type: 'ProcessSheetList', id: 'w:d' },
      { type: 'EligibleProcessTechnicalSheets', id: 'w:d' },
    ]);
  });

  it('sauvegarde un brouillon par révision et invalide la fiche process', () => {
    const payload = {
      ...scope, processSheetId: 'process-1', expectedRevision: 3,
      phases: [], unassignedReasons: [],
    };
    expect(captured.endpoints.saveProcessSheetDraft.query(payload)).toEqual({
      url: '/workspaces/w/dossiers/d/process-sheets/process-1/draft',
      method: 'PUT',
      body: { expectedRevision: 3, phases: [], unassignedReasons: [] },
    });
    expect(captured.endpoints.saveProcessSheetDraft.transformResponse({
      data: { draft: { id: 'draft-1', revision: 4 } },
    })).toEqual({ id: 'draft-1', revision: 4 });
    expect(captured.endpoints.saveProcessSheetDraft.invalidatesTags(
      undefined, undefined, payload,
    )).toEqual([
      { type: 'ProcessSheet', id: 'w:d:process-1' },
      { type: 'ProcessSheetList', id: 'w:d' },
    ]);
  });

  it('conserve l’accès scoped à la composition M-004 avec invalidation M-004', () => {
    expect(compositionScopeId('w', 'd', 'sheet-1')).toBe('w:d:sheet-1');
    expect(captured.endpoints.getProcessSheetComposition.query({
      ...scope, technicalSheetId: 'sheet-1',
    })).toEqual({
      url: '/workspaces/w/dossiers/d/process-sheets/technical-sheets/sheet-1/composition',
    });
    expect(captured.endpoints.getProcessSheetComposition.providesTags(
      undefined, undefined, { ...scope, technicalSheetId: 'sheet-1' },
    )).toEqual([
      { type: 'ProcessSheetComposition', id: 'w:d:sheet-1' },
      { type: 'TechnicalSheet', id: 'w:d:sheet-1' },
      { type: 'TechnicalSheetDraft', id: 'w:d:sheet-1' },
    ]);
  });
});
