import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    runApplicationWorkspaceMemberRemovedLifecycle,
} from '../../config/applicationWorkspaceMemberLifecycle.registry.js';
import {
    AUDIT_ACTION,
} from '../../constants/auditActions.constants.js';
import {
    AUTH_SESSION_REVOKED_REASON,
} from '../../constants/authSession.constants.js';
import {
    confirmCurrentUserPassword,
} from '../../modules/auth/services/confirmCurrentUserPassword.service.js';
import {
    revokeAllUserAuthSessions,
} from '../../modules/authSessions/authSession.service.js';
import {
    assertUserIsNotPlatformFounder,
} from '../../modules/platformTeam/platformFounderPolicy.service.js';
import {
    releaseCurrentUsageMetric,
} from '../../modules/usageMetric/releaseUsageMetric.service.js';
import {
    requestCurrentUserClosure,
} from '../../modules/users/userClosure.service.js';
import { User } from '../../modules/users/user.model.js';
import {
    archiveWorkspaceInSession,
} from '../../modules/workspace/workspaceClosure.service.js';
import {
    WorkspaceInvitation,
} from '../../modules/workspaceInvitation/workspaceInvitation.model.js';
import {
    WorkspaceMember,
} from '../../modules/workspaceMember/workspaceMember.model.js';
import {
    createAuditLog,
} from '../../modules/auditLog/auditLog.service.js';

vi.mock('../../config/applicationWorkspaceMemberLifecycle.registry.js', () => ({
    runApplicationWorkspaceMemberRemovedLifecycle: vi.fn(),
}));
vi.mock('../../modules/auth/services/confirmCurrentUserPassword.service.js', () => ({
    confirmCurrentUserPassword: vi.fn(),
}));
vi.mock('../../modules/authSessions/authSession.service.js', () => ({
    revokeAllUserAuthSessions: vi.fn(),
}));
vi.mock('../../modules/platformTeam/platformFounderPolicy.service.js', () => ({
    assertUserIsNotPlatformFounder: vi.fn(),
}));
vi.mock('../../modules/usageMetric/releaseUsageMetric.service.js', () => ({
    releaseCurrentUsageMetric: vi.fn(),
}));
vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));
vi.mock('../../modules/users/user.model.js', () => ({
    User: {
        countDocuments: vi.fn(),
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
    },
}));
vi.mock('../../modules/workspace/workspaceClosure.service.js', () => ({
    archiveWorkspaceInSession: vi.fn(),
}));
vi.mock('../../modules/workspaceInvitation/workspaceInvitation.model.js', () => ({
    WorkspaceInvitation: {
        find: vi.fn(),
        findOneAndUpdate: vi.fn(),
    },
}));
vi.mock('../../modules/workspaceMember/workspaceMember.model.js', () => ({
    WorkspaceMember: {
        find: vi.fn(),
    },
}));

const sessionQuery = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});

const membershipQuery = (memberships) => {
    const query = {
        populate: vi.fn(),
        session: vi.fn().mockResolvedValue(memberships),
    };
    query.populate.mockReturnValue(query);
    return query;
};

const createMembership = ({
    id,
    workspaceId,
    roleKey = 'member',
    isSystem = true,
    workspaceStatus = 'active',
}) => ({
    _id: id,
    user: 'user-id',
    status: 'active',
    role: {
        key: roleKey,
        isSystem,
        workspace: { toString: () => workspaceId },
    },
    workspace: {
        _id: { toString: () => workspaceId },
        status: workspaceStatus,
    },
    save: vi.fn().mockResolvedValue(undefined),
});

const mockActiveUser = ({
    emailCanonical = 'greg@example.com',
    platformRole = 'user',
} = {}) => {
    User.findOne.mockReturnValue(sessionQuery({
        _id: 'user-id',
        emailCanonical,
        status: 'active',
        platformRole,
    }));
};

const mockSuccessfulUserLifecycle = () => {
    const deletionRequestedAt = new Date('2026-09-05T12:00:00.000Z');
    const closedAt = new Date('2026-09-05T12:00:01.000Z');

    User.findOneAndUpdate
        .mockResolvedValueOnce({
            _id: { toString: () => 'user-id' },
            status: 'deletion_requested',
            deletionRequestedAt,
        })
        .mockResolvedValueOnce({
            _id: { toString: () => 'user-id' },
            status: 'closed',
            closedAt,
        });

    return { deletionRequestedAt, closedAt };
};

