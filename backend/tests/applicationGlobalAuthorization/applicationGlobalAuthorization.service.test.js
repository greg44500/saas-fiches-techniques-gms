import mongoose from 'mongoose';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    APPLICATION_GLOBAL_MEMBER_STATUS,
    APPLICATION_GLOBAL_ROLE_STATUS,
} from '../../constants/applicationGlobalAuthorization.constants.js';
import {
    resolveApplicationGlobalAuthorization,
} from '../../modules/applicationGlobalAuthorization/applicationGlobalAuthorization.service.js';
import {
    ApplicationGlobalMember,
} from '../../modules/applicationGlobalAuthorization/applicationGlobalMember.model.js';
import {
    ApplicationGlobalRole,
} from '../../modules/applicationGlobalAuthorization/applicationGlobalRole.model.js';

vi.mock('mongoose', () => ({
    default: {
        trusted: vi.fn((value) => value),
    },
}));

vi.mock(
    '../../modules/applicationGlobalAuthorization/applicationGlobalMember.model.js',
    () => ({
        ApplicationGlobalMember: {
            findOne: vi.fn(),
            exists: vi.fn(),
        },
    }),
);

vi.mock(
    '../../modules/applicationGlobalAuthorization/applicationGlobalRole.model.js',
    () => ({
        ApplicationGlobalRole: {
            findById: vi.fn(),
        },
    }),
);

const permissionRegistry = Object.freeze({
    permissionKeys: Object.freeze([
        'example-resource:read',
        'example-resource:manage',
    ]),
    reservedPermissionKeys: Object.freeze([]),
});

const queryResult = (value) => ({
    session: vi.fn().mockResolvedValue(value),
    then(resolve, reject) {
        return Promise.resolve(value).then(
            resolve,
            reject,
        );
    },
});

const user = {
    _id: 'user-id',
    platformRole: 'super_admin',
};

describe('resolveApplicationGlobalAuthorization', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        ApplicationGlobalMember.exists.mockReturnValue(
            queryResult(null),
        );
    });

    it('résout les permissions du rôle global courant', async () => {
        ApplicationGlobalMember.findOne.mockReturnValue(
            queryResult({
                _id: 'member-id',
                role: 'role-id',
                status:
                    APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE,
            }),
        );
        ApplicationGlobalRole.findById.mockReturnValue(
            queryResult({
                _id: 'role-id',
                key: 'governor',
                status:
                    APPLICATION_GLOBAL_ROLE_STATUS.ACTIVE,
                isSystem: true,
                permissions: [
                    'example-resource:read',
                    'example-resource:manage',
                ],
            }),
        );

        const authorization =
            await resolveApplicationGlobalAuthorization({
                user,
                permissionRegistry,
            });

        expect(mongoose.trusted).toHaveBeenCalledWith({
            $in: [
                APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE,
                APPLICATION_GLOBAL_MEMBER_STATUS.SUSPENDED,
            ],
        });
        expect(authorization.roleKey).toBe('governor');
        expect(authorization.permissions).toEqual([
            'example-resource:read',
            'example-resource:manage',
        ]);
    });

    it('retire toutes les permissions à un membre suspendu', async () => {
        ApplicationGlobalMember.findOne.mockReturnValue(
            queryResult({
                _id: 'member-id',
                role: 'role-id',
                status:
                    APPLICATION_GLOBAL_MEMBER_STATUS.SUSPENDED,
            }),
        );

        const authorization =
            await resolveApplicationGlobalAuthorization({
                user,
                permissionRegistry,
            });

        expect(authorization.permissions).toEqual([]);
        expect(
            ApplicationGlobalRole.findById,
        ).not.toHaveBeenCalled();
    });

    it('n’accorde aucun droit via un rôle archivé', async () => {
        ApplicationGlobalMember.findOne.mockReturnValue(
            queryResult({
                _id: 'member-id',
                role: 'role-id',
                status:
                    APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE,
            }),
        );
        ApplicationGlobalRole.findById.mockReturnValue(
            queryResult({
                _id: 'role-id',
                key: 'archived-role',
                status:
                    APPLICATION_GLOBAL_ROLE_STATUS.ARCHIVED,
                isSystem: true,
                permissions: [
                    'example-resource:manage',
                ],
            }),
        );

        const authorization =
            await resolveApplicationGlobalAuthorization({
                user,
                permissionRegistry,
            });

        expect(authorization.permissions).toEqual([]);
    });

    it('refuse un rôle persistant contenant une permission inconnue', async () => {
        ApplicationGlobalMember.findOne.mockReturnValue(
            queryResult({
                _id: 'member-id',
                role: 'role-id',
                status:
                    APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE,
            }),
        );
        ApplicationGlobalRole.findById.mockReturnValue(
            queryResult({
                _id: 'role-id',
                key: 'invalid-role',
                status:
                    APPLICATION_GLOBAL_ROLE_STATUS.ACTIVE,
                isSystem: true,
                permissions: ['unknown-resource:manage'],
            }),
        );

        await expect(
            resolveApplicationGlobalAuthorization({
                user,
                permissionRegistry,
            }),
        ).rejects.toMatchObject({
            statusCode: 403,
        });
    });

    it('ne transforme jamais un rôle Platform en autorité métier globale', async () => {
        ApplicationGlobalMember.findOne.mockReturnValue(
            queryResult(null),
        );
        ApplicationGlobalMember.exists.mockReturnValue(
            queryResult(null),
        );

        const authorization =
            await resolveApplicationGlobalAuthorization({
                user,
                permissionRegistry,
            });

        expect(user.platformRole).toBe('super_admin');
        expect(authorization.source).toBe('none');
        expect(authorization.permissions).toEqual([]);
    });

    it('conserve un historique révoqué sans restaurer de droit', async () => {
        ApplicationGlobalMember.findOne.mockReturnValue(
            queryResult(null),
        );
        ApplicationGlobalMember.exists.mockReturnValue(
            queryResult({
                _id: 'historical-member-id',
            }),
        );

        const authorization =
            await resolveApplicationGlobalAuthorization({
                user,
                permissionRegistry,
            });

        expect(authorization.source).toBe(
            'application_global_history',
        );
        expect(authorization.status).toBe(
            APPLICATION_GLOBAL_MEMBER_STATUS.REVOKED,
        );
        expect(authorization.permissions).toEqual([]);
    });
});
