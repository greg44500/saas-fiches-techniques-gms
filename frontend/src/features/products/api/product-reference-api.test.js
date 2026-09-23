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
  PRODUCT_API_TAG_TYPES,
} from '@/features/products/api/product-api-tags';
import {
  productReferenceApi,
} from '@/features/products/api/product-reference-api';

describe('productReferenceApi', () => {
  it('étend la base API avec les tags Produits partagés', () => {
    expect(captured.addTagTypes).toEqual([...PRODUCT_API_TAG_TYPES]);
    expect(productReferenceApi.endpoints).toBe(captured.endpointDefinitions);
  });

  it('déclare création, duplicate-check et import globaux', () => {
    expect(
      captured.endpointDefinitions.duplicateCheckProductReference.query({
        name: 'Carotte',
        aliases: [],
      }),
    ).toEqual({
      url: '/product-reference/duplicate-check',
      method: 'POST',
      body: { name: 'Carotte', aliases: [] },
    });

    expect(
      captured.endpointDefinitions.createProductReference.query({
        name: 'Carotte',
      }),
    ).toEqual({
      url: '/product-reference',
      method: 'POST',
      body: { name: 'Carotte' },
    });

    expect(
      captured.endpointDefinitions.commitProductReferenceImport.query({
        importId: 'import-1',
        decisions: [],
      }),
    ).toEqual({
      url: '/product-reference/imports/import-1/commit',
      method: 'POST',
      body: { decisions: [] },
    });
  });
});
