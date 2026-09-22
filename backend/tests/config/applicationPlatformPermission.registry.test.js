import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    PLATFORM_PERMISSION,
    PLATFORM_PERMISSION_SENSITIVITY,
} from '../../constants/platformPermissions.constants.js';
import {
    ACTIVE_PLATFORM_PERMISSION_REGISTRY,
    LEGACY_PLATFORM_PERMISSION_KEYS,
    composeApplicationPlatformPermissions,
    getPlatformPermissionDefinition,
} from '../../config/applicationPlatformPermission.registry.js';
import {
    PRODUCT_CATALOG_PLATFORM_PERMISSION,
} from '../../modules/productCatalog/productCatalogPlatformPermission.registry.js';


describe('applicationPlatformPermission registry', () => {
    it('expose le catalogue Core actif et reconnaît les clés legacy pendant la migration', () => {
        expect(
            ACTIVE_PLATFORM_PERMISSION_REGISTRY.definitions.some(
                ({ key }) => key === PLATFORM_PERMISSION.TEAM_INVITE,
            ),
        ).toBe(true);

        expect(
            ACTIVE_PLATFORM_PERMISSION_REGISTRY.definitions.some(
                ({ key }) => key === PLATFORM_PERMISSION.USERS_CLOSE,
            ),
        ).toBe(true);

        expect(
            ACTIVE_PLATFORM_PERMISSION_REGISTRY.permissionKeys,
        ).toEqual(
            expect.arrayContaining(LEGACY_PLATFORM_PERMISSION_KEYS),
        );
    });

    it('réserve au niveau Platform la capacité exceptionnelle de transfert de propriété', () => {
        expect(
            getPlatformPermissionDefinition(
                PLATFORM_PERMISSION.WORKSPACES_OWNERSHIP_TRANSFER_AUTHORIZE,
            ),
        ).toEqual(
            expect.objectContaining({
                category: 'workspaces',
                sensitivity: PLATFORM_PERMISSION_SENSITIVITY.RESERVED,
            }),
        );
    });

    it('compose une permission Platform fournie par une application dérivée', () => {
        const registry = composeApplicationPlatformPermissions([
            {
                permissions: [
                    {
                        key: 'platform:catalog:read',
                        label: 'Consulter le catalogue',
                        category: 'catalog',
                        categoryLabel: 'Catalogue',
                        description: 'Consulter le catalogue métier.',
                        sensitivity:
                            PLATFORM_PERMISSION_SENSITIVITY.DELEGABLE,
                    },
                ],
            },
        ]);

        expect(registry.permissionKeys).toContain(
            'platform:catalog:read',
        );
        expect(registry.definitions).toContainEqual(
            expect.objectContaining({
                key: 'platform:catalog:read',
                category: 'catalog',
            }),
        );
    });

    it('compose les permissions Platform M-002 du produit', () => {
        expect(
            ACTIVE_PLATFORM_PERMISSION_REGISTRY.permissionKeys,
        ).toEqual(
            expect.arrayContaining([
                PRODUCT_CATALOG_PLATFORM_PERMISSION.READ,
                PRODUCT_CATALOG_PLATFORM_PERMISSION.MANAGE,
            ]),
        );

        expect(
            getPlatformPermissionDefinition(
                PRODUCT_CATALOG_PLATFORM_PERMISSION.MANAGE,
            ),
        ).toEqual(
            expect.objectContaining({
                category: 'products',
                sensitivity: PLATFORM_PERMISSION_SENSITIVITY.RESERVED,
            }),
        );
    });

    it('refuse une permission dupliquée', () => {
        expect(() => composeApplicationPlatformPermissions([
            {
                permissions: [
                    {
                        key: PLATFORM_PERMISSION.USERS_READ,
                        label: 'Doublon',
                        category: 'users',
                        categoryLabel: 'Utilisateurs',
                        description: 'Définition interdite.',
                        sensitivity:
                            PLATFORM_PERMISSION_SENSITIVITY.DELEGABLE,
                    },
                ],
            },
        ])).toThrow(/Duplicate Platform permission/);
    });

    it('refuse une sensibilité inconnue', () => {
        expect(() => composeApplicationPlatformPermissions([
            {
                permissions: [
                    {
                        key: 'platform:catalog:update',
                        label: 'Modifier le catalogue',
                        category: 'catalog',
                        categoryLabel: 'Catalogue',
                        description: 'Modifier le catalogue métier.',
                        sensitivity: 'critical',
                    },
                ],
            },
        ])).toThrow(/sensitivity/);
    });
});
