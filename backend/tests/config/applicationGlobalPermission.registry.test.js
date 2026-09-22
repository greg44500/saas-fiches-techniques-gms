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
    it('reste vide dans le Core sans module métier dérivé', () => {
        expect(
            ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY.permissionKeys,
        ).toEqual([]);
        expect(
            ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY.definitions,
        ).toEqual([]);
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
