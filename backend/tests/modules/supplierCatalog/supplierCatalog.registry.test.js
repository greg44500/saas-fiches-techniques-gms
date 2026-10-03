import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
} from '../../../config/applicationGlobalPermission.registry.js';
import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
} from '../../../config/applicationCapability.registry.js';
import {
    ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY,
} from '../../../config/applicationRolePermission.registry.js';
import {
    INDICATIVE_PRICE_STATUS,
    INVOICED_PRICE_STATUS,
    SUPPLIER_APPLICABLE_PRICE_SOURCE_REGISTRY,
    SUPPLIER_PRICING_POLICY_MODE,
    SUPPLIER_RESOURCE_STATUS,
    SUPPLIER_SCOPE,
} from '../../../modules/supplierCatalog/supplierCatalog.registry.js';
import {
    SUPPLIER_CATALOG_FEATURE,
} from '../../../modules/supplierCatalog/supplierCatalogCapability.registry.js';
import {
    SUPPLIER_CATALOG_GLOBAL_PERMISSION,
} from '../../../modules/supplierCatalog/supplierCatalogGlobalPermission.registry.js';
import {
    SUPPLIER_CATALOG_PERMISSIONS,
} from '../../../modules/supplierCatalog/supplierCatalogPermission.registry.js';

describe('M-003 supplier catalog registries', () => {
    it('ferme les portées et lifecycles structurants', () => {
        expect(SUPPLIER_SCOPE).toEqual({
            GLOBAL_SHARED: 'GLOBAL_SHARED',
            WORKSPACE_PRIVATE: 'WORKSPACE_PRIVATE',
        });
        expect(SUPPLIER_RESOURCE_STATUS).toEqual({
            ACTIVE: 'ACTIVE',
            ARCHIVED: 'ARCHIVED',
        });
        expect(INVOICED_PRICE_STATUS).toEqual({
            PENDING_VALIDATION: 'PENDING_VALIDATION',
            VALIDATED: 'VALIDATED',
            REJECTED: 'REJECTED',
        });
        expect(INDICATIVE_PRICE_STATUS).toEqual({
            ACTIVE: 'ACTIVE',
            ARCHIVED: 'ARCHIVED',
        });
        expect(SUPPLIER_PRICING_POLICY_MODE.NEGOTIATED_PRICE)
            .toBe('NEGOTIATED_PRICE');
        expect(
            SUPPLIER_APPLICABLE_PRICE_SOURCE_REGISTRY
                .INDICATIVE_GLOBAL,
        ).toEqual({
            value: 'INDICATIVE_GLOBAL',
            label: 'Prix repère global',
        });
    });

    it('donne toutes les permissions M-003 au rôle système owner', () => {
        const ownerPermissions =
            ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY
                .systemRolePermissions.owner;

        expect(ownerPermissions).toEqual(
            expect.arrayContaining(SUPPLIER_CATALOG_PERMISSIONS),
        );

        for (const permission of SUPPLIER_CATALOG_PERMISSIONS) {
            expect(
                ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY.permissions,
            ).toContain(permission);
        }
    });

    it('compose la capability d import catalogue privé', () => {
        expect(
            ACTIVE_PLAN_CAPABILITY_REGISTRY.features.has(
                SUPPLIER_CATALOG_FEATURE.CATALOG_IMPORT,
            ),
        ).toBe(true);
        expect(
            ACTIVE_PLAN_CAPABILITY_REGISTRY.getFeatureDefinition(
                SUPPLIER_CATALOG_FEATURE.CATALOG_IMPORT,
            ),
        ).toEqual(expect.objectContaining({
            category: 'suppliers',
            categoryLabel: 'Fournisseurs',
        }));
    });

    it('sépare Application Global et permissions Workspace', () => {
        expect(
            ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY.permissionKeys,
        ).toEqual(expect.arrayContaining([
            SUPPLIER_CATALOG_GLOBAL_PERMISSION.READ,
            SUPPLIER_CATALOG_GLOBAL_PERMISSION.MANAGE,
        ]));
        expect(SUPPLIER_CATALOG_PERMISSIONS).not.toContain(
            SUPPLIER_CATALOG_GLOBAL_PERMISSION.MANAGE,
        );
    });
});
