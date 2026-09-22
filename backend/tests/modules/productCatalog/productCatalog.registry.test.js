import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    PRODUCT_REFERENCE_UNIT_REGISTRY,
    PRODUCT_REJECTION_REASON,
    PRODUCT_STATUS,
    WORKSPACE_PRODUCT_STATUS,
} from '../../../modules/productCatalog/productCatalog.registry.js';
import {
    PRODUCT_CATALOG_PERMISSIONS,
} from '../../../modules/productCatalog/productCatalogPermission.registry.js';
import {
    PRODUCT_CATALOG_PLATFORM_PERMISSION,
} from '../../../modules/productCatalog/productCatalogPlatformPermission.registry.js';

describe('M-002 product catalog registries', () => {
    it('expose les lifecycles métier attendus', () => {
        expect(Object.values(PRODUCT_STATUS)).toEqual([
            'PENDING_REVIEW',
            'ACTIVE',
            'ARCHIVED',
            'REJECTED',
        ]);
        expect(Object.values(WORKSPACE_PRODUCT_STATUS)).toEqual([
            'ACTIVE',
            'ARCHIVED',
        ]);
        expect(Object.values(PRODUCT_REJECTION_REASON)).toContain(
            'DUPLICATE',
        );
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

    it('déclare les permissions Workspace et Platform du produit', () => {
        expect(PRODUCT_CATALOG_PERMISSIONS).toEqual([
            'product:read',
            'product:catalog:manage',
            'product:contribute',
        ]);
        expect(PRODUCT_CATALOG_PLATFORM_PERMISSION).toEqual({
            READ: 'platform:products:read',
            MANAGE: 'platform:products:manage',
        });
    });
});
