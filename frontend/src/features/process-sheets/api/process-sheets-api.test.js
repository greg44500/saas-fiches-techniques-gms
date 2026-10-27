import { describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({
  tags: [], endpoints: {},
  listTitlesHook: vi.fn(), createTitleHook: vi.fn(), validateHook: vi.fn(),
}));

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
          return {
            endpoints: captured.endpoints,
            useListProcessPhaseTitlesQuery: captured.listTitlesHook,
            useCreateProcessPhaseTitleMutation: captured.createTitleHook,
            useValidateProcessSheetMutation: captured.validateHook,
          };
        }),
      };
    }),
  },
}));

import {
  compositionScopeId,
  processSheetsApi,
  useListProcessPhaseTitlesQuery,
  useCreateProcessPhaseTitleMutation,
  useValidateProcessSheetMutation,
} from '@/features/process-sheets/api/process-sheets-api';

const scope = {
  workspaceId: 'w', dossierId: 'd',
};

describe('M-006 — contrats frontend RTK Query', () => {
  it('expose réellement les hooks RTK Query du catalogue aux composants', () => {
    expect(useListProcessPhaseTitlesQuery).toBe(captured.listTitlesHook);
    expect(useCreateProcessPhaseTitleMutation).toBe(captured.createTitleHook);
    expect(useValidateProcessSheetMutation).toBe(captured.validateHook);
  });

  it('déclare les seules routes réelles du backend M-006', () => {
    expect(processSheetsApi.endpoints).toBe(captured.endpoints);
    expect(Object.keys(captured.endpoints).sort()).toEqual([
      'createProcessPhaseTitle', 'createProcessSheet', 'getProcessSheet', 'getProcessSheetComposition',
      'listProcessPhaseTitles',
      'listDossierPhaseTemplates', 'listEligibleProcessTechnicalSheets',
      'listProcessSheets', 'listWorkspacePhaseTemplates', 'saveProcessSheetDraft',
      'validateProcessSheet',
    ].sort());
    expect(captured.tags).toEqual(expect.arrayContaining([
      'ProcessSheetComposition', 'ProcessSheetList', 'ProcessSheet',
      'EligibleProcessTechnicalSheets', 'ProcessPhaseTemplates', 'ProcessPhaseTitles',
    ]));
  });

  it.each([
    {
      endpoint: 'listWorkspacePhaseTemplates',
      url: '/workspaces/w/process-library/phases',
    },
    {
      endpoint: 'listDossierPhaseTemplates',
      url: '/workspaces/w/dossiers/d/process-library/phases',
    },
  ])('lit les modèles PHASE actifs du backend via $endpoint', ({ endpoint, url }) => {
    const definition = captured.endpoints[endpoint];
    expect(definition.query({ ...scope })).toEqual({
      url,
      params: { page: 1, limit: 100, status: 'ACTIVE' },
    });
    expect(definition.query({
      ...scope, page: 2, limit: 15, search: 'cuisson',
    })).toEqual({
      url,
      params: { page: 2, limit: 15, status: 'ACTIVE', search: 'cuisson' },
    });
    expect(definition.query({ ...scope, search: '' })).toEqual({
      url,
      params: { page: 1, limit: 100, status: 'ACTIVE' },
    });
    const data = {
      templates: [{
        id: 'phase-model-1', kind: 'PHASE', status: 'ACTIVE', title: 'Cuisson',
        definition: { title: 'Cuisson', steps: [{ title: 'Cuire' }] },
      }],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    };
    expect(definition.transformResponse({ status: 'success', data })).toEqual(data);
    expect(definition.providesTags).toEqual(['ProcessPhaseTemplates']);
  });

  it('utilise le catalogue commun des intitulés et invalide le cache après création', () => {
    const list = captured.endpoints.listProcessPhaseTitles;
    const create = captured.endpoints.createProcessPhaseTitle;
    expect(list.query({ workspaceId: 'w' })).toEqual({
      url: '/workspaces/w/process-phase-titles',
    });
    expect(list.transformResponse({
      data: { phases: [{ id: 'phase-1', title: 'Cuisson' }] },
    })).toEqual({ phases: [{ id: 'phase-1', title: 'Cuisson' }] });
    expect(list.providesTags(undefined, undefined, { workspaceId: 'w' }))
      .toEqual([{ type: 'ProcessPhaseTitles', id: 'w' }]);
    expect(create.query({ workspaceId: 'w', title: 'Découpe' })).toEqual({
      url: '/workspaces/w/process-phase-titles',
      method: 'POST', body: { title: 'Découpe' },
    });
    expect(create.transformResponse({
      data: { phase: { id: 'phase-2', title: 'Découpe' } },
    })).toEqual({ id: 'phase-2', title: 'Découpe' });
    expect(create.invalidatesTags(undefined, undefined, { workspaceId: 'w' }))
      .toEqual([{ type: 'ProcessPhaseTitles', id: 'w' }]);
  });

  it('valide une Fiche process avec la révision de l’agrégat et invalide les caches', () => {
    const endpoint = captured.endpoints.validateProcessSheet;
    expect(endpoint.query({
      workspaceId: 'w', dossierId: 'd', processSheetId: 'p', expectedRevision: 7,
    })).toEqual({
      url: '/workspaces/w/dossiers/d/process-sheets/p/validate',
      method: 'POST',
      body: { expectedRevision: 7 },
    });
    expect(endpoint.transformResponse({ data: { process: { editorialState: 'VALIDATED' } } }))
      .toEqual({ editorialState: 'VALIDATED' });
    expect(endpoint.invalidatesTags(null, null, {
      workspaceId: 'w', dossierId: 'd', processSheetId: 'p',
    })).toEqual([
      { type: 'ProcessSheet', id: 'w:d:p' },
      { type: 'ProcessSheetList', id: 'w:d' },
    ]);
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
