import mongoose from 'mongoose';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';

import {
    APPLICATION_GLOBAL_MEMBER_STATUS,
    APPLICATION_GLOBAL_ROLE_STATUS,
} from '../../constants/applicationGlobalAuthorization.constants.js';
import {
    PLATFORM_ROLE,
} from '../../constants/platformRoles.constants.js';
import { AuditLog } from '../../modules/auditLog/auditLog.model.js';
import {
    resolveApplicationGlobalAuthorization,
} from '../../modules/applicationGlobalAuthorization/applicationGlobalAuthorization.service.js';
import {
    assignApplicationGlobalRole,
    bootstrapApplicationGlobalMember,
    reactivateApplicationGlobalMember,
    revokeApplicationGlobalMember,
    suspendApplicationGlobalMember,
} from '../../modules/applicationGlobalAuthorization/applicationGlobalMember.service.js';
import {
    ApplicationGlobalMember,
} from '../../modules/applicationGlobalAuthorization/applicationGlobalMember.model.js';
import {
    createCustomApplicationGlobalRole,
    syncApplicationGlobalSystemRole,
} from '../../modules/applicationGlobalAuthorization/applicationGlobalRole.service.js';
import {
    ApplicationGlobalRole,
} from '../../modules/applicationGlobalAuthorization/applicationGlobalRole.model.js';
import {
    composeApplicationGlobalPermissions,
} from '../../modules/applicationGlobalAuthorization/applicationGlobalPermission.registry.js';
import { User } from '../../modules/users/user.model.js';
import {
    connectTestDatabase,
    disconnectTestDatabase,
} from '../helpers/testDatabase.js';

const permissionRegistry =
    composeApplicationGlobalPermissions([
        {
            permissions: [
                {
                    key: 'example-governance:manage',
                    label: 'Gouverner',
                    category: 'example',
                    categoryLabel: 'Exemple',
                    description: 'Administrer les rôles globaux de test.',
                    reserved: true,
                },
                {
                    key: 'example-resource:read',
                    label: 'Lire',
                    category: 'example',
                    categoryLabel: 'Exemple',
                    description: 'Lire une ressource globale de test.',
                },
                {
                    key: 'example-resource:manage',
                    label: 'Gérer',
                    category: 'example',
                    categoryLabel: 'Exemple',
                    description: 'Gérer une ressource globale de test.',
                },
            ],
        },
    ]);

const createdUserIds = [];

const createUser = async ({
    suffix,
    platformRole = PLATFORM_ROLE.USER,
}) => {
    const user = await User.create({
        firstName: 'Global',
        lastName: 'Auth',
        email: 'global-' + suffix + '@example.test',
        emailCanonical:
            'global-' + suffix + '@example.test',
        platformRole,
    });

    createdUserIds.push(user._id);

    return user;
};

