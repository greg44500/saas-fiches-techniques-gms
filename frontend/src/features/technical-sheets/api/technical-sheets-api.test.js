import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const captured = vi.hoisted(() => ({
  addTagTypes: null,
  endpointDefinitions: null,
}));

vi.mock('@/services/api/base-api', () => {
  const injectedApi = {
    injectEndpoints: vi.fn(({ endpoints }) => {
      const build = {
        query: vi.fn((definition) => ({
          ...definition,
          __kind: 'query',
        })),
        mutation: vi.fn((definition) => ({
          ...definition,
          __kind: 'mutation',
        })),
      };

      captured.endpointDefinitions =
        endpoints(build);

      const api = {
        endpoints:
          captured.endpointDefinitions,
      };

      for (const [
        name,
        definition,
      ] of Object.entries(
        captured.endpointDefinitions,
      )) {
        const suffix =
          definition.__kind === 'query'
            ? 'Query'
            : 'Mutation';
        const hookName =
          'use'
          + name.charAt(0).toUpperCase()
          + name.slice(1)
          + suffix;

        api[hookName] = vi.fn();
      }

      return api;
    }),
  };

  return {
    baseApi: {
      enhanceEndpoints: vi.fn(
        ({ addTagTypes }) => {
          captured.addTagTypes =
            addTagTypes;
          return injectedApi;
        },
      ),
    },
  };
});

import {
  TECHNICAL_SHEET_API_TAG_TYPES,
  technicalSheetsApi,
  useValuateTechnicalSheetMutation,
} from '@/features/technical-sheets/api/technical-sheets-api';

describe('technicalSheetsApi', () => {
  it('enregistre les tags RTK Query du module M-004', () => {
    expect(captured.addTagTypes).toEqual([
      ...TECHNICAL_SHEET_API_TAG_TYPES,
    ]);
    expect(
      technicalSheetsApi.endpoints,
    ).toBe(
      captured.endpointDefinitions,
    );
  });

  it('porte création et valorisation sous la portée Dossier', () => {
    expect(
      captured.endpointDefinitions
        .createTechnicalSheet
        .query({
          workspaceId: 'workspace-1',
          dossierId: 'dossier-1',
          name: 'Bœuf bourguignon',
          description: null,
          productionQuantity: '10',
          productionUnit: 'UNIT',
          vatRateBasisPoints: 1000,
        }),
    ).toEqual({
      url:
        '/workspaces/workspace-1'
        + '/dossiers/dossier-1'
        + '/technical-sheets',
      method: 'POST',
      body: {
        name: 'Bœuf bourguignon',
        description: null,
        productionQuantity: '10',
        productionUnit: 'UNIT',
        vatRateBasisPoints: 1000,
      },
    });

    expect(
      captured.endpointDefinitions
        .valuateTechnicalSheet
        .query({
          workspaceId: 'workspace-1',
          dossierId: 'dossier-1',
          technicalSheetId: 'sheet-1',
          expectedRevision: 4,
        }),
    ).toEqual({
      url:
        '/workspaces/workspace-1'
        + '/dossiers/dossier-1'
        + '/technical-sheets/sheet-1'
        + '/valuate',
      method: 'POST',
      body: {
        expectedRevision: 4,
      },
    });
  });

  it('sépare la sélection d Article fournisseur de la sauvegarde de recette', () => {
    expect(
      captured.endpointDefinitions
        .selectTechnicalSheetSupplierArticle
        .query({
          workspaceId: 'workspace-1',
          dossierId: 'dossier-1',
          technicalSheetId: 'sheet-1',
          expectedRevision: 2,
          lineId: 'line-1',
          supplierArticleId: 'article-1',
        }),
    ).toEqual({
      url:
        '/workspaces/workspace-1'
        + '/dossiers/dossier-1'
        + '/technical-sheets/sheet-1'
        + '/draft/sourcing',
      method: 'PATCH',
      body: {
        expectedRevision: 2,
        lineId: 'line-1',
        supplierArticleId: 'article-1',
      },
    });
  });

  it('invalide aussi le détail courant lors des transitions de cycle de vie', () => {
    const args = {
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      technicalSheetId: 'sheet-1',
      expectedRevision: 3,
    };

    for (const endpointName of [
      'archiveTechnicalSheet',
      'reactivateTechnicalSheet',
      'deleteTechnicalSheet',
      'restoreTechnicalSheet',
    ]) {
      expect(
        captured.endpointDefinitions[endpointName]
          .invalidatesTags(null, null, args),
      ).toEqual(
        expect.arrayContaining([
          {
            type: 'TechnicalSheet',
            id: 'workspace-1:dossier-1:sheet-1',
          },
        ]),
      );
    }
  });

  it('exporte le hook de valorisation', () => {
    expect(
      useValuateTechnicalSheetMutation,
    ).toBeTypeOf('function');
  });
});
