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
      return { endpoints: captured.endpointDefinitions };
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
  productCatalogApi,
} from '@/features/products/api/product-catalog-api';
import {
  PRODUCT_API_TAG_TYPES,
} from '@/features/products/api/product-api-tags';

describe('productCatalogApi', () => {
  it('étend la base API avec les tags Produits partagés', () => {
    expect(captured.addTagTypes).toEqual([...PRODUCT_API_TAG_TYPES]);
    expect(productCatalogApi.endpoints).toBe(captured.endpointDefinitions);
  });

  it('utilise les routes Workspace de création et import recadrées', () => {
    expect(
      captured.endpointDefinitions.createProduct.query({
        workspaceId: 'workspace-1',
        name: 'Carotte',
      }),
    ).toEqual({
      url: '/workspaces/workspace-1/products',
      method: 'POST',
      body: { name: 'Carotte' },
    });

    expect(
      captured.endpointDefinitions.createVariant.query({
        workspaceId: 'workspace-1',
        productId: 'product-1',
        varietyId: 'variety-1',
        characteristicIds: ['characteristic-1'],
        foodRange: 1,
        processingState: 'Produit frais',
        referenceUnit: 'KG',
      }),
    ).toEqual({
      url: '/workspaces/workspace-1/products/product-1/variants',
      method: 'POST',
      body: {
        varietyId: 'variety-1',
        characteristicIds: ['characteristic-1'],
        foodRange: 1,
        processingState: 'Produit frais',
        referenceUnit: 'KG',
      },
    });

    expect(
      captured.endpointDefinitions.getProductDimensions.query({
        workspaceId: 'workspace-1',
        productId: 'product-1',
      }),
    ).toEqual({
      url: '/workspaces/workspace-1/products/product-1/dimensions',
    });

    expect(
      captured.endpointDefinitions.contributeProductReference.query({
        workspaceId: 'workspace-1',
        type: 'VARIETY',
        productId: 'product-1',
        value: 'Gala',
      }),
    ).toEqual({
      url: '/workspaces/workspace-1/products/contributions',
      method: 'POST',
      body: {
        type: 'VARIETY',
        productId: 'product-1',
        value: 'Gala',
      },
    });

    expect(
      captured.endpointDefinitions.commitProductImport.query({
        workspaceId: 'workspace-1',
        importId: 'import-1',
        decisions: [],
      }),
    ).toEqual({
      url: '/workspaces/workspace-1/products/imports/import-1/commit',
      method: 'POST',
      body: { decisions: [] },
    });
  });
});