describe('requestCurrentUserClosure', () => {
    const session = { id: 'mongo-session' };

    beforeEach(() => {
        vi.clearAllMocks();
        confirmCurrentUserPassword.mockResolvedValue(undefined);
        runApplicationWorkspaceMemberRemovedLifecycle.mockResolvedValue(
            undefined,
        );
        assertUserIsNotPlatformFounder.mockResolvedValue(undefined);
        createAuditLog.mockResolvedValue(undefined);
        releaseCurrentUsageMetric.mockResolvedValue({});
        revokeAllUserAuthSessions.mockResolvedValue({ modifiedCount: 2 });
        WorkspaceInvitation.find.mockReturnValue(sessionQuery([]));
        archiveWorkspaceInSession.mockResolvedValue({
            status: 'archived',
            canceledSubscriptionCount: 0,
            revokedInvitationCount: 0,
        });
        vi.spyOn(mongoose.connection, 'transaction').mockImplementation(
            async (callback) => callback(session),
        );
    });

    it('ferme un simple membre sans modifier le Workspace et libère son quota membre', async () => {
        mockActiveUser();
        const membership = createMembership({
            id: 'member-id',
            workspaceId: 'workspace-id',
        });
        WorkspaceMember.find.mockReturnValue(membershipQuery([membership]));
        const { deletionRequestedAt, closedAt } =
            mockSuccessfulUserLifecycle();

        const result = await requestCurrentUserClosure({
            userId: 'user-id',
            currentPassword: 'Correct Horse Battery Staple',
            confirmationEmail: 'Greg@Example.com',
            ipAddress: '127.0.0.1',
            userAgent: 'Test Browser',
        });

        expect(confirmCurrentUserPassword).toHaveBeenCalledWith({
            userId: 'user-id',
            password: 'Correct Horse Battery Staple',
        });
        expect(assertUserIsNotPlatformFounder).toHaveBeenCalledWith({
            userId: 'user-id',
            session,
        });
        expect(archiveWorkspaceInSession).not.toHaveBeenCalled();
        expect(membership.status).toBe('removed');
        expect(membership.save).toHaveBeenCalledWith({ session });
        expect(
            runApplicationWorkspaceMemberRemovedLifecycle,
        ).toHaveBeenCalledWith({
            workspaceId: membership.workspace._id,
            membershipId: membership._id,
            userId: membership.user,
            actorId: 'user-id',
            session,
            ipAddress: '127.0.0.1',
            userAgent: 'Test Browser',
        });
        expect(releaseCurrentUsageMetric).toHaveBeenCalledWith(
            expect.objectContaining({
                workspaceId: membership.workspace._id,
                amount: 1,
                actorId: 'user-id',
                session,
            }),
        );
        expect(revokeAllUserAuthSessions).toHaveBeenCalledWith({
            userId: 'user-id',
            revokedReason: AUTH_SESSION_REVOKED_REASON.USER_CLOSED,
            session,
        });
        expect(result).toEqual({
            id: 'user-id',
            status: 'closed',
            deletionRequestedAt,
            closedAt,
            ownedWorkspaceCount: 0,
            archivedWorkspaceCount: 0,
            canceledSubscriptionCount: 0,
            revokedWorkspaceInvitationCount: 0,
            removedMembershipCount: 1,
            revokedInvitationCount: 0,
            revokedSessionCount: 2,
        });
    });

    it('archive automatiquement le Workspace encore possédé puis retire la membership owner', async () => {
        mockActiveUser();
        const ownerMembership = createMembership({
            id: 'owner-member-id',
            workspaceId: 'owned-workspace-id',
            roleKey: 'owner',
        });
        WorkspaceMember.find.mockReturnValue(
            membershipQuery([ownerMembership]),
        );
        archiveWorkspaceInSession.mockResolvedValue({
            status: 'archived',
            canceledSubscriptionCount: 1,
            revokedInvitationCount: 2,
        });
        mockSuccessfulUserLifecycle();

        const result = await requestCurrentUserClosure({
            userId: 'user-id',
            currentPassword: 'Correct Horse Battery Staple',
            confirmationEmail: 'greg@example.com',
        });

        expect(archiveWorkspaceInSession).toHaveBeenCalledWith({
            workspaceId: ownerMembership.workspace._id,
            actorId: 'user-id',
            session,
            ipAddress: null,
            userAgent: null,
        });
        expect(ownerMembership.status).toBe('removed');
        expect(ownerMembership.save).toHaveBeenCalledWith({ session });
        expect(result).toMatchObject({
            status: 'closed',
            ownedWorkspaceCount: 1,
            archivedWorkspaceCount: 1,
            canceledSubscriptionCount: 1,
            revokedWorkspaceInvitationCount: 2,
            removedMembershipCount: 1,
        });
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.USER_CLOSED,
                metadata: expect.objectContaining({
                    reason: 'self_service_account_closure',
                    archivedWorkspaceCount: 1,
                }),
            }),
            { session },
        );
    });

    it('laisse actif un Workspace transféré avant fermeture car le User n’est plus owner', async () => {
        mockActiveUser();
        const formerOwnerMembership = createMembership({
            id: 'former-owner-member-id',
            workspaceId: 'transferred-workspace-id',
            roleKey: 'admin',
        });
        WorkspaceMember.find.mockReturnValue(
            membershipQuery([formerOwnerMembership]),
        );
        mockSuccessfulUserLifecycle();

        const result = await requestCurrentUserClosure({
            userId: 'user-id',
            currentPassword: 'Correct Horse Battery Staple',
            confirmationEmail: 'greg@example.com',
        });

        expect(archiveWorkspaceInSession).not.toHaveBeenCalled();
        expect(formerOwnerMembership.status).toBe('removed');
        expect(result).toMatchObject({
            ownedWorkspaceCount: 0,
            archivedWorkspaceCount: 0,
            removedMembershipCount: 1,
            status: 'closed',
        });
    });

    it('archive tous les Workspaces encore possédés et retire aussi les memberships externes', async () => {
        mockActiveUser();
        const ownerA = createMembership({
            id: 'owner-a',
            workspaceId: 'workspace-a',
            roleKey: 'owner',
        });
        const ownerB = createMembership({
            id: 'owner-b',
            workspaceId: 'workspace-b',
            roleKey: 'owner',
        });
        const externalMember = createMembership({
            id: 'member-c',
            workspaceId: 'workspace-c',
            roleKey: 'member',
        });
        WorkspaceMember.find.mockReturnValue(
            membershipQuery([ownerA, ownerB, externalMember]),
        );
        archiveWorkspaceInSession
            .mockResolvedValueOnce({
                status: 'archived',
                canceledSubscriptionCount: 1,
                revokedInvitationCount: 1,
            })
            .mockResolvedValueOnce({
                status: 'archived',
                canceledSubscriptionCount: 2,
                revokedInvitationCount: 0,
            });
        mockSuccessfulUserLifecycle();

        const result = await requestCurrentUserClosure({
            userId: 'user-id',
            currentPassword: 'Correct Horse Battery Staple',
            confirmationEmail: 'greg@example.com',
        });

        expect(archiveWorkspaceInSession).toHaveBeenCalledTimes(2);
        expect(archiveWorkspaceInSession.mock.calls[0][0].workspaceId)
            .toBe(ownerA.workspace._id);
        expect(archiveWorkspaceInSession.mock.calls[1][0].workspaceId)
            .toBe(ownerB.workspace._id);
        expect(ownerA.save).toHaveBeenCalledWith({ session });
        expect(ownerB.save).toHaveBeenCalledWith({ session });
        expect(externalMember.save).toHaveBeenCalledWith({ session });
        expect(releaseCurrentUsageMetric).toHaveBeenCalledTimes(3);
        expect(result).toMatchObject({
            ownedWorkspaceCount: 2,
            archivedWorkspaceCount: 2,
            canceledSubscriptionCount: 3,
            revokedWorkspaceInvitationCount: 1,
            removedMembershipCount: 3,
            status: 'closed',
        });
    });

    it('interrompt toute la fermeture si le lifecycle applicatif d’un membership échoue', async () => {
        mockActiveUser();
        const membership = createMembership({
            id: 'member-id',
            workspaceId: 'workspace-id',
        });
        WorkspaceMember.find.mockReturnValue(membershipQuery([membership]));
        const lifecycleError = new Error('application cleanup failed');
        runApplicationWorkspaceMemberRemovedLifecycle.mockRejectedValueOnce(
            lifecycleError,
        );

        await expect(requestCurrentUserClosure({
            userId: 'user-id',
            currentPassword: 'Correct Horse Battery Staple',
            confirmationEmail: 'greg@example.com',
        })).rejects.toBe(lifecycleError);

        expect(membership.save).toHaveBeenCalledWith({ session });
        expect(releaseCurrentUsageMetric).not.toHaveBeenCalled();
        expect(User.findOneAndUpdate).not.toHaveBeenCalled();
        expect(revokeAllUserAuthSessions).not.toHaveBeenCalled();
    });

    it('révoque les invitations reçues et journalise les deux étapes User', async () => {
        mockActiveUser();
        WorkspaceMember.find.mockReturnValue(membershipQuery([]));

        const invitation = {
            _id: 'invitation-id',
            workspace: 'workspace-id',
            status: 'pending',
        };
        WorkspaceInvitation.find.mockReturnValue(
            sessionQuery([invitation]),
        );
        WorkspaceInvitation.findOneAndUpdate.mockResolvedValue({
            ...invitation,
            status: 'revoked',
        });
        mockSuccessfulUserLifecycle();

        await requestCurrentUserClosure({
            userId: 'user-id',
            currentPassword: 'Correct Horse Battery Staple',
            confirmationEmail: 'greg@example.com',
        });

        expect(WorkspaceInvitation.findOneAndUpdate).toHaveBeenCalledWith(
            {
                _id: 'invitation-id',
                status: 'pending',
            },
            {
                $set: {
                    status: 'revoked',
                    revokedAt: expect.any(Date),
                    revokedBy: 'user-id',
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.USER_DELETION_REQUESTED,
                entityId: 'user-id',
            }),
            { session },
        );
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.USER_CLOSED,
                entityId: 'user-id',
            }),
            { session },
        );
    });

    it('refuse la fermeture du Fondateur avant toute mutation métier', async () => {
        mockActiveUser({
            emailCanonical: 'founder@example.com',
            platformRole: 'super_admin',
        });
        assertUserIsNotPlatformFounder.mockRejectedValue(
            Object.assign(new Error('Fondateur protégé'), { statusCode: 403 }),
        );

        await expect(
            requestCurrentUserClosure({
                userId: 'user-id',
                currentPassword: 'Correct Horse Battery Staple',
                confirmationEmail: 'founder@example.com',
            }),
        ).rejects.toMatchObject({ statusCode: 403 });

        expect(User.countDocuments).not.toHaveBeenCalled();
        expect(WorkspaceMember.find).not.toHaveBeenCalled();
        expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('refuse la fermeture du dernier super-admin actif avant bootstrap Fondateur', async () => {
        mockActiveUser({
            emailCanonical: 'admin@example.com',
            platformRole: 'super_admin',
        });
        User.countDocuments.mockReturnValue(sessionQuery(1));

        await expect(
            requestCurrentUserClosure({
                userId: 'user-id',
                currentPassword: 'Correct Horse Battery Staple',
                confirmationEmail: 'admin@example.com',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message: expect.stringContaining('dernier super-admin actif'),
        });

        expect(WorkspaceMember.find).not.toHaveBeenCalled();
        expect(archiveWorkspaceInSession).not.toHaveBeenCalled();
        expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('refuse une confirmation email incorrecte avant toute mutation métier', async () => {
        mockActiveUser();

        await expect(
            requestCurrentUserClosure({
                userId: 'user-id',
                currentPassword: 'Correct Horse Battery Staple',
                confirmationEmail: 'other@example.com',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message: expect.stringContaining('confirmation'),
        });

        expect(WorkspaceMember.find).not.toHaveBeenCalled();
        expect(User.findOneAndUpdate).not.toHaveBeenCalled();
        expect(revokeAllUserAuthSessions).not.toHaveBeenCalled();
    });

    it('échoue en sécurité si une membership active référence un contexte incohérent', async () => {
        mockActiveUser();
        WorkspaceMember.find.mockReturnValue(membershipQuery([
            {
                _id: 'member-id',
                role: null,
                workspace: {
                    _id: { toString: () => 'workspace-id' },
                    status: 'active',
                },
            },
        ]));

        await expect(
            requestCurrentUserClosure({
                userId: 'user-id',
                currentPassword: 'Correct Horse Battery Staple',
                confirmationEmail: 'greg@example.com',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message: expect.stringContaining('incohérente'),
        });

        expect(archiveWorkspaceInSession).not.toHaveBeenCalled();
        expect(User.findOneAndUpdate).not.toHaveBeenCalled();
        expect(WorkspaceInvitation.find).not.toHaveBeenCalled();
    });

    it('interrompt toute la fermeture si l’archivage d’un Workspace échoue', async () => {
        mockActiveUser();
        const ownerA = createMembership({
            id: 'owner-a',
            workspaceId: 'workspace-a',
            roleKey: 'owner',
        });
        const ownerB = createMembership({
            id: 'owner-b',
            workspaceId: 'workspace-b',
            roleKey: 'owner',
        });
        WorkspaceMember.find.mockReturnValue(
            membershipQuery([ownerA, ownerB]),
        );
        archiveWorkspaceInSession
            .mockResolvedValueOnce({
                status: 'archived',
                canceledSubscriptionCount: 1,
                revokedInvitationCount: 0,
            })
            .mockRejectedValueOnce(
                new Error('workspace concurrent update'),
            );

        await expect(
            requestCurrentUserClosure({
                userId: 'user-id',
                currentPassword: 'Correct Horse Battery Staple',
                confirmationEmail: 'greg@example.com',
            }),
        ).rejects.toThrow('workspace concurrent update');

        expect(archiveWorkspaceInSession).toHaveBeenCalledTimes(2);
        expect(ownerA.save).not.toHaveBeenCalled();
        expect(ownerB.save).not.toHaveBeenCalled();
        expect(User.findOneAndUpdate).not.toHaveBeenCalled();
        expect(revokeAllUserAuthSessions).not.toHaveBeenCalled();
    });
});
