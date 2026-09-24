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

const minimalReference = {
    name: 'Carotte râpée',
    conservationType: 'FRAIS',
    referenceUnit: 'KG',
};

describe('M-002 product request validation', () => {
    it('valide une proposition Workspace avec conservation obligatoire et catégorie facultative', () => {
        expect(createWorkspaceProductBodySchema.parse({
            name: 'Carotte',
            variant: minimalReference,
        })).toEqual({
            name: 'Carotte',
            categoryId: null,
            variant: {
                ...minimalReference,
                foodRange: null,
            },
        });

        expect(createWorkspaceProductBodySchema.safeParse({
            name: 'Carotte',
            aliases: ['Carottes'],
            variant: minimalReference,
        }).success).toBe(false);

        expect(createWorkspaceProductBodySchema.safeParse({
            name: 'Carotte',
            variant: {
                name: 'Carotte',
                referenceUnit: 'KG',
            },
        }).success).toBe(false);

        expect(createWorkspaceProductBodySchema.safeParse({
            name: 'Carotte',
            status: 'ACTIVE',
            variant: minimalReference,
        }).success).toBe(false);
    });

    it('accepte les Gammes 1 à 6, facultatives, et refuse usageType', () => {
        expect(createWorkspaceProductBodySchema.safeParse({
            name: 'Farine de blé',
            categoryId,
            variant: {
                ...minimalReference,
                name: 'Farine de blé',
                conservationType: 'SEC',
                foodRange: null,
            },
        }).success).toBe(true);

        expect(createWorkspaceProductBodySchema.safeParse({
            name: 'Sauce cuisinée',
            variant: {
                ...minimalReference,
                name: 'Sauce cuisinée',
                foodRange: 6,
            },
        }).success).toBe(true);

        expect(createWorkspaceProductBodySchema.safeParse({
            name: 'Sauce cuisinée',
            variant: {
                ...minimalReference,
                usageType: 'PAI',
            },
        }).success).toBe(false);
    });

    it('autorise un Produit global sans référence initiale ni catégorie', () => {
        expect(createGlobalProductBodySchema.safeParse({
            name: 'Bœuf',
        }).success).toBe(true);
    });

    it('valide une référence structurée avec dimensions facultatives', () => {
        expect(createWorkspaceVariantBodySchema.safeParse({
            ...minimalReference,
            varietyId: '507f1f77bcf86cd799439012',
            characteristicIds: [
                '507f1f77bcf86cd799439013',
                '507f1f77bcf86cd799439014',
            ],
            foodRange: 1,
        }).success).toBe(true);

        expect(createWorkspaceVariantBodySchema.safeParse({
            ...minimalReference,
            characteristicIds: [
                '507f1f77bcf86cd799439013',
                '507f1f77bcf86cd799439013',
            ],
        }).success).toBe(false);
    });

    it('valide les contributions Produit sans rendre la catégorie obligatoire', () => {
        expect(createReferenceContributionBodySchema.safeParse({
            type: 'CANONICAL_PRODUCT',
            value: 'Betterave',
            variant: {
                ...minimalReference,
                name: 'Betterave',
            },
        }).success).toBe(true);

        expect(createReferenceContributionBodySchema.safeParse({
            type: 'CANONICAL_PRODUCT',
            value: 'Betterave',
        }).success).toBe(false);
    });

    it('applique pagination, tri et filtres du nouveau contrat', () => {
        expect(productSearchQuerySchema.parse({})).toEqual({
            scope: 'WORKSPACE',
            sort: 'NAME',
            page: 1,
            limit: 20,
        });

        expect(productSearchQuerySchema.parse({
            conservationType: 'SURGELE',
            foodRange: '6',
            sort: 'FOOD_RANGE',
        })).toEqual({
            scope: 'WORKSPACE',
            conservationType: 'SURGELE',
            foodRange: 6,
            sort: 'FOOD_RANGE',
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
            mapping: {
                name: 0,
                conservationType: 1,
                referenceUnit: 2,
            },
            defaults: { categoryId },
        })).toEqual({
            mapping: {
                name: 0,
                conservationType: 1,
                referenceUnit: 2,
            },
            defaults: { categoryId },
        });

        expect(importPreviewBodySchema.safeParse({
            mapping: { name: 0, conservationType: 0 },
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
