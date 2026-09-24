import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    createGlobalProductBodySchema,
    createReferenceContributionBodySchema,
    createWorkspaceProductBodySchema,
    createWorkspaceVariantBodySchema,
    importCommitBodySchema,
    importPreviewBodySchema,
    productSearchQuerySchema,
    updateProductBodySchema,
    updateVariantBodySchema,
} from '../../../modules/productCatalog/productCatalog.validation.js';

const categoryId = '507f1f77bcf86cd799439011';

describe('M-002 product request validation', () => {
    it('valide une proposition Produit Workspace minimale sans alias utilisateur', () => {
        expect(createWorkspaceProductBodySchema.parse({
            name: 'Carotte',
            categoryId,
            variant: {
                presentation: 'Râpée',
                foodRange: 1,
                usageType: 'PAI',
                referenceUnit: 'KG',
                yieldPercent: 100,
            },
        })).toEqual({
            name: 'Carotte',
            categoryId,
            variant: {
                presentation: 'Râpée',
                foodRange: 1,
                usageType: 'PAI',
                referenceUnit: 'KG',
                yieldPercent: 100,
            },
        });

        expect(createWorkspaceProductBodySchema.safeParse({
            name: 'Carotte',
            aliases: ['Carottes'],
            categoryId,
            variant: { foodRange: 1, referenceUnit: 'KG' },
        }).success).toBe(false);

        expect(createWorkspaceProductBodySchema.safeParse({
            name: 'Carotte',
            variant: { foodRange: 1, referenceUnit: 'KG' },
        }).success).toBe(false);

        expect(createWorkspaceProductBodySchema.safeParse({
            name: 'Carotte',
            categoryId,
            variant: { referenceUnit: 'KG' },
        }).success).toBe(false);

        expect(createWorkspaceProductBodySchema.safeParse({
            name: 'Carotte',
            categoryId,
            status: 'ACTIVE',
            variant: { foodRange: 1, referenceUnit: 'KG' },
        }).success).toBe(false);

        expect(createWorkspaceProductBodySchema.safeParse({
            name: 'Carotte',
            categoryId,
            variant: { foodRange: 6, referenceUnit: 'KG' },
        }).success).toBe(false);

        expect(createWorkspaceProductBodySchema.safeParse({
            name: 'Carotte',
            categoryId,
            variant: {
                foodRange: 1,
                usageType: 'INVALID',
                referenceUnit: 'KG',
            },
        }).success).toBe(false);
    });

    it('autorise un Produit global sans déclinaison initiale', () => {
        expect(createGlobalProductBodySchema.safeParse({
            name: 'Bœuf',
            categoryId,
        }).success).toBe(true);
    });

    it('valide les références structurées d une déclinaison existante', () => {
        expect(createWorkspaceVariantBodySchema.safeParse({
            varietyId: '507f1f77bcf86cd799439012',
            characteristicIds: [
                '507f1f77bcf86cd799439013',
                '507f1f77bcf86cd799439014',
            ],
            foodRange: 1,
            usageType: 'PAE',
            referenceUnit: 'KG',
        }).success).toBe(true);

        expect(createWorkspaceVariantBodySchema.safeParse({
            characteristicIds: [
                '507f1f77bcf86cd799439013',
                '507f1f77bcf86cd799439013',
            ],
            foodRange: 1,
            referenceUnit: 'KG',
        }).success).toBe(false);

        expect(createWorkspaceVariantBodySchema.safeParse({
            presentation: 'Râpée',
            foodRange: 1,
            referenceUnit: 'KG',
        }).success).toBe(false);
    });

    it('valide la granularité des contributions', () => {
        expect(createReferenceContributionBodySchema.safeParse({
            type: 'VARIETY',
            productId: '507f1f77bcf86cd799439012',
            value: 'Reinette',
        }).success).toBe(true);

        expect(createReferenceContributionBodySchema.safeParse({
            type: 'CHARACTERISTIC',
            productId: '507f1f77bcf86cd799439012',
            value: 'En botte',
        }).success).toBe(false);

        expect(createReferenceContributionBodySchema.safeParse({
            type: 'CANONICAL_PRODUCT',
            value: 'Betterave',
            categoryId,
            variant: {
                foodRange: 1,
                referenceUnit: 'KG',
            },
        }).success).toBe(true);

        expect(createReferenceContributionBodySchema.safeParse({
            type: 'CANONICAL_PRODUCT',
            value: 'Betterave',
        }).success).toBe(false);
    });

    it('applique la pagination, le tri et la portée par défaut', () => {
        expect(productSearchQuerySchema.parse({})).toEqual({
            scope: 'WORKSPACE',
            sort: 'NAME',
            page: 1,
            limit: 20,
        });

        expect(productSearchQuerySchema.parse({
            foodRange: '3',
            sort: 'FOOD_RANGE',
        })).toEqual({
            scope: 'WORKSPACE',
            foodRange: 3,
            sort: 'FOOD_RANGE',
            page: 1,
            limit: 20,
        });

        expect(productSearchQuerySchema.safeParse({
            foodRange: 6,
        }).success).toBe(false);
    });

    it('refuse les PATCH vides', () => {
        expect(updateProductBodySchema.safeParse({}).success).toBe(false);
        expect(updateVariantBodySchema.safeParse({}).success).toBe(false);
    });

    it('valide mapping et valeurs par défaut d import', () => {
        expect(importPreviewBodySchema.parse({
            mapping: {
                name: 0,
                variety: 1,
                presentation: 2,
                cut: 3,
                qualityDesignation: 4,
                usageType: 5,
            },
            defaults: { referenceUnit: 'KG', categoryId, foodRange: 1 },
        })).toEqual({
            mapping: {
                name: 0,
                variety: 1,
                presentation: 2,
                cut: 3,
                qualityDesignation: 4,
                usageType: 5,
            },
            defaults: { referenceUnit: 'KG', categoryId, foodRange: 1 },
        });

        expect(importPreviewBodySchema.safeParse({
            mapping: { name: 0, presentation: 0 },
            defaults: { referenceUnit: 'KG', foodRange: 1 },
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
