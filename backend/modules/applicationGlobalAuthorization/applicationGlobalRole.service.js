import { randomUUID } from 'node:crypto';

import mongoose from 'mongoose';

import {
    ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
} from '../../config/applicationGlobalPermission.registry.js';
import {
    APPLICATION_GLOBAL_MEMBER_STATUS,
    APPLICATION_GLOBAL_ROLE_STATUS,
} from '../../constants/applicationGlobalAuthorization.constants.js';
import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import { AppError } from '../../utils/appError.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import { User } from '../users/user.model.js';
import {
    getApplicationGlobalRoleEffectivePermissions,
    resolveApplicationGlobalAuthorization,
} from './applicationGlobalAuthorization.service.js';
import {
    assertActorHasApplicationGlobalPermission,
    assertApplicationGlobalRolePermissions,
    assertApplicationGlobalRoleWithinActorAuthority,
} from './applicationGlobalAuthorization.policy.js';
import { ApplicationGlobalMember } from './applicationGlobalMember.model.js';
import { ApplicationGlobalRole } from './applicationGlobalRole.model.js';

const CURRENT_MEMBER_STATUSES = Object.freeze([
    APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE,
    APPLICATION_GLOBAL_MEMBER_STATUS.SUSPENDED,
]);

const applySession = (query, session) => (
    session ? query.session(session) : query
);

const runWithOptionalTransaction = (
    session,
    operation,
) => (
    session
        ? operation(session)
        : mongoose.connection.transaction(operation)
);

const serializeApplicationGlobalRole = (role) => ({
    id: role._id.toString(),
    key: role.key,
    name: role.name,
    description: role.description ?? null,
    permissions: Array.isArray(role.permissions)
        ? [...role.permissions]
        : [],
    isSystem: role.isSystem === true,
    status: role.status,
    createdBy: role.createdBy?.toString() ?? null,
    updatedBy: role.updatedBy?.toString() ?? null,
    archivedAt: role.archivedAt ?? null,
    archivedBy: role.archivedBy?.toString() ?? null,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
});

const loadActorAuthorization = async ({
    actorId,
    session,
    permissionRegistry,
}) => {
    const actorQuery = User.findById(actorId);
    const actor = await applySession(actorQuery, session);

    if (!actor) {
        throw new AppError(
            'Utilisateur acteur introuvable.',
            403,
        );
    }

    const authorization =
        await resolveApplicationGlobalAuthorization({
            user: actor,
            session,
            permissionRegistry,
        });

    return { actor, authorization };
};

const assertEditableCustomRole = (role) => {
    if (!role) {
        throw new AppError(
            'Rôle global applicatif introuvable.',
            404,
        );
    }

    if (role.status !== APPLICATION_GLOBAL_ROLE_STATUS.ACTIVE) {
        throw new AppError(
            'Ce rôle global applicatif est archivé.',
            409,
        );
    }

    if (role.isSystem === true) {
        throw new AppError(
            'Les rôles globaux applicatifs système sont pilotés par le code de l’application.',
            409,
        );
    }
};

const assertActorCanAdministerRole = ({
    authorization,
    role,
    permissionRegistry,
}) => {
    const rolePermissions =
        getApplicationGlobalRoleEffectivePermissions(
            role,
            { permissionRegistry },
        );

    assertApplicationGlobalRoleWithinActorAuthority({
        rolePermissions,
        actorPermissions: authorization.permissions,
    });
};

const listApplicationGlobalRoles = async ({
    status = APPLICATION_GLOBAL_ROLE_STATUS.ACTIVE,
} = {}) => {
    if (
        !Object.values(
            APPLICATION_GLOBAL_ROLE_STATUS,
        ).includes(status)
    ) {
        throw new TypeError(
            'status must be a valid application-global role status',
        );
    }

    const roles = await ApplicationGlobalRole.find({
        status,
    })
        .sort({
            isSystem: -1,
            name: 1,
            _id: 1,
        })
        .lean();

    return roles.map(serializeApplicationGlobalRole);
};

