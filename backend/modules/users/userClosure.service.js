import mongoose from 'mongoose';

import {
    runApplicationWorkspaceMemberRemovedLifecycle,
} from '../../config/applicationWorkspaceMemberLifecycle.registry.js';
import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    AUTH_SESSION_REVOKED_REASON,
} from '../../constants/authSession.constants.js';
import { PLATFORM_ROLE } from '../../constants/platformRoles.constants.js';
import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';
import { USER_STATUS } from '../../constants/userStatus.constants.js';
import {
    WORKSPACE_STATUS,
} from '../../constants/workspace.constants.js';
import {
    WORKSPACE_INVITATION_STATUS,
} from '../../constants/workspaceInvitation.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import { AppError } from '../../utils/appError.js';
import { canonicalizeEmail } from '../../utils/canonicalizeEmail.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import {
    confirmCurrentUserPassword,
} from '../auth/services/confirmCurrentUserPassword.service.js';
import {
    revokeAllUserAuthSessions,
} from '../authSessions/authSession.service.js';
import {
    CORE_PLAN_METRIC,
} from '../plan/planCapability.registry.js';
import {
    assertUserIsNotPlatformFounder,
} from '../platformTeam/platformFounderPolicy.service.js';
import {
    releaseCurrentUsageMetric,
} from '../usageMetric/releaseUsageMetric.service.js';
import {
    archiveWorkspaceInSession,
} from '../workspace/workspaceClosure.service.js';
import {
    WorkspaceInvitation,
} from '../workspaceInvitation/workspaceInvitation.model.js';
import { WorkspaceMember } from '../workspaceMember/workspaceMember.model.js';
import { User } from './user.model.js';

const ACTIVE_MEMBERSHIP_STATUSES = Object.freeze([
    WORKSPACE_MEMBER_STATUS.ACTIVE,
    WORKSPACE_MEMBER_STATUS.SUSPENDED,
]);

const SELF_SERVICE_CLOSURE_REASON = 'self_service_account_closure';

const isOwnerMembership = (membership) => (
    membership.role?.isSystem
    && membership.role?.key === SYSTEM_ROLE_KEY.OWNER
);

