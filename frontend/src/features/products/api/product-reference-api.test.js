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
      captured.endpointDefinitions.getProductReferenceDimensions.query(
        'product-1',
      ),
    ).toEqual({
      url: '/product-reference/product-1/dimensions',
    });

    expect(
      captured.endpointDefinitions.createProductReferenceVariety.query({
        productId: 'product-1',
        name: 'Gala',
      }),
    ).toEqual({
      url: '/product-reference/product-1/varieties',
      method: 'POST',
      body: { name: 'Gala' },
    });

    expect(
      captured.endpointDefinitions.listProductReferenceReviewQueue.query({
        type: 'DIMENSION_REVIEW',
        workspaceId: 'workspace-1',
        origins: 'omit',
        page: 2,
        limit: 10,
      }),
    ).toEqual({
      url: '/product-reference/review-queue',
      params: {
        type: 'DIMENSION_REVIEW',
        workspaceId: 'workspace-1',
        origins: 'omit',
        page: 2,
        limit: 10,
      },
    });

    expect(
      captured.endpointDefinitions.listProductReferenceContributions.query({
        reviewedOnly: true,
        page: 1,
        limit: 20,
      }),
    ).toEqual({
      url: '/product-reference/contributions',
      params: {
        status: undefined,
        reviewedOnly: 'true',
        page: 1,
        limit: 20,
      },
    });

    expect(
      captured.endpointDefinitions.reviewProductReferenceContribution.query({
        contributionId: 'contribution-1',
        decision: 'APPROVE',
      }),
    ).toEqual({
      url: '/product-reference/contributions/contribution-1/decision',
      method: 'POST',
      body: { decision: 'APPROVE' },
    });

    expect(
      captured.endpointDefinitions.listProductReferenceMergeCandidates.query({
        productId: 'product-1',
        variantId: 'variant-1',
        q: 'amande',
        limit: 10,
      }),
    ).toEqual({
      url:
        '/product-reference/product-1/variants/variant-1/merge-candidates',
      params: {
        q: 'amande',
        limit: 10,
      },
    });

    expect(
      captured.endpointDefinitions.previewProductReferenceVariantMerge.query({
        productId: 'product-1',
        retainedVariantId: 'variant-1',
        replacedVariantId: 'variant-2',
        targetName: 'Poudre d’amandes',
      }),
    ).toEqual({
      url: '/product-reference/product-1/variants/merge/preview',
      method: 'POST',
      body: {
        retainedVariantId: 'variant-1',
        replacedVariantId: 'variant-2',
        targetName: 'Poudre d’amandes',
      },
    });

    expect(
      captured.endpointDefinitions.mergeProductReferenceVariants.query({
        productId: 'product-1',
        retainedVariantId: 'variant-1',
        replacedVariantId: 'variant-2',
        targetName: 'Poudre d’amandes',
        previewFingerprint: 'fingerprint',
      }),
    ).toEqual({
      url: '/product-reference/product-1/variants/merge',
      method: 'POST',
      body: {
        retainedVariantId: 'variant-1',
        replacedVariantId: 'variant-2',
        targetName: 'Poudre d’amandes',
        previewFingerprint: 'fingerprint',
      },
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
