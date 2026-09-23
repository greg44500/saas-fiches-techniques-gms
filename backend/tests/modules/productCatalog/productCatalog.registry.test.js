import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    PRODUCT_FOOD_RANGE_REGISTRY,
    PRODUCT_FOOD_RANGES,
    PRODUCT_IMPORT_SCOPE,
    PRODUCT_REFERENCE_UNIT_REGISTRY,
    PRODUCT_STATUS,
    PRODUCT_STATUS_REGISTRY,
    WORKSPACE_PRODUCT_STATUS,
    WORKSPACE_PRODUCT_STATUS_REGISTRY,
} from '../../../modules/productCatalog/productCatalog.registry.js';
import {
    PRODUCT_CATALOG_GLOBAL_PERMISSION,
} from '../../../modules/productCatalog/productCatalogGlobalPermission.registry.js';
import {
    PRODUCT_CATALOG_PERMISSIONS,
} from '../../../modules/productCatalog/productCatalogPermission.registry.js';

describe('M-002 product catalog registries', () => {
    it('n expose que ACTIVE et ARCHIVED comme lifecycle opérationnel', () => {
        expect(Object.values(PRODUCT_STATUS_REGISTRY).map(({ value }) => value))
            .toEqual(['ACTIVE', 'ARCHIVED']);
        expect(PRODUCT_STATUS).toEqual({
            ACTIVE: 'ACTIVE',
            ARCHIVED: 'ARCHIVED',
        });
        expect(Object.values(WORKSPACE_PRODUCT_STATUS)).toEqual([
            'ACTIVE',
            'ARCHIVED',
        ]);
        expect(WORKSPACE_PRODUCT_STATUS_REGISTRY.ACTIVE.label)
            .toBe('Dans mon référentiel');
        expect(WORKSPACE_PRODUCT_STATUS_REGISTRY.ARCHIVED.label)
            .toBe('Retiré de mon référentiel');
    });

    it('décrit les unités de référence avec leur dimension', () => {
        expect(PRODUCT_REFERENCE_UNIT_REGISTRY.KG).toEqual(
            expect.objectContaining({
                value: 'KG',
                dimension: 'MASS',
                factorToBase: 1000,
            }),
        );
        expect(PRODUCT_REFERENCE_UNIT_REGISTRY.L).toEqual(
            expect.objectContaining({
                dimension: 'VOLUME',
                factorToBase: 1000,
            }),
        );
    });

    it('décrit les six gammes et leur état métier backend-driven', () => {
        expect(PRODUCT_FOOD_RANGES).toEqual([1, 2, 3, 4, 5, 6]);
        expect(PRODUCT_FOOD_RANGE_REGISTRY[1]).toEqual(
            expect.objectContaining({
                label: 'Gamme 1',
                name: 'Frais',
                defaultProcessingState: 'Produit frais',
            }),
        );
        expect(PRODUCT_FOOD_RANGE_REGISTRY[6]).toEqual(
            expect.objectContaining({
                label: 'Gamme 6',
                name: 'PAI / PAE',
                defaultProcessingState: 'PAI / PAE',
            }),
        );
    });

    it('sépare les permissions Workspace et Application Global', () => {
        expect(PRODUCT_CATALOG_PERMISSIONS).toEqual([
            'product:read',
            'product:catalog:manage',
            'product:contribute',
        ]);
        expect(PRODUCT_CATALOG_GLOBAL_PERMISSION).toEqual({
            READ: 'product:reference:read',
            MANAGE: 'product:reference:manage',
        });
    });

    it('distingue les imports Workspace et globaux', () => {
        expect(PRODUCT_IMPORT_SCOPE).toEqual({
            WORKSPACE: 'WORKSPACE',
            GLOBAL: 'GLOBAL',
        });
    });
});
