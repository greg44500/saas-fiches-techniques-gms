import mongoose from 'mongoose';

import {
    runApplicationWorkspaceMemberRemovedLifecycle,
} from '../../config/applicationWorkspaceMemberLifecycle.registry.js';
import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import { AppError } from '../../utils/appError.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import {
    CORE_PLAN_METRIC,
} from '../plan/planCapability.registry.js';
import { Role } from '../role/role.model.js';
import {
    releaseCurrentUsageMetric,
} from '../usageMetric/releaseUsageMetric.service.js';
import { WorkspaceMember } from './workspaceMember.model.js';

const loadMembershipWithRole = async ({ workspaceId, memberId, session }) => {
    let query = WorkspaceMember.findOne({
        _id: memberId,
        workspace: workspaceId,
    }).populate({
        path: 'role',
        select: 'key name isSystem',
    });

    if (session) {
        query = query.session(session);
    }

    return query;
};

const assertMutableMembership = ({ membership, actorId }) => {
    if (!membership) {
        throw new AppError('Membre introuvable', 404);
    }

    if (
        membership.role?.isSystem
        && membership.role?.key === SYSTEM_ROLE_KEY.OWNER
    ) {
        throw new AppError(
            'Le propriétaire du workspace ne peut pas être administré comme un membre',
            409,
        );
    }

    /*
     * Les actions sensibles sur soi-même sont interdites en V1. Cette règle
     * évite les pertes accidentelles d'administration et garde la gouvernance
     * distincte du futur workflow de fermeture de compte.
     */
    if (membership.user.toString() === actorId.toString()) {
        throw new AppError(
            'Vous ne pouvez pas administrer votre propre appartenance',
            409,
        );
    }
};

const updateWorkspaceMemberRole = async ({
    workspaceId,
    memberId,
    roleId,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => mongoose.connection.transaction(async (session) => {
    const membership = await loadMembershipWithRole({
        workspaceId,
        memberId,
        session,
    });

    assertMutableMembership({ membership, actorId });

    if (membership.status !== WORKSPACE_MEMBER_STATUS.ACTIVE) {
        throw new AppError(
            'Seul un membre actif peut changer de rôle',
            409,
        );
    }

    let roleQuery = Role.findOne({
        _id: roleId,
        workspace: workspaceId,
    });
    roleQuery = roleQuery.session(session);
    const role = await roleQuery;

    if (!role) {
        throw new AppError('Rôle introuvable', 404);
    }

    /*
     * owner représente la propriété du tenant et non un niveau de permission.
     * Il ne peut donc jamais être attribué par une commande de membership.
     */
    if (role.isSystem && role.key === SYSTEM_ROLE_KEY.OWNER) {
        throw new AppError(
            'Le rôle propriétaire ne peut pas être attribué',
            409,
        );
    }

    const previousRoleId = membership.role._id.toString();
    membership.role = role._id;
    membership.updatedBy = actorId;
    await membership.save({ session });

    await createAuditLog(
        {
            actor: actorId,
            workspace: workspaceId,
            action: AUDIT_ACTION.MEMBER_ROLE_UPDATED,
            entityType: AUDIT_ENTITY_TYPE.WORKSPACE_MEMBER,
            entityId: membership._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
            metadata: {
                previousRoleId,
                roleId: role._id.toString(),
            },
        },
        { session },
    );

    return membership;
});

const suspendWorkspaceMember = async ({
    workspaceId,
    memberId,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => mongoose.connection.transaction(async (session) => {
    const membership = await loadMembershipWithRole({
        workspaceId,
        memberId,
        session,
    });

    assertMutableMembership({ membership, actorId });

    if (membership.status !== WORKSPACE_MEMBER_STATUS.ACTIVE) {
        throw new AppError(
            'Seul un membre actif peut être suspendu',
            409,
        );
    }

    /*
     * Un membre suspendu conserve son siège. Aucun quota n'est donc libéré :
     * suspendre ne doit jamais permettre de contourner la limite members.
     */
    membership.status = WORKSPACE_MEMBER_STATUS.SUSPENDED;
    membership.updatedBy = actorId;
    await membership.save({ session });

    await createAuditLog(
        {
            actor: actorId,
            workspace: workspaceId,
            action: AUDIT_ACTION.MEMBER_SUSPENDED,
            entityType: AUDIT_ENTITY_TYPE.WORKSPACE_MEMBER,
            entityId: membership._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
        },
        { session },
    );

    return membership;
});

const removeWorkspaceMember = async ({
    workspaceId,
    memberId,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => mongoose.connection.transaction(async (session) => {
    const membership = await loadMembershipWithRole({
        workspaceId,
        memberId,
        session,
    });

    assertMutableMembership({ membership, actorId });

    if (
        membership.status !== WORKSPACE_MEMBER_STATUS.ACTIVE
        && membership.status !== WORKSPACE_MEMBER_STATUS.SUSPENDED
    ) {
        throw new AppError(
            'Ce membre est déjà retiré du workspace',
            409,
        );
    }

    membership.status = WORKSPACE_MEMBER_STATUS.REMOVED;
    membership.updatedBy = actorId;
    await membership.save({ session });

    /*
     * Les relations métier d'une application dérivée participent à la même
     * transaction. Une erreur applicative est propagée afin que MongoDB
     * rollbacke le membership, les relations dérivées, le quota et l'audit.
     */
    await runApplicationWorkspaceMemberRemovedLifecycle({
        workspaceId,
        membershipId: membership._id,
        userId: membership.user,
        actorId,
        session,
        ipAddress,
        userAgent,
    });

    /*
     * active et suspended occupent tous deux un siège. Le passage à removed
     * libère exactement une unité dans la même transaction que le membership
     * et son audit afin d'éviter toute divergence de quota.
     */
    await releaseCurrentUsageMetric({
        workspaceId,
        metricKey: CORE_PLAN_METRIC.MEMBERS,
        amount: 1,
        actorId,
        session,
    });

    await createAuditLog(
        {
            actor: actorId,
            workspace: workspaceId,
            action: AUDIT_ACTION.MEMBER_REMOVED,
            entityType: AUDIT_ENTITY_TYPE.WORKSPACE_MEMBER,
            entityId: membership._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
        },
        { session },
    );

    return membership;
});

export {
    removeWorkspaceMember,
    suspendWorkspaceMember,
    updateWorkspaceMemberRole,
};
