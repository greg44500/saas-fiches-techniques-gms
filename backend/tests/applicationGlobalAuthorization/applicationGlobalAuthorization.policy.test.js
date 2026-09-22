import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    assertActorHasApplicationGlobalPermission,
    assertApplicationGlobalRolePermissions,
    assertApplicationGlobalRoleWithinActorAuthority,
} from '../../modules/applicationGlobalAuthorization/applicationGlobalAuthorization.policy.js';

const permissionRegistry = Object.freeze({
    permissionKeys: Object.freeze([
        'example-governance:manage',
        'example-resource:read',
        'example-resource:manage',
    ]),
    reservedPermissionKeys: Object.freeze([
        'example-governance:manage',
    ]),
});

describe('application-global authorization policy', () => {
    it('refuse une permission inconnue dans un rôle', () => {
        expect(() => assertApplicationGlobalRolePermissions({
            permissions: ['unknown:manage'],
            permissionRegistry,
        })).toThrow(/inconnue ou inactive/);
    });

    it('refuse une permission réservée dans un rôle personnalisé', () => {
        expect(() => assertApplicationGlobalRolePermissions({
            permissions: ['example-governance:manage'],
            actorPermissions: [
                'example-governance:manage',
            ],
            permissionRegistry,
        })).toThrow(/réservée/);
    });

    it('autorise les permissions réservées pour un rôle système synchronisé par le code', () => {
        expect(
            assertApplicationGlobalRolePermissions({
                permissions: [
                    'example-governance:manage',
                    'example-resource:read',
                ],
                allowReserved: true,
                permissionRegistry,
            }),
        ).toEqual([
            'example-governance:manage',
            'example-resource:read',
        ]);
    });

    it('bloque une création de rôle dépassant les permissions de l’acteur', () => {
        expect(() => assertApplicationGlobalRolePermissions({
            permissions: [
                'example-resource:read',
                'example-resource:manage',
            ],
            actorPermissions: [
                'example-resource:read',
            ],
            permissionRegistry,
        })).toThrow(/permissions que vous ne possédez pas/);
    });

    it('bloque l’administration d’un rôle plus puissant que l’acteur', () => {
        expect(() =>
            assertApplicationGlobalRoleWithinActorAuthority({
                rolePermissions: [
                    'example-resource:read',
                    'example-resource:manage',
                ],
                actorPermissions: [
                    'example-resource:read',
                ],
            }),
        ).toThrow(/incluses dans vos propres droits/);
    });

    it('exige que l’acteur possède la permission de gouvernance choisie par le produit', () => {
        expect(() =>
            assertActorHasApplicationGlobalPermission({
                authorization: {
                    permissions: [
                        'example-resource:read',
                    ],
                },
                permission: 'example-governance:manage',
                permissionRegistry,
            }),
        ).toThrow(/non autorisé/);
    });
});
