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

const isSameId = (left, right) => (
    left?.toString() === right?.toString()
);

const serializeApplicationGlobalMember = (member) => ({
    id: member._id.toString(),
    user: member.user.toString(),
    role: member.role.toString(),
    status: member.status,
    joinedAt: member.joinedAt,
    suspendedAt: member.suspendedAt ?? null,
    suspendedBy: member.suspendedBy?.toString() ?? null,
    revokedAt: member.revokedAt ?? null,
    revokedBy: member.revokedBy?.toString() ?? null,
    createdBy: member.createdBy?.toString() ?? null,
    updatedBy: member.updatedBy?.toString() ?? null,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
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

const loadActiveRole = async ({
    roleId,
    session,
}) => {
    const roleQuery = ApplicationGlobalRole.findOne({
        _id: roleId,
        status: APPLICATION_GLOBAL_ROLE_STATUS.ACTIVE,
    });
    const role = await applySession(roleQuery, session);

    if (!role) {
        throw new AppError(
            'Le rôle global applicatif sélectionné n’est pas assignable.',
            409,
        );
    }

    return role;
};

const assertActorCanManageRole = ({
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

    return rolePermissions;
};

const loadCurrentMemberAndRole = async ({
    memberId,
    allowedStatuses,
    session,
}) => {
    const memberQuery = ApplicationGlobalMember.findOne({
        _id: memberId,
        status: mongoose.trusted({
            $in: allowedStatuses,
        }),
    });
    const member = await applySession(
        memberQuery,
        session,
    );

    if (!member) {
        throw new AppError(
            'Membre global applicatif courant introuvable.',
            404,
        );
    }

    const roleQuery = ApplicationGlobalRole.findById(
        member.role,
    );
    const role = await applySession(roleQuery, session);

    if (!role) {
        throw new AppError(
            'Le rôle courant du membre global applicatif est introuvable.',
            409,
        );
    }

    return { member, role };
};

const prepareActor = async ({
    actorId,
    targetUserId,
    governancePermission,
    session,
    permissionRegistry,
}) => {
    if (isSameId(actorId, targetUserId)) {
        throw new AppError(
            'Vous ne pouvez pas modifier votre propre autorité globale avec ce workflow.',
            403,
        );
    }

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

    return authorization;
};

const assignApplicationGlobalRole = async ({
    userId,
    roleId,
    actorId,
    governancePermission,
    ipAddress = null,
    userAgent = null,
    permissionRegistry =
        ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
}) => {
    if (
        !userId
        || !roleId
        || !actorId
        || !governancePermission
    ) {
        throw new TypeError(
            'userId, roleId, actorId and governancePermission are required',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const authorization = await prepareActor({
            actorId,
            targetUserId: userId,
            governancePermission,
            session,
            permissionRegistry,
        });

        const targetUserQuery = User.findById(userId);
        const targetUser = await applySession(
            targetUserQuery,
            session,
        );

        if (!targetUser) {
            throw new AppError(
                'Utilisateur cible introuvable.',
                404,
            );
        }

        const nextRole = await loadActiveRole({
            roleId,
            session,
        });

        assertActorCanManageRole({
            authorization,
            role: nextRole,
            permissionRegistry,
        });

        const currentMemberQuery =
            ApplicationGlobalMember.findOne({
                user: userId,
                status: mongoose.trusted({
                    $in: CURRENT_MEMBER_STATUSES,
                }),
            });
        const currentMember = await applySession(
            currentMemberQuery,
            session,
        );

        let member = currentMember;
        let memberWasCreated = false;

        if (currentMember) {
            const currentRoleQuery =
                ApplicationGlobalRole.findById(
                    currentMember.role,
                );
            const currentRole = await applySession(
                currentRoleQuery,
                session,
            );

            if (!currentRole) {
                throw new AppError(
                    'Le rôle courant du membre global applicatif est introuvable.',
                    409,
                );
            }

            assertActorCanManageRole({
                authorization,
                role: currentRole,
                permissionRegistry,
            });

            currentMember.role = nextRole._id;
            currentMember.updatedBy = actorId;
            await currentMember.save({ session });
        } else {
            [member] = await ApplicationGlobalMember.create([
                {
                    user: userId,
                    role: nextRole._id,
                    status:
                        APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE,
                    createdBy: actorId,
                    updatedBy: actorId,
                },
            ], { session });
            memberWasCreated = true;
        }

        await createAuditLog(
            {
                actor: actorId,
                action:
                    AUDIT_ACTION.APPLICATION_GLOBAL_MEMBER_ASSIGNED,
                entityType:
                    AUDIT_ENTITY_TYPE.APPLICATION_GLOBAL_MEMBER,
                entityId: member._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    roleKey: nextRole.key,
                    memberWasCreated,
                },
            },
            { session },
        );

        return serializeApplicationGlobalMember(member);
    });
};

const changeApplicationGlobalMemberStatus = async ({
    memberId,
    targetStatus,
    actorId,
    governancePermission,
    ipAddress,
    userAgent,
    now,
    permissionRegistry,
}) => mongoose.connection.transaction(async (session) => {
    const expectedStatuses = targetStatus
        === APPLICATION_GLOBAL_MEMBER_STATUS.SUSPENDED
        ? [APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE]
        : targetStatus
            === APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE
            ? [APPLICATION_GLOBAL_MEMBER_STATUS.SUSPENDED]
            : CURRENT_MEMBER_STATUSES;

    const { member, role } = await loadCurrentMemberAndRole({
        memberId,
        allowedStatuses: expectedStatuses,
        session,
    });

    const authorization = await prepareActor({
        actorId,
        targetUserId: member.user,
        governancePermission,
        session,
        permissionRegistry,
    });

    assertActorCanManageRole({
        authorization,
        role,
        permissionRegistry,
    });

    member.status = targetStatus;
    member.updatedBy = actorId;

    let action;

    if (
        targetStatus
        === APPLICATION_GLOBAL_MEMBER_STATUS.SUSPENDED
    ) {
        member.suspendedAt = now;
        member.suspendedBy = actorId;
        action =
            AUDIT_ACTION.APPLICATION_GLOBAL_MEMBER_SUSPENDED;
    } else if (
        targetStatus
        === APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE
    ) {
        member.suspendedAt = null;
        member.suspendedBy = null;
        action =
            AUDIT_ACTION.APPLICATION_GLOBAL_MEMBER_REACTIVATED;
    } else {
        member.revokedAt = now;
        member.revokedBy = actorId;
        action =
            AUDIT_ACTION.APPLICATION_GLOBAL_MEMBER_REVOKED;
    }

    await member.save({ session });

    await createAuditLog(
        {
            actor: actorId,
            action,
            entityType:
                AUDIT_ENTITY_TYPE.APPLICATION_GLOBAL_MEMBER,
            entityId: member._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
            metadata: {
                roleKey: role.key,
            },
        },
        { session },
    );

    return serializeApplicationGlobalMember(member);
});

const suspendApplicationGlobalMember = ({
    memberId,
    actorId,
    governancePermission,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
    permissionRegistry =
        ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
}) => changeApplicationGlobalMemberStatus({
    memberId,
    targetStatus:
        APPLICATION_GLOBAL_MEMBER_STATUS.SUSPENDED,
    actorId,
    governancePermission,
    ipAddress,
    userAgent,
    now,
    permissionRegistry,
});

const reactivateApplicationGlobalMember = ({
    memberId,
    actorId,
    governancePermission,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
    permissionRegistry =
        ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
}) => changeApplicationGlobalMemberStatus({
    memberId,
    targetStatus:
        APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE,
    actorId,
    governancePermission,
    ipAddress,
    userAgent,
    now,
    permissionRegistry,
});

const revokeApplicationGlobalMember = ({
    memberId,
    actorId,
    governancePermission,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
    permissionRegistry =
        ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
}) => changeApplicationGlobalMemberStatus({
    memberId,
    targetStatus:
        APPLICATION_GLOBAL_MEMBER_STATUS.REVOKED,
    actorId,
    governancePermission,
    ipAddress,
    userAgent,
    now,
    permissionRegistry,
});

/**
 * Initialise le premier membre global depuis un seed/migration du produit.
 *
 * Le helper refuse toute réactivation implicite : un historique révoqué ou un
 * membre suspendu exige ensuite le workflow d'administration normal.
 */
const bootstrapApplicationGlobalMember = async ({
    userId,
    roleId,
    actorId = null,
    ipAddress = null,
    userAgent = null,
    permissionRegistry =
        ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
}) => {
    if (!userId || !roleId) {
        throw new TypeError(
            'userId and roleId are required to bootstrap an application-global member',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const userQuery = User.findById(userId);
        const user = await applySession(userQuery, session);

        if (!user) {
            throw new AppError(
                'Utilisateur cible introuvable.',
                404,
            );
        }

        const role = await loadActiveRole({
            roleId,
            session,
        });

        if (role.isSystem !== true) {
            throw new AppError(
                'Le bootstrap exige un rôle global applicatif système.',
                409,
            );
        }

        getApplicationGlobalRoleEffectivePermissions(
            role,
            { permissionRegistry },
        );

        const currentQuery = ApplicationGlobalMember.findOne({
            user: userId,
            status: mongoose.trusted({
                $in: CURRENT_MEMBER_STATUSES,
            }),
        });
        const current = await applySession(
            currentQuery,
            session,
        );

        if (current) {
            if (
                current.status
                    === APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE
                && isSameId(current.role, role._id)
            ) {
                return serializeApplicationGlobalMember(
                    current,
                );
            }

            throw new AppError(
                'Un membership global courant existe déjà et ne peut pas être remplacé par le bootstrap.',
                409,
            );
        }

        const historyQuery = ApplicationGlobalMember.exists({
            user: userId,
        });
        const hasHistory = await applySession(
            historyQuery,
            session,
        );

        if (hasHistory) {
            throw new AppError(
                'Un historique de membership global existe déjà ; le bootstrap ne peut pas contourner une révocation.',
                409,
            );
        }

        const [member] = await ApplicationGlobalMember.create([
            {
                user: userId,
                role: role._id,
                status:
                    APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE,
                createdBy: actorId,
                updatedBy: actorId,
            },
        ], { session });

        await createAuditLog(
            {
                actor: actorId,
                action:
                    AUDIT_ACTION.APPLICATION_GLOBAL_MEMBER_ASSIGNED,
                entityType:
                    AUDIT_ENTITY_TYPE.APPLICATION_GLOBAL_MEMBER,
                entityId: member._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    roleKey: role.key,
                    memberWasCreated: true,
                    bootstrap: true,
                },
            },
            { session },
        );

        return serializeApplicationGlobalMember(member);
    });
};

export {
    assignApplicationGlobalRole,
    bootstrapApplicationGlobalMember,
    reactivateApplicationGlobalMember,
    revokeApplicationGlobalMember,
    serializeApplicationGlobalMember,
    suspendApplicationGlobalMember,
};