describe('application-global authorization integration', () => {
    beforeAll(async () => {
        await connectTestDatabase();
        await ApplicationGlobalRole.init();
        await ApplicationGlobalMember.init();
    });

    afterAll(async () => {
        await AuditLog.collection.deleteMany({
            $or: [
                {
                    entityType: 'ApplicationGlobalRole',
                },
                {
                    entityType: 'ApplicationGlobalMember',
                },
            ],
        });
        await ApplicationGlobalMember.collection.deleteMany({
            user: {
                $in: createdUserIds,
            },
        });
        await ApplicationGlobalRole.collection.deleteMany({
            key: {
                $in: [
                    'global_test_governor',
                    'global_test_limited_governor',
                ],
            },
        });
        await User.collection.deleteMany({
            _id: {
                $in: createdUserIds,
            },
        });

        await disconnectTestDatabase();
    });

    it('couvre attribution, suspension, réactivation, révocation et réattribution', async () => {
        const actor = await createUser({
            suffix: 'actor-' + new mongoose.Types.ObjectId(),
        });
        const target = await createUser({
            suffix: 'target-' + new mongoose.Types.ObjectId(),
        });

        const governorRole =
            await syncApplicationGlobalSystemRole({
                roleData: {
                    key: 'global_test_governor',
                    name: 'Gouverneur global de test',
                    permissions: [
                        'example-governance:manage',
                        'example-resource:read',
                        'example-resource:manage',
                    ],
                },
                permissionRegistry,
            });

        await bootstrapApplicationGlobalMember({
            userId: actor._id,
            roleId: governorRole.id,
            permissionRegistry,
        });

        const viewerRole =
            await createCustomApplicationGlobalRole({
                actorId: actor._id,
                governancePermission:
                    'example-governance:manage',
                roleData: {
                    name: 'Lecteur global de test',
                    permissions: [
                        'example-resource:read',
                    ],
                },
                permissionRegistry,
            });

        const assigned =
            await assignApplicationGlobalRole({
                userId: target._id,
                roleId: viewerRole.id,
                actorId: actor._id,
                governancePermission:
                    'example-governance:manage',
                permissionRegistry,
            });

        let authorization =
            await resolveApplicationGlobalAuthorization({
                user: target,
                permissionRegistry,
            });

        expect(authorization.permissions).toEqual([
            'example-resource:read',
        ]);

        await suspendApplicationGlobalMember({
            memberId: assigned.id,
            actorId: actor._id,
            governancePermission:
                'example-governance:manage',
            permissionRegistry,
        });

        authorization =
            await resolveApplicationGlobalAuthorization({
                user: target,
                permissionRegistry,
            });
        expect(authorization.permissions).toEqual([]);

        await reactivateApplicationGlobalMember({
            memberId: assigned.id,
            actorId: actor._id,
            governancePermission:
                'example-governance:manage',
            permissionRegistry,
        });

        authorization =
            await resolveApplicationGlobalAuthorization({
                user: target,
                permissionRegistry,
            });
        expect(authorization.permissions).toEqual([
            'example-resource:read',
        ]);

        await revokeApplicationGlobalMember({
            memberId: assigned.id,
            actorId: actor._id,
            governancePermission:
                'example-governance:manage',
            permissionRegistry,
        });

        authorization =
            await resolveApplicationGlobalAuthorization({
                user: target,
                permissionRegistry,
            });
        expect(authorization.permissions).toEqual([]);
        expect(authorization.source).toBe(
            'application_global_history',
        );

        const reassigned =
            await assignApplicationGlobalRole({
                userId: target._id,
                roleId: viewerRole.id,
                actorId: actor._id,
                governancePermission:
                    'example-governance:manage',
                permissionRegistry,
            });

        expect(reassigned.id).not.toBe(assigned.id);
        expect(reassigned.status).toBe(
            APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE,
        );

        const targetMemberships =
            await ApplicationGlobalMember.find({
                user: target._id,
            }).sort({ createdAt: 1 });

        expect(targetMemberships).toHaveLength(2);
        expect(targetMemberships[0].status).toBe(
            APPLICATION_GLOBAL_MEMBER_STATUS.REVOKED,
        );
        expect(targetMemberships[1].status).toBe(
            APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE,
        );
    });

    it('bloque une escalade vers une permission que le gouverneur ne possède pas', async () => {
        const limitedActor = await createUser({
            suffix: 'limited-' + new mongoose.Types.ObjectId(),
        });

        const limitedRole =
            await syncApplicationGlobalSystemRole({
                roleData: {
                    key: 'global_test_limited_governor',
                    name: 'Gouverneur limité de test',
                    permissions: [
                        'example-governance:manage',
                        'example-resource:read',
                    ],
                },
                permissionRegistry,
            });

        await bootstrapApplicationGlobalMember({
            userId: limitedActor._id,
            roleId: limitedRole.id,
            permissionRegistry,
        });

        await expect(
            createCustomApplicationGlobalRole({
                actorId: limitedActor._id,
                governancePermission:
                    'example-governance:manage',
                roleData: {
                    name: 'Rôle escaladé',
                    permissions: [
                        'example-resource:manage',
                    ],
                },
                permissionRegistry,
            }),
        ).rejects.toMatchObject({
            statusCode: 403,
        });
    });

    it('ne donne aucun droit global implicite à un super administrateur Platform', async () => {
        const platformAdmin = await createUser({
            suffix: 'platform-' + new mongoose.Types.ObjectId(),
            platformRole: PLATFORM_ROLE.SUPER_ADMIN,
        });

        const authorization =
            await resolveApplicationGlobalAuthorization({
                user: platformAdmin,
                permissionRegistry,
            });

        expect(authorization.source).toBe('none');
        expect(authorization.permissions).toEqual([]);
    });

    it('retire les droits d’un membership qui référence un rôle archivé', async () => {
        const target = await createUser({
            suffix: 'archived-' + new mongoose.Types.ObjectId(),
        });

        const role = await ApplicationGlobalRole.create({
            key:
                'archived_test_'
                + new mongoose.Types.ObjectId().toString(),
            name: 'Rôle archivé de test',
            permissions: ['example-resource:read'],
            isSystem: true,
            status:
                APPLICATION_GLOBAL_ROLE_STATUS.ARCHIVED,
        });

        await ApplicationGlobalMember.create({
            user: target._id,
            role: role._id,
            status:
                APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE,
        });

        const authorization =
            await resolveApplicationGlobalAuthorization({
                user: target,
                permissionRegistry,
            });

        expect(authorization.permissions).toEqual([]);

        await ApplicationGlobalMember.collection.deleteMany({
            user: target._id,
        });
        await ApplicationGlobalRole.collection.deleteOne({
            _id: role._id,
        });
    });
});
