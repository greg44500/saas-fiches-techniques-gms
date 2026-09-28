import { describe, expect, it, vi } from 'vitest';

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
      captured.endpointDefinitions = endpoints(build);

      const api = {
        endpoints: captured.endpointDefinitions,
      };

      for (const [name, definition] of Object.entries(
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
      enhanceEndpoints: vi.fn(({ addTagTypes }) => {
        captured.addTagTypes = addTagTypes;
        return injectedApi;
      }),
    },
  };
});

import {
  SUPPLIER_API_TAG_TYPES,
  supplierApi,
  useUpdateSupplierCatalogStatusMutation,
} from '@/features/suppliers/api/supplier-api';

describe('supplierApi', () => {
  it('étend RTK Query avec les tags métier M-003', () => {
    expect(captured.addTagTypes).toEqual([...SUPPLIER_API_TAG_TYPES]);
    expect(supplierApi.endpoints).toBe(captured.endpointDefinitions);
  });

  it('exporte le hook de changement de statut d un catalogue Workspace', () => {
    expect(useUpdateSupplierCatalogStatusMutation).toBeTypeOf('function');
  });

  it('utilise les routes Workspace Fournisseurs et Articles', () => {
    expect(
      captured.endpointDefinitions.listSuppliers.query({
        workspaceId: 'workspace-1',
        search: 'sysco',
        status: 'ACTIVE',
        page: 2,
        limit: 50,
      }),
    ).toEqual({
      url: '/workspaces/workspace-1/suppliers',
      params: {
        page: 2,
        limit: 50,
        search: 'sysco',
        status: 'ACTIVE',
        scope: undefined,
      },
    });

    expect(
      captured.endpointDefinitions.createSupplierArticle.query({
        workspaceId: 'workspace-1',
        supplierId: 'supplier-1',
        productVariantId: 'variant-1',
        supplierReference: 'REF-1',
      }),
    ).toEqual({
      url: '/workspaces/workspace-1/supplier-articles',
      method: 'POST',
      body: {
        supplierId: 'supplier-1',
        productVariantId: 'variant-1',
        supplierReference: 'REF-1',
      },
    });
  });

  it('porte le flux import sur inspect preview commit', () => {
    const file = new File(['Reference;Designation'], 'catalogue.csv', {
      type: 'text/csv',
    });

    const inspect = captured.endpointDefinitions.inspectSupplierCatalogImport.query({
      workspaceId: 'workspace-1',
      file,
    });

    expect(inspect.url).toBe(
      '/workspaces/workspace-1/supplier-catalogs/imports/inspect',
    );
    expect(inspect.method).toBe('POST');
    expect(inspect.body).toBeInstanceOf(FormData);
    expect(inspect.body.get('file')).toBe(file);

    expect(
      captured.endpointDefinitions.previewSupplierCatalogImport.query({
        workspaceId: 'workspace-1',
        importId: 'import-1',
        supplierId: 'supplier-1',
        edition: { name: 'Septembre 2026' },
        mapping: { supplierReference: 0 },
        defaults: { currency: 'EUR' },
        decisions: [],
      }),
    ).toEqual({
      url: '/workspaces/workspace-1/supplier-catalogs/imports/import-1/preview',
      method: 'POST',
      body: {
        supplierId: 'supplier-1',
        edition: { name: 'Septembre 2026' },
        mapping: { supplierReference: 0 },
        defaults: { currency: 'EUR' },
        decisions: [],
      },
    });

    expect(
      captured.endpointDefinitions.commitSupplierCatalogImport.query({
        workspaceId: 'workspace-1',
        importId: 'import-1',
      }),
    ).toEqual({
      url: '/workspaces/workspace-1/supplier-catalogs/imports/import-1/commit',
      method: 'POST',
    });
  });

  it('résout le Prix applicable sous la portée Dossier explicite', () => {
    expect(
      captured.endpointDefinitions.getApplicableSupplierPrice.query({
        workspaceId: 'workspace-1',
        dossierId: 'dossier-1',
        articleId: 'article-1',
        atDate: '2026-09-27T00:00:00.000Z',
      }),
    ).toEqual({
      url: '/workspaces/workspace-1/dossiers/dossier-1/supplier-pricing/applicable',
      params: {
        articleId: 'article-1',
        productVariantId: undefined,
        atDate: '2026-09-27T00:00:00.000Z',
      },
    });
  });

  it('sépare l accès global Fournisseurs des routes Platform', () => {
    expect(
      captured.endpointDefinitions.getSupplierReferenceAccess.query(),
    ).toEqual({
      url: '/supplier-reference/access',
    });

    expect(
      captured.endpointDefinitions.listGlobalSuppliers.query({
        search: 'metro',
      }),
    ).toEqual({
      url: '/supplier-reference/suppliers',
      params: {
        page: 1,
        limit: 20,
        search: 'metro',
        status: 'ACTIVE',
      },
    });
  });
});
