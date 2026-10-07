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
  parseDownloadFileName,
  technicalSheetsApi,
  useApplyTechnicalSheetOptimizationMutation,
  useExportTechnicalSheetMutation,
  useGetTechnicalSheetOptimizationQuery,
  useSimulateTechnicalSheetOptimizationMutation,
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

  it('rafraîchit la liste lorsqu’une version validée repasse en révision', () => {
    const tags =
      captured.endpointDefinitions
        .startTechnicalSheetDraft
        .invalidatesTags(
          null,
          null,
          {
            workspaceId:
              'workspace-1',
            dossierId:
              'dossier-1',
            technicalSheetId:
              'sheet-1',
          },
        );

    expect(tags).toEqual(
      expect.arrayContaining([
        {
          type: 'TechnicalSheetList',
          id:
            'workspace-1:dossier-1',
        },
      ]),
    );
  });

  it('configure le contexte, la simulation et l’application M-005 sous la portée Dossier', () => {
    expect(
      captured.endpointDefinitions
        .getTechnicalSheetOptimization
        .query({
          workspaceId: 'workspace-1',
          dossierId: 'dossier-1',
          technicalSheetId: 'sheet-1',
        }),
    ).toEqual({
      url:
        '/workspaces/workspace-1'
        + '/dossiers/dossier-1'
        + '/technical-sheets/sheet-1'
        + '/optimization',
    });

    const body = {
      expectedRevision: 4,
      mode: 'MANUAL',
      curve: {
        enabled: true,
        pressures: {
          VERY_LOW: 0,
          LOW: 0,
          MEDIUM: 0,
          HIGH: 0,
          VERY_HIGH: 0,
        },
      },
      lines: [],
      autoOptions: {
        adjustQuantities: true,
        productAlternatives: true,
        sourcingAlternatives: true,
      },
    };

    expect(
      captured.endpointDefinitions
        .simulateTechnicalSheetOptimization
        .query({
          workspaceId: 'workspace-1',
          dossierId: 'dossier-1',
          technicalSheetId: 'sheet-1',
          ...body,
        }),
    ).toEqual({
      url:
        '/workspaces/workspace-1'
        + '/dossiers/dossier-1'
        + '/technical-sheets/sheet-1'
        + '/optimization/simulate',
      method: 'POST',
      body,
    });

    expect(
      captured.endpointDefinitions
        .applyTechnicalSheetOptimization
        .query({
          workspaceId: 'workspace-1',
          dossierId: 'dossier-1',
          technicalSheetId: 'sheet-1',
          ...body,
          simulationFingerprint:
            'a'.repeat(64),
        }),
    ).toEqual({
      url:
        '/workspaces/workspace-1'
        + '/dossiers/dossier-1'
        + '/technical-sheets/sheet-1'
        + '/optimization/apply',
      method: 'POST',
      body: {
        ...body,
        simulationFingerprint:
          'a'.repeat(64),
      },
    });

    expect(
      useGetTechnicalSheetOptimizationQuery,
    ).toBeTypeOf('function');
    expect(
      useSimulateTechnicalSheetOptimizationMutation,
    ).toBeTypeOf('function');
    expect(
      useApplyTechnicalSheetOptimizationMutation,
    ).toBeTypeOf('function');
  });

  it('configure l’export binaire et le KPI d’usage mensuel', () => {
    expect(
      captured.endpointDefinitions
        .exportTechnicalSheet
        .query({
          workspaceId: 'workspace-1',
          dossierId: 'dossier-1',
          technicalSheetId: 'sheet-1',
          format: 'PDF',
        }),
    ).toMatchObject({
      url:
        '/workspaces/workspace-1'
        + '/dossiers/dossier-1'
        + '/technical-sheets/sheet-1'
        + '/exports',
      method: 'POST',
      body: {
        format: 'PDF',
      },
    });

    expect(
      captured.endpointDefinitions
        .getTechnicalSheetExportUsage
        .query('workspace-1'),
    ).toEqual({
      url:
        '/workspaces/workspace-1'
        + '/technical-sheets/exports/usage',
    });

    expect(
      useExportTechnicalSheetMutation,
    ).toBeTypeOf('function');
  });

  it('extrait le nom de fichier RFC 5987 renvoyé par le backend', () => {
    expect(
      parseDownloadFileName(
        "attachment; filename*=UTF-8''fiche-technique-tartine-auvergnate.pdf",
        'fallback.pdf',
      ),
    ).toBe(
      'fiche-technique-tartine-auvergnate.pdf',
    );

    expect(
      parseDownloadFileName(
        null,
        'fallback.pdf',
      ),
    ).toBe('fallback.pdf');
  });

  it('exporte le hook de valorisation', () => {
    expect(
      useValuateTechnicalSheetMutation,
    ).toBeTypeOf('function');
  });
});
