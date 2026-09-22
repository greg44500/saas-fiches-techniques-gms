import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    createProductContributionBodySchema,
    importCommitBodySchema,
    importPreviewBodySchema,
    productSearchQuerySchema,
    updateProductBodySchema,
    updateVariantBodySchema,
} from '../../../modules/productCatalog/productCatalog.validation.js';

describe('M-002 product request validation', () => {
    it('valide une contribution Produit stricte', () => {
        expect(createProductContributionBodySchema.parse({
            name: 'Carotte',
            aliases: ['Carottes'],
            variant: {
                referenceUnit: 'KG',
                yieldPercent: 100,
            },
        })).toEqual({
            name: 'Carotte',
            aliases: ['Carottes'],
            categoryId: null,
            reviewedCandidateIds: [],
            variant: {
                referenceUnit: 'KG',
                yieldPercent: 100,
            },
        });

        expect(createProductContributionBodySchema.safeParse({
            name: 'Carotte',
            status: 'ACTIVE',
            variant: { referenceUnit: 'KG' },
        }).success).toBe(false);
    });

    it('applique la pagination et la portée par défaut', () => {
        expect(productSearchQuerySchema.parse({})).toEqual({
            scope: 'WORKSPACE',
            page: 1,
            limit: 20,
        });
    });

    it('refuse les PATCH vides', () => {
        expect(updateProductBodySchema.safeParse({}).success).toBe(false);
        expect(updateVariantBodySchema.safeParse({}).success).toBe(false);
    });

    it('valide mapping et valeurs par défaut d import', () => {
        expect(importPreviewBodySchema.parse({
            mapping: { name: 0, form: 1 },
            defaults: { referenceUnit: 'KG' },
        })).toEqual({
            mapping: { name: 0, form: 1 },
            defaults: { referenceUnit: 'KG' },
        });

        expect(importPreviewBodySchema.safeParse({
            mapping: { name: 0, form: 0 },
            defaults: { referenceUnit: 'KG' },
        }).success).toBe(false);
    });

    it('exige variantId pour rattacher une ligne ambiguë', () => {
        expect(importCommitBodySchema.safeParse({
            decisions: [{
                rowNumber: 2,
                action: 'ATTACH_EXISTING',
            }],
        }).success).toBe(false);
    });
});