const createCustomApplicationGlobalRole = async ({
    roleData,
    actorId,
    governancePermission,
    ipAddress = null,
    userAgent = null,
    permissionRegistry =
        ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
}) => {
    if (!roleData || !actorId || !governancePermission) {
        throw new TypeError(
            'roleData, actorId and governancePermission are required',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const { authorization } = await loadActorAuthorization({
            actorId,
            session,
            permissionRegistry,
        });

        assertActorHasApplicationGlobalPermission({
            authorization,
            permission: governancePermission,
            permissionRegistry,
        });

        const permissions =
            assertApplicationGlobalRolePermissions({
                permissions: roleData.permissions ?? [],
                actorPermissions: authorization.permissions,
                allowReserved: false,
                permissionRegistry,
            });

        const [role] = await ApplicationGlobalRole.create([
            {
                key: 'custom_' + randomUUID(),
                name: roleData.name,
                description: roleData.description ?? null,
                permissions: [...permissions],
                isSystem: false,
                status: APPLICATION_GLOBAL_ROLE_STATUS.ACTIVE,
                createdBy: actorId,
                updatedBy: actorId,
            },
        ], { session });

        await createAuditLog(
            {
                actor: actorId,
                action:
                    AUDIT_ACTION.APPLICATION_GLOBAL_ROLE_CREATED,
                entityType:
                    AUDIT_ENTITY_TYPE.APPLICATION_GLOBAL_ROLE,
                entityId: role._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    roleKey: role.key,
                    permissionCount: permissions.length,
                },
            },
            { session },
        );

        return serializeApplicationGlobalRole(role);
    });
};

const updateCustomApplicationGlobalRole = async ({
    roleId,
    roleData,
    actorId,
    governancePermission,
    ipAddress = null,
    userAgent = null,
    permissionRegistry =
        ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
}) => {
    if (
        !roleId
        || !roleData
        || !actorId
        || !governancePermission
    ) {
        throw new TypeError(
            'roleId, roleData, actorId and governancePermission are required',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const { authorization } = await loadActorAuthorization({
            actorId,
            session,
            permissionRegistry,
        });

        assertActorHasApplicationGlobalPermission({
            authorization,
            permission: governancePermission,
            permissionRegistry,
        });

        const roleQuery = ApplicationGlobalRole.findById(roleId);
        const role = await applySession(roleQuery, session);

        assertEditableCustomRole(role);
        assertActorCanAdministerRole({
            authorization,
            role,
            permissionRegistry,
        });

        if (Object.hasOwn(roleData, 'permissions')) {
            role.permissions = [
                ...assertApplicationGlobalRolePermissions({
                    permissions: roleData.permissions,
                    actorPermissions: authorization.permissions,
                    allowReserved: false,
                    permissionRegistry,
                }),
            ];
        }

        if (Object.hasOwn(roleData, 'name')) {
            role.name = roleData.name;
        }

        if (Object.hasOwn(roleData, 'description')) {
            role.description = roleData.description;
        }

        role.updatedBy = actorId;
        await role.save({ session });

        await createAuditLog(
            {
                actor: actorId,
                action:
                    AUDIT_ACTION.APPLICATION_GLOBAL_ROLE_UPDATED,
                entityType:
                    AUDIT_ENTITY_TYPE.APPLICATION_GLOBAL_ROLE,
                entityId: role._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    roleKey: role.key,
                    updatedFields: Object.keys(roleData),
                },
            },
            { session },
        );

        return serializeApplicationGlobalRole(role);
    });
};

