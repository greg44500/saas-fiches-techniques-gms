import { describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({
  addTagTypes: null,
  endpointDefinitions: null,
}));

vi.mock('@/services/api/base-api', () => {
  const injectedApi = {
    injectEndpoints: vi.fn(({ endpoints }) => {
      const build = {
        query: vi.fn((definition) => definition),
        mutation: vi.fn((definition) => definition),
      };

      captured.endpointDefinitions = endpoints(build);

      return {
        endpoints: captured.endpointDefinitions,
      };
    }),
  };

  return {
    baseApi: {
      enhanceEndpoints: vi.fn(({ addTagTypes }) => {
        captured.addTagTypes = addTagTypes;
        return injectedApi;
      }),
    },
  };
});

import {
  DOSSIER_API_TAG_TYPES,
  compactDossierQueryParams,
  createDossierRequestBody,
  dossierApi,
} from '@/features/dossiers/api/dossiers-api';

describe('dossierApi', () => {
  it('enrichit la seule API RTK Query avec les tags métier M-001', () => {
    expect(captured.addTagTypes).toEqual([...DOSSIER_API_TAG_TYPES]);
    expect(dossierApi.endpoints).toBe(captured.endpointDefinitions);
  });

  it('déclare exactement les dix endpoints du contrat REST M-001', () => {
    expect(Object.keys(captured.endpointDefinitions)).toEqual([
      'listDossiers',
      'getDossierMetadata',
      'createDossier',
      'getDossierById',
      'getDossierActivity',
      'updateDossier',
      'updateDossierStatus',
      'listDossierAccessGrants',
      'grantDossierAccess',
      'revokeDossierAccess',
    ]);
  });

  it('construit la liste avec pagination et filtres optionnels compacts', () => {
    expect(captured.endpointDefinitions.listDossiers.query({
      workspaceId: 'workspace-1',
      page: 2,
      limit: 50,
      search: '',
      status: 'ARCHIVED',
    })).toEqual({
      url: '/workspaces/workspace-1/dossiers',
      params: {
        page: 2,
        limit: 50,
        status: 'ARCHIVED',
      },
    });

    expect(captured.endpointDefinitions.listDossiers.transformResponse({
      data: { dossiers: [{ id: 'dossier-1' }] },
      meta: { page: 2, total: 1 },
    })).toEqual({
      dossiers: [{ id: 'dossier-1' }],
      pagination: { page: 2, total: 1 },
    });
  });

  it('charge les metadata backend-driven sans reconstruire le vocabulaire métier', () => {
    expect(captured.endpointDefinitions.getDossierMetadata.query('workspace-1')).toEqual({
      url: '/workspaces/workspace-1/dossiers/metadata',
    });

    const metadata = {
      dossierStatuses: [{ value: 'ACTIVE', label: 'Actif' }],
      statusTransitions: { ACTIVE: ['PAUSED'] },
    };

    expect(captured.endpointDefinitions.getDossierMetadata.transformResponse({
      data: { metadata },
    })).toBe(metadata);
  });

  it('limite les payloads création et édition aux champs métier autorisés', () => {
    const payload = {
      name: 'Magasin Nantes',
      brand: null,
      location: {
        address: '1 rue Exemple',
        postalCode: '44000',
        city: 'Nantes',
      },
      documentEmail: 'docs@example.test',
      phone: null,
      contactName: 'Responsable',
      status: 'DELETED',
      workspace: 'other-workspace',
    };

    expect(createDossierRequestBody(payload)).toEqual({
      name: 'Magasin Nantes',
      brand: null,
      location: payload.location,
      documentEmail: 'docs@example.test',
      phone: null,
      contactName: 'Responsable',
    });

    expect(captured.endpointDefinitions.createDossier.query({
      workspaceId: 'workspace-1',
      ...payload,
    })).toEqual({
      url: '/workspaces/workspace-1/dossiers',
      method: 'POST',
      body: createDossierRequestBody(payload),
    });

    expect(captured.endpointDefinitions.updateDossier.query({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      brand: null,
      status: 'ARCHIVED',
    })).toEqual({
      url: '/workspaces/workspace-1/dossiers/dossier-1',
      method: 'PATCH',
      body: { brand: null },
    });
  });

  it('aligne détail, activité et lifecycle sur les routes backend', () => {
    expect(captured.endpointDefinitions.getDossierById.query({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
    })).toEqual({
      url: '/workspaces/workspace-1/dossiers/dossier-1',
    });

    expect(captured.endpointDefinitions.getDossierActivity.query({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      page: 3,
      limit: 10,
    })).toEqual({
      url: '/workspaces/workspace-1/dossiers/dossier-1/activity',
      params: { page: 3, limit: 10 },
    });

    expect(captured.endpointDefinitions.updateDossierStatus.query({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      status: 'PAUSED',
    })).toEqual({
      url: '/workspaces/workspace-1/dossiers/dossier-1/status',
      method: 'PATCH',
      body: { status: 'PAUSED' },
    });

    expect(captured.endpointDefinitions.updateDossierStatus.query({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      status: 'DELETED',
      reason: 'Fermeture du magasin',
    }).body).toEqual({
      status: 'DELETED',
      reason: 'Fermeture du magasin',
    });
  });

  it('aligne les affectations sur GET, PUT et DELETE imbriqués sous le Dossier', () => {
    expect(captured.endpointDefinitions.listDossierAccessGrants.query({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      page: 1,
      limit: 20,
    })).toEqual({
      url: '/workspaces/workspace-1/dossiers/dossier-1/access-grants',
      params: { page: 1, limit: 20 },
    });

    expect(captured.endpointDefinitions.grantDossierAccess.query({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      membershipId: 'membership-1',
    })).toEqual({
      url: '/workspaces/workspace-1/dossiers/dossier-1/access-grants/membership-1',
      method: 'PUT',
      body: {},
    });

    expect(captured.endpointDefinitions.revokeDossierAccess.query({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      membershipId: 'membership-1',
    })).toEqual({
      url: '/workspaces/workspace-1/dossiers/dossier-1/access-grants/membership-1',
      method: 'DELETE',
      responseHandler: 'text',
    });
  });

  it('conserve les valeurs null et retire seulement les paramètres absents ou vides', () => {
    expect(compactDossierQueryParams({
      page: 1,
      limit: 20,
      search: undefined,
      status: '',
    })).toEqual({
      page: 1,
      limit: 20,
    });
  });
});
