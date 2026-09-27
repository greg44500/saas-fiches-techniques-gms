import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
} from '../../config/applicationGlobalPermission.registry.js';
import {
    composeApplicationGlobalPermissions,
} from '../../modules/applicationGlobalAuthorization/applicationGlobalPermission.registry.js';
import {
    PRODUCT_CATALOG_GLOBAL_PERMISSION,
} from '../../modules/productCatalog/productCatalogGlobalPermission.registry.js';

const buildDefinition = ({
    key = 'example-resource:read',
    reserved = false,
} = {}) => ({
    key,
    label: 'Consulter la ressource',
    category: 'example',
    categoryLabel: 'Exemple',
    description: 'Permission de test fournie par une application dérivée.',
    reserved,
});

describe('application-global permission registry', () => {
    it('compose les permissions globales M-002 du produit', () => {
        expect(
            ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY.permissionKeys,
        ).toEqual(expect.arrayContaining([
            PRODUCT_CATALOG_GLOBAL_PERMISSION.READ,
            PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE,
        ]));

        expect(
            ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY.definitions,
        ).toEqual(expect.arrayContaining([
            expect.objectContaining({
                key: PRODUCT_CATALOG_GLOBAL_PERMISSION.READ,
                category: 'products',
            }),
            expect.objectContaining({
                key: PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE,
                category: 'products',
            }),
        ]));
    });

    it('compose les permissions déclarées par une application dérivée', () => {
        const registry = composeApplicationGlobalPermissions([
            {
                permissions: [
                    buildDefinition(),
                    buildDefinition({
                        key: 'example-governance:manage',
                        reserved: true,
                    }),
                ],
            },
        ]);

        expect(registry.permissionKeys).toEqual([
            'example-resource:read',
            'example-governance:manage',
        ]);
        expect(registry.reservedPermissionKeys).toEqual([
            'example-governance:manage',
        ]);
    });

    it('refuse une collision avec une permission Workspace', () => {
        expect(() => composeApplicationGlobalPermissions(
            [
                {
                    permissions: [
                        buildDefinition({
                            key: 'workspace:read',
                        }),
                    ],
                },
            ],
            {
                workspacePermissionKeys: ['workspace:read'],
            },
        )).toThrow(/collides with another authorization scope/);
    });

    it('refuse le namespace Workspace même sans collision déclarée', () => {
        expect(() => composeApplicationGlobalPermissions([
            {
                permissions: [
                    buildDefinition({
                        key: 'workspace:global_manage',
                    }),
                ],
            },
        ])).toThrow(/Platform or Workspace namespaces/);
    });

    it('refuse le namespace Platform même sans collision déclarée', () => {
        expect(() => composeApplicationGlobalPermissions([
            {
                permissions: [
                    buildDefinition({
                        key: 'platform:global_manage',
                    }),
                ],
            },
        ])).toThrow(/Platform or Workspace namespaces/);
    });

    it('refuse une collision avec une permission Platform', () => {
        expect(() => composeApplicationGlobalPermissions(
            [
                {
                    permissions: [
                        buildDefinition({
                            key: 'platform:users:read',
                        }),
                    ],
                },
            ],
            {
                platformPermissionKeys: [
                    'platform:users:read',
                ],
            },
        )).toThrow(/Platform namespace|collides/);
    });

    it('refuse deux déclarations globales portant la même clé', () => {
        expect(() => composeApplicationGlobalPermissions([
            {
                permissions: [buildDefinition()],
            },
            {
                permissions: [buildDefinition()],
            },
        ])).toThrow(/Duplicate application-global permission/);
    });
});
