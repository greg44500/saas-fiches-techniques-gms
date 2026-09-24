import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    PRODUCT_CHARACTERISTIC_KIND,
    PRODUCT_CHARACTERISTIC_KIND_REGISTRY,
    PRODUCT_CONTRIBUTION_CLASSIFICATION,
    PRODUCT_CONTRIBUTION_STATUS,
    PRODUCT_CONTRIBUTION_TYPE,
    PRODUCT_FOOD_RANGE_REGISTRY,
    PRODUCT_FOOD_RANGES,
    PRODUCT_IMPORT_SCOPE,
    PRODUCT_REFERENCE_UNIT_REGISTRY,
    PRODUCT_STATUS,
    PRODUCT_STATUS_REGISTRY,
    PRODUCT_USAGE_TYPE,
    PRODUCT_USAGE_TYPE_REGISTRY,
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

    it('ferme le registre des caractéristiques Produit V1', () => {
        expect(PRODUCT_CHARACTERISTIC_KIND).toEqual({
            PRESENTATION: 'PRESENTATION',
            CUT: 'CUT',
            COMMERCIAL_TYPE: 'COMMERCIAL_TYPE',
            SIZE_FORMAT: 'SIZE_FORMAT',
            COLOR: 'COLOR',
            QUALITY_DESIGNATION: 'QUALITY_DESIGNATION',
        });
        expect(PRODUCT_CHARACTERISTIC_KIND_REGISTRY.PRESENTATION.label)
            .toBe('Présentation');
        expect(PRODUCT_CHARACTERISTIC_KIND_REGISTRY.COMMERCIAL_TYPE.label)
            .toBe('Type commercial');
        expect(PRODUCT_CHARACTERISTIC_KIND_REGISTRY.CUT.label)
            .toBe('Pièce / découpe');
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

    it('décrit les cinq gammes physiques et sépare PAI / PAE', () => {
        expect(PRODUCT_FOOD_RANGES).toEqual([1, 2, 3, 4, 5]);
        expect(PRODUCT_FOOD_RANGE_REGISTRY[1]).toEqual(
            expect.objectContaining({
                label: 'Gamme 1',
                name: 'Frais',
                defaultProcessingState: 'Produit frais',
            }),
        );
        expect(PRODUCT_FOOD_RANGE_REGISTRY[6]).toBeUndefined();
        expect(PRODUCT_USAGE_TYPE).toEqual({
            PAI: 'PAI',
            PAE: 'PAE',
        });
        expect(Object.values(PRODUCT_USAGE_TYPE_REGISTRY)).toEqual([
            { value: 'PAI', label: 'PAI' },
            { value: 'PAE', label: 'PAE' },
        ]);
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

    it('fige les classifications et statuts de contribution', () => {
        expect(PRODUCT_CONTRIBUTION_CLASSIFICATION).toEqual({
            EXISTING: 'EXISTING',
            AUTO_PUBLISHABLE: 'AUTO_PUBLISHABLE',
            REVIEW_REQUIRED: 'REVIEW_REQUIRED',
            INVALID: 'INVALID',
        });
        expect(PRODUCT_CONTRIBUTION_TYPE).toEqual({
            CANONICAL_PRODUCT: 'CANONICAL_PRODUCT',
            VARIETY: 'VARIETY',
            CHARACTERISTIC: 'CHARACTERISTIC',
        });
        expect(PRODUCT_CONTRIBUTION_STATUS).toEqual({
            PENDING_REVIEW: 'PENDING_REVIEW',
            APPROVED: 'APPROVED',
            REJECTED: 'REJECTED',
        });
    });

    it('distingue les imports Workspace et globaux', () => {
        expect(PRODUCT_IMPORT_SCOPE).toEqual({
            WORKSPACE: 'WORKSPACE',
            GLOBAL: 'GLOBAL',
        });
    });
});