const revokePendingInvitationsForClosingUser = async ({
    emailCanonical,
    userId,
    now,
    session,
    ipAddress,
    userAgent,
}) => {
    const pendingInvitations = await WorkspaceInvitation.find({
        emailCanonical,
        status: WORKSPACE_INVITATION_STATUS.PENDING,
    }).session(session);

    let revokedInvitationCount = 0;

    for (const invitation of pendingInvitations) {
        const revokedInvitation = await WorkspaceInvitation.findOneAndUpdate(
            {
                _id: invitation._id,
                status: WORKSPACE_INVITATION_STATUS.PENDING,
            },
            {
                $set: {
                    status: WORKSPACE_INVITATION_STATUS.REVOKED,
                    revokedAt: now,
                    revokedBy: userId,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        if (!revokedInvitation) {
            throw new AppError(
                'Une invitation du compte a été modifiée concurremment',
                409,
            );
        }

        await createAuditLog(
            {
                actor: userId,
                workspace: invitation.workspace,
                action: AUDIT_ACTION.MEMBER_INVITATION_REVOKED,
                entityType: AUDIT_ENTITY_TYPE.WORKSPACE_INVITATION,
                entityId: invitation._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    reason: 'account_closure_requested',
                },
            },
            { session },
        );

        revokedInvitationCount += 1;
    }

    return revokedInvitationCount;
};

const assertConsistentMemberships = (memberships) => {
    const inconsistentMembership = memberships.find((membership) => (
        !membership.role
        || !membership.workspace
        || membership.role.workspace?.toString()
            !== membership.workspace._id.toString()
    ));

    if (inconsistentMembership) {
        throw new AppError(
            'Une appartenance workspace du compte est incohérente et doit être corrigée avant la fermeture',
            409,
        );
    }
};

const archiveOwnedWorkspacesInSession = async ({
    memberships,
    userId,
    session,
    ipAddress,
    userAgent,
}) => {
    let ownedWorkspaceCount = 0;
    let archivedWorkspaceCount = 0;
    let canceledSubscriptionCount = 0;
    let revokedWorkspaceInvitationCount = 0;

    for (const membership of memberships) {
        if (!isOwnerMembership(membership)) {
            continue;
        }

        ownedWorkspaceCount += 1;

        if (membership.workspace.status === WORKSPACE_STATUS.CLOSED) {
            continue;
        }

        const wasAlreadyArchived =
            membership.workspace.status === WORKSPACE_STATUS.ARCHIVED;

        const archiveInput = {
            workspaceId: membership.workspace._id,
            actorId: userId,
            session,
            ipAddress,
            userAgent,
        };

        if (membership.workspace.status === WORKSPACE_STATUS.SUSPENDED) {
            archiveInput.allowedStatuses = [
                WORKSPACE_STATUS.ACTIVE,
                WORKSPACE_STATUS.SUSPENDED,
            ];
        }

        const archiveResult = await archiveWorkspaceInSession(archiveInput);

        if (!wasAlreadyArchived) {
            archivedWorkspaceCount += 1;
        }

        canceledSubscriptionCount +=
            archiveResult.canceledSubscriptionCount;
        revokedWorkspaceInvitationCount +=
            archiveResult.revokedInvitationCount;
    }

    return {
        ownedWorkspaceCount,
        archivedWorkspaceCount,
        canceledSubscriptionCount,
        revokedWorkspaceInvitationCount,
    };
};

const removeClosingUserMembershipsInSession = async ({
    memberships,
    userId,
    session,
    ipAddress,
    userAgent,
}) => {
    let removedMembershipCount = 0;

    for (const membership of memberships) {
        membership.status = WORKSPACE_MEMBER_STATUS.REMOVED;
        membership.updatedBy = userId;
        await membership.save({ session });

        /*
         * La fermeture de compte est une seconde voie Core vers REMOVED.
         * Elle doit donc appliquer le même contrat lifecycle que le retrait
         * administratif d'un membre, dans la transaction déjà ouverte.
         */
        await runApplicationWorkspaceMemberRemovedLifecycle({
            workspaceId: membership.workspace._id,
            membershipId: membership._id,
            userId: membership.user,
            actorId: userId,
            session,
            ipAddress,
            userAgent,
        });

        await releaseCurrentUsageMetric({
            workspaceId: membership.workspace._id,
            metricKey: CORE_PLAN_METRIC.MEMBERS,
            amount: 1,
            actorId: userId,
            session,
        });

        await createAuditLog(
            {
                actor: userId,
                workspace: membership.workspace._id,
                action: AUDIT_ACTION.MEMBER_REMOVED,
                entityType: AUDIT_ENTITY_TYPE.WORKSPACE_MEMBER,
                entityId: membership._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    reason: 'account_closure_requested',
                },
            },
            { session },
        );

        removedMembershipCount += 1;
    }

    return removedMembershipCount;
};

const markUserDeletionRequestedInSession = async ({
    userId,
    now,
    session,
}) => {
    const deletionRequestedUser = await User.findOneAndUpdate(
        {
            _id: userId,
            status: USER_STATUS.ACTIVE,
        },
        {
            $set: {
                status: USER_STATUS.DELETION_REQUESTED,
                deletionRequestedAt: now,
                deletionRequestedBy: userId,
                updatedBy: userId,
            },
        },
        {
            returnDocument: 'after',
            runValidators: true,
            session,
        },
    );

    if (!deletionRequestedUser) {
        throw new AppError(
            'Le compte a été modifié concurremment',
            409,
        );
    }

    return deletionRequestedUser;
};

const closeSelfServiceUserInSession = async ({
    userId,
    now,
    session,
}) => {
    const closedUser = await User.findOneAndUpdate(
        {
            _id: userId,
            status: USER_STATUS.DELETION_REQUESTED,
        },
        {
            $set: {
                status: USER_STATUS.CLOSED,
                closedAt: now,
                closedBy: userId,
                closureReason: SELF_SERVICE_CLOSURE_REASON,
                updatedBy: userId,
            },
        },
        {
            returnDocument: 'after',
            runValidators: true,
            session,
        },
    );

    if (!closedUser) {
        throw new AppError(
            'La fermeture du compte a été modifiée concurremment',
            409,
        );
    }

    return closedUser;
};

const requestCurrentUserClosure = async ({
    userId,
    currentPassword,
    confirmationEmail,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!userId || !currentPassword || !confirmationEmail) {
        throw new TypeError(
            'userId, currentPassword and confirmationEmail are required to request account closure',
        );
    }

    await confirmCurrentUserPassword({
        userId,
        password: currentPassword,
    });

    return mongoose.connection.transaction(async (session) => {
        const user = await User.findOne({
            _id: userId,
            status: USER_STATUS.ACTIVE,
        }).session(session);

        if (!user) {
            throw new AppError('Compte indisponible', 403);
        }

        /**
         * Invariant Core : le Fondateur ne peut jamais passer par le workflow
         * self-service de fermeture. Le contrôle est transactionnel et vit dans
         * le service métier, afin qu'un appel interne futur ne puisse pas le
         * contourner en évitant le controller HTTP.
         */
        await assertUserIsNotPlatformFounder({
            userId,
            session,
        });

        if (canonicalizeEmail(confirmationEmail) !== user.emailCanonical) {
            throw new AppError(
                'L’adresse email de confirmation est incorrecte',
                409,
            );
        }

        /**
         * Protection de compatibilité avant bootstrap D-018 : tant qu'un ancien
         * super-admin n'a pas encore été matérialisé comme Fondateur, le Core
         * conserve l'ancien garde du dernier super-admin actif.
         */
        if (user.platformRole === PLATFORM_ROLE.SUPER_ADMIN) {
            const activeSuperAdminCount = await User.countDocuments({
                platformRole: PLATFORM_ROLE.SUPER_ADMIN,
                status: USER_STATUS.ACTIVE,
            }).session(session);

            if (activeSuperAdminCount <= 1) {
                throw new AppError(
                    'Le dernier super-admin actif ne peut pas fermer son compte',
                    409,
                );
            }
        }

        const memberships = await WorkspaceMember.find({
            user: userId,
            status: mongoose.trusted({
                $in: ACTIVE_MEMBERSHIP_STATUSES,
            }),
        })
            .populate({
                path: 'role',
                select: '_id key isSystem workspace',
            })
            .populate({
                path: 'workspace',
                select: '_id status',
            })
            .session(session);

        assertConsistentMemberships(memberships);

        const workspaceImpact = await archiveOwnedWorkspacesInSession({
            memberships,
            userId,
            session,
            ipAddress,
            userAgent,
        });

        const removedMembershipCount =
            await removeClosingUserMembershipsInSession({
                memberships,
                userId,
                session,
                ipAddress,
                userAgent,
            });

        const now = new Date();
        const revokedInvitationCount =
            await revokePendingInvitationsForClosingUser({
                emailCanonical: user.emailCanonical,
                userId,
                now,
                session,
                ipAddress,
                userAgent,
            });

        const deletionRequestedUser =
            await markUserDeletionRequestedInSession({
                userId,
                now,
                session,
            });

        await createAuditLog(
            {
                actor: userId,
                action: AUDIT_ACTION.USER_DELETION_REQUESTED,
                entityType: AUDIT_ENTITY_TYPE.USER,
                entityId: userId,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    ownedWorkspaceCount:
                        workspaceImpact.ownedWorkspaceCount,
                    archivedWorkspaceCount:
                        workspaceImpact.archivedWorkspaceCount,
                    canceledSubscriptionCount:
                        workspaceImpact.canceledSubscriptionCount,
                    revokedWorkspaceInvitationCount:
                        workspaceImpact.revokedWorkspaceInvitationCount,
                    removedMembershipCount,
                    revokedInvitationCount,
                },
            },
            { session },
        );

        const closedAt = new Date();
        const closedUser = await closeSelfServiceUserInSession({
            userId,
            now: closedAt,
            session,
        });

        const revokedSessions = await revokeAllUserAuthSessions({
            userId,
            revokedReason: AUTH_SESSION_REVOKED_REASON.USER_CLOSED,
            session,
        });

        await createAuditLog(
            {
                actor: userId,
                action: AUDIT_ACTION.USER_CLOSED,
                entityType: AUDIT_ENTITY_TYPE.USER,
                entityId: userId,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    reason: SELF_SERVICE_CLOSURE_REASON,
                    ownedWorkspaceCount:
                        workspaceImpact.ownedWorkspaceCount,
                    archivedWorkspaceCount:
                        workspaceImpact.archivedWorkspaceCount,
                    canceledSubscriptionCount:
                        workspaceImpact.canceledSubscriptionCount,
                    revokedWorkspaceInvitationCount:
                        workspaceImpact.revokedWorkspaceInvitationCount,
                    removedMembershipCount,
                    revokedInvitationCount,
                    revokedSessionCount: revokedSessions.modifiedCount,
                },
            },
            { session },
        );

        return {
            id: closedUser._id.toString(),
            status: closedUser.status,
            deletionRequestedAt:
                deletionRequestedUser.deletionRequestedAt,
            closedAt: closedUser.closedAt,
            ownedWorkspaceCount:
                workspaceImpact.ownedWorkspaceCount,
            archivedWorkspaceCount:
                workspaceImpact.archivedWorkspaceCount,
            canceledSubscriptionCount:
                workspaceImpact.canceledSubscriptionCount,
            revokedWorkspaceInvitationCount:
                workspaceImpact.revokedWorkspaceInvitationCount,
            removedMembershipCount,
            revokedInvitationCount,
            revokedSessionCount: revokedSessions.modifiedCount,
        };
    });
};

export {
    ACTIVE_MEMBERSHIP_STATUSES,
    requestCurrentUserClosure,
    revokePendingInvitationsForClosingUser,
};
