import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    auditMock,
    lifecycleMock,
    findMemberMock,
    findRoleMock,
    releaseMock,
    sessionMock,
    transactionMock,
} = vi.hoisted(() => ({
    auditMock: vi.fn(),
    lifecycleMock: vi.fn(),
    findMemberMock: vi.fn(),
    findRoleMock: vi.fn(),
    releaseMock: vi.fn(),
    sessionMock: {},
    transactionMock: vi.fn(),
}));

vi.mock('mongoose', () => ({
    default: {
        connection: { transaction: transactionMock },
    },
}));

vi.mock('../../config/applicationWorkspaceMemberLifecycle.registry.js', () => ({
    runApplicationWorkspaceMemberRemovedLifecycle: lifecycleMock,
}));

vi.mock('../../modules/workspaceMember/workspaceMember.model.js', () => ({
    WorkspaceMember: { findOne: findMemberMock },
}));

vi.mock('../../modules/role/role.model.js', () => ({
    Role: { findOne: findRoleMock },
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: auditMock,
}));

vi.mock('../../modules/usageMetric/releaseUsageMetric.service.js', () => ({
    releaseCurrentUsageMetric: releaseMock,
}));

import {
    removeWorkspaceMember,
    suspendWorkspaceMember,
    updateWorkspaceMemberRole,
} from '../../modules/workspaceMember/workspaceMember.service.js';

const makeMemberQuery = (membership) => ({
    populate: vi.fn(() => ({
        session: vi.fn(async () => membership),
    })),
});

const makeRoleQuery = (role) => ({
    session: vi.fn(async () => role),
});

const createMembership = ({
    status = 'active',
    roleKey = 'member',
    user = '507f1f77bcf86cd799439020',
} = {}) => ({
    _id: { toString: () => '507f1f77bcf86cd799439010' },
    user: { toString: () => user },
    role: {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        key: roleKey,
        isSystem: true,
    },
    status,
    save: vi.fn(async () => undefined),
});

beforeEach(() => {
    vi.clearAllMocks();
    lifecycleMock.mockResolvedValue(undefined);
    transactionMock.mockImplementation(async (callback) => callback(sessionMock));
});

describe('workspaceMember.service', () => {
    it('interdit toute modification du owner', async () => {
        const membership = createMembership({ roleKey: 'owner' });
        findMemberMock.mockReturnValue(makeMemberQuery(membership));

        await expect(suspendWorkspaceMember({
            workspaceId: 'workspace-id',
            memberId: 'member-id',
            actorId: 'actor-id',
        })).rejects.toMatchObject({ statusCode: 409 });

        expect(membership.save).not.toHaveBeenCalled();
    });

    it('interdit à un administrateur de modifier sa propre appartenance', async () => {
        const actorId = '507f1f77bcf86cd799439020';
        const membership = createMembership({ user: actorId });
        findMemberMock.mockReturnValue(makeMemberQuery(membership));

        await expect(removeWorkspaceMember({
            workspaceId: 'workspace-id',
            memberId: 'member-id',
            actorId,
        })).rejects.toMatchObject({ statusCode: 409 });

        expect(releaseMock).not.toHaveBeenCalled();
    });

    it('change le rôle actif sans permettre une attribution owner', async () => {
        const membership = createMembership();
        findMemberMock.mockReturnValue(makeMemberQuery(membership));
        findRoleMock.mockReturnValue(makeRoleQuery({
            _id: '507f1f77bcf86cd799439030',
            key: 'manager',
            isSystem: true,
        }));

        await updateWorkspaceMemberRole({
            workspaceId: 'workspace-id',
            memberId: 'member-id',
            roleId: 'role-id',
            actorId: 'actor-id',
        });

        expect(membership.role).toBe('507f1f77bcf86cd799439030');
        expect(membership.save).toHaveBeenCalledWith({ session: sessionMock });
        expect(auditMock).toHaveBeenCalledOnce();
    });

    it('suspend un membre sans libérer le quota members', async () => {
        const membership = createMembership();
        findMemberMock.mockReturnValue(makeMemberQuery(membership));

        await suspendWorkspaceMember({
            workspaceId: 'workspace-id',
            memberId: 'member-id',
            actorId: 'actor-id',
        });

        expect(membership.status).toBe('suspended');
        expect(lifecycleMock).not.toHaveBeenCalled();
        expect(releaseMock).not.toHaveBeenCalled();
        expect(auditMock).toHaveBeenCalledOnce();
    });

    it('retire un membre suspendu et libère exactement un siège', async () => {
        const membership = createMembership({ status: 'suspended' });
        findMemberMock.mockReturnValue(makeMemberQuery(membership));

        await removeWorkspaceMember({
            workspaceId: 'workspace-id',
            memberId: 'member-id',
            actorId: 'actor-id',
        });

        expect(membership.status).toBe('removed');
        expect(lifecycleMock).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
            membershipId: membership._id,
            userId: membership.user,
            actorId: 'actor-id',
            session: sessionMock,
            ipAddress: null,
            userAgent: null,
        });
        expect(releaseMock).toHaveBeenCalledWith(expect.objectContaining({
            workspaceId: 'workspace-id',
            metricKey: 'members',
            amount: 1,
            session: sessionMock,
        }));
        expect(auditMock).toHaveBeenCalledOnce();
    });

    it('propage l’échec lifecycle afin de rollbacker le retrait complet', async () => {
        const membership = createMembership();
        const lifecycleError = new Error('dossier cleanup failed');
        findMemberMock.mockReturnValue(makeMemberQuery(membership));
        lifecycleMock.mockRejectedValueOnce(lifecycleError);

        await expect(removeWorkspaceMember({
            workspaceId: 'workspace-id',
            memberId: 'member-id',
            actorId: 'actor-id',
        })).rejects.toBe(lifecycleError);

        expect(membership.save).toHaveBeenCalledWith({ session: sessionMock });
        expect(releaseMock).not.toHaveBeenCalled();
        expect(auditMock).not.toHaveBeenCalled();
    });
});