const archiveCustomApplicationGlobalRole = async ({
    roleId,
    actorId,
    governancePermission,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
    permissionRegistry =
        ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
}) => {
    if (!roleId || !actorId || !governancePermission) {
        throw new TypeError(
            'roleId, actorId and governancePermission are required',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const { authorization } = await loadActorAuthorization({
            actorId,
            session,
            permissionRegistry,
        });

        assertActorHasApplicationGlobalPermission({
            authorization,
            permission: governancePermission,
            permissionRegistry,
        });

        const roleQuery = ApplicationGlobalRole.findById(roleId);
        const role = await applySession(roleQuery, session);

        assertEditableCustomRole(role);
        assertActorCanAdministerRole({
            authorization,
            role,
            permissionRegistry,
        });

        const usageQuery = ApplicationGlobalMember.countDocuments({
            role: role._id,
            status: mongoose.trusted({
                $in: CURRENT_MEMBER_STATUSES,
            }),
        });
        const assignedMembers = await applySession(
            usageQuery,
            session,
        );

        if (assignedMembers > 0) {
            throw new AppError(
                'Ce rôle global ne peut pas être archivé tant qu’il est attribué à un membre actif ou suspendu.',
                409,
            );
        }

        role.status = APPLICATION_GLOBAL_ROLE_STATUS.ARCHIVED;
        role.archivedAt = now;
        role.archivedBy = actorId;
        role.updatedBy = actorId;
        await role.save({ session });

        await createAuditLog(
            {
                actor: actorId,
                action:
                    AUDIT_ACTION.APPLICATION_GLOBAL_ROLE_ARCHIVED,
                entityType:
                    AUDIT_ENTITY_TYPE.APPLICATION_GLOBAL_ROLE,
                entityId: role._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    roleKey: role.key,
                    archivedAt: now,
                },
            },
            { session },
        );

        return serializeApplicationGlobalRole(role);
    });
};

/**
 * Synchronise un rôle système depuis le code du SaaS dérivé.
 *
 * Cette primitive est destinée aux seeds/migrations de déploiement et non à
 * une route utilisateur. Elle est la seule voie Core autorisant des
 * permissions réservées dans un rôle global.
 */
const syncApplicationGlobalSystemRole = async ({
    roleData,
    actorId = null,
    session = null,
    ipAddress = null,
    userAgent = null,
    permissionRegistry =
        ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
}) => {
    if (!roleData?.key || !roleData?.name) {
        throw new TypeError(
            'roleData.key and roleData.name are required',
        );
    }

    const permissions =
        assertApplicationGlobalRolePermissions({
            permissions: roleData.permissions ?? [],
            allowReserved: true,
            permissionRegistry,
        });

    return runWithOptionalTransaction(
        session,
        async (activeSession) => {
            const existingQuery = ApplicationGlobalRole.findOne({
                key: roleData.key,
            });
            const existing = await applySession(
                existingQuery,
                activeSession,
            );

            if (existing && existing.isSystem !== true) {
                throw new AppError(
                    'La clé du rôle système global est déjà utilisée par un rôle personnalisé.',
                    409,
                );
            }

            const role = existing ?? new ApplicationGlobalRole({
                key: roleData.key,
                isSystem: true,
                createdBy: actorId,
            });
            const wasNew = role.isNew;

            role.name = roleData.name;
            role.description = roleData.description ?? null;
            role.permissions = [...permissions];
            role.status = APPLICATION_GLOBAL_ROLE_STATUS.ACTIVE;
            role.archivedAt = null;
            role.archivedBy = null;
            role.updatedBy = actorId;

            await role.save({ session: activeSession });

            await createAuditLog(
                {
                    actor: actorId,
                    action: wasNew
                        ? AUDIT_ACTION.APPLICATION_GLOBAL_ROLE_CREATED
                        : AUDIT_ACTION.APPLICATION_GLOBAL_ROLE_UPDATED,
                    entityType:
                        AUDIT_ENTITY_TYPE.APPLICATION_GLOBAL_ROLE,
                    entityId: role._id,
                    status: AUDIT_STATUS.SUCCESS,
                    ipAddress,
                    userAgent,
                    metadata: {
                        roleKey: role.key,
                        permissionCount: permissions.length,
                        bootstrap: true,
                    },
                },
                { session: activeSession },
            );

            return serializeApplicationGlobalRole(role);
        },
    );
};

export {
    archiveCustomApplicationGlobalRole,
    createCustomApplicationGlobalRole,
    listApplicationGlobalRoles,
    serializeApplicationGlobalRole,
    syncApplicationGlobalSystemRole,
    updateCustomApplicationGlobalRole,
};
