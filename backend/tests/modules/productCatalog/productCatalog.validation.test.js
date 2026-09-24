import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    createWorkspaceProductBodySchema,
    importCommitBodySchema,
    importPreviewBodySchema,
    productSearchQuerySchema,
    updateProductBodySchema,
    updateVariantBodySchema,
} from '../../../modules/productCatalog/productCatalog.validation.js';

const categoryId = '507f1f77bcf86cd799439011';

describe('M-002 product request validation', () => {
    it('valide une création Produit stricte avec catégorie obligatoire', () => {
        expect(createWorkspaceProductBodySchema.parse({
            name: 'Carotte',
            aliases: ['Carottes'],
            categoryId,
            variant: {
                foodRange: 6,
                referenceUnit: 'KG',
                yieldPercent: 100,
            },
        })).toEqual({
            name: 'Carotte',
            aliases: ['Carottes'],
            categoryId,
            reviewedCandidateIds: [],
            variant: {
                characteristicIds: [],
                foodRange: 6,
                referenceUnit: 'KG',
                yieldPercent: 100,
            },
        });

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
            variant: { foodRange: 7, referenceUnit: 'KG' },
        }).success).toBe(false);
    });

    it('valide les références structurées d une déclinaison', () => {
        expect(createWorkspaceProductBodySchema.safeParse({
            name: 'Pomme',
            categoryId,
            variant: {
                varietyId: '507f1f77bcf86cd799439012',
                characteristicIds: [
                    '507f1f77bcf86cd799439013',
                    '507f1f77bcf86cd799439014',
                ],
                foodRange: 1,
                referenceUnit: 'KG',
            },
        }).success).toBe(true);

        expect(createWorkspaceProductBodySchema.safeParse({
            name: 'Pomme',
            categoryId,
            variant: {
                characteristicIds: [
                    '507f1f77bcf86cd799439013',
                    '507f1f77bcf86cd799439013',
                ],
                foodRange: 1,
                referenceUnit: 'KG',
            },
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
            mapping: { name: 0, presentation: 1 },
            defaults: { referenceUnit: 'KG', categoryId, foodRange: 1 },
        })).toEqual({
            mapping: { name: 0, presentation: 1 },
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
