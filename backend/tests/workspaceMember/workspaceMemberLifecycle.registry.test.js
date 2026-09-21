import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    ACTIVE_APPLICATION_WORKSPACE_MEMBER_LIFECYCLE_REGISTRY,
    runApplicationWorkspaceMemberRemovedLifecycle,
} from '../../config/applicationWorkspaceMemberLifecycle.registry.js';
import {
    createWorkspaceMemberLifecycleRegistry,
    runWorkspaceMemberRemovedLifecycle,
} from '../../modules/workspaceMember/workspaceMemberLifecycle.registry.js';


describe('WorkspaceMember lifecycle registry', () => {
    it('conserve le comportement Core lorsqu’aucun module applicatif n’est enregistré', async () => {
        expect(
            ACTIVE_APPLICATION_WORKSPACE_MEMBER_LIFECYCLE_REGISTRY
                .memberRemovedHandlers,
        ).toEqual([]);

        await expect(
            runApplicationWorkspaceMemberRemovedLifecycle({
                workspaceId: 'workspace-id',
                membershipId: 'membership-id',
                userId: 'user-id',
                actorId: 'actor-id',
                session: { id: 'session' },
            }),
        ).resolves.toBeUndefined();
    });

    it('exécute plusieurs handlers dans l’ordre déclaré avec la même session', async () => {
        const calls = [];
        const session = { id: 'mongo-session' };
        const firstHandler = vi.fn(async (context) => {
            calls.push(['first', context]);
        });
        const secondHandler = vi.fn(async (context) => {
            calls.push(['second', context]);
        });
        const registry = createWorkspaceMemberLifecycleRegistry([
            {
                key: 'first-module',
                onMemberRemoved: firstHandler,
            },
            {
                key: 'second-module',
                onMemberRemoved: secondHandler,
            },
        ]);

        await runWorkspaceMemberRemovedLifecycle({
            registry,
            workspaceId: 'workspace-id',
            membershipId: 'membership-id',
            userId: 'user-id',
            actorId: 'actor-id',
            session,
            ipAddress: '127.0.0.1',
            userAgent: 'Test Browser',
        });

        expect(calls.map(([key]) => key)).toEqual([
            'first',
            'second',
        ]);
        expect(firstHandler).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
            membershipId: 'membership-id',
            userId: 'user-id',
            actorId: 'actor-id',
            session,
            ipAddress: '127.0.0.1',
            userAgent: 'Test Browser',
        });
        expect(secondHandler.mock.calls[0][0].session).toBe(session);
    });

    it('propage l’échec d’un handler et n’exécute pas les suivants', async () => {
        const failure = new Error('application cleanup failed');
        const secondHandler = vi.fn();
        const registry = createWorkspaceMemberLifecycleRegistry([
            {
                key: 'failing-module',
                onMemberRemoved: vi.fn().mockRejectedValue(failure),
            },
            {
                key: 'never-reached',
                onMemberRemoved: secondHandler,
            },
        ]);

        await expect(runWorkspaceMemberRemovedLifecycle({
            registry,
            workspaceId: 'workspace-id',
            membershipId: 'membership-id',
            userId: 'user-id',
            actorId: 'actor-id',
            session: { id: 'session' },
        })).rejects.toBe(failure);

        expect(secondHandler).not.toHaveBeenCalled();
    });

    it('refuse les descriptors invalides et les clés dupliquées', () => {
        expect(() => createWorkspaceMemberLifecycleRegistry([
            {
                key: 'invalid module',
                onMemberRemoved: vi.fn(),
            },
        ])).toThrow('invalid key');

        expect(() => createWorkspaceMemberLifecycleRegistry([
            {
                key: 'dossier-access',
                onMemberRemoved: vi.fn(),
            },
            {
                key: 'dossier-access',
                onMemberRemoved: vi.fn(),
            },
        ])).toThrow(
            'Duplicate WorkspaceMember lifecycle module key: dossier-access',
        );

        expect(() => createWorkspaceMemberLifecycleRegistry([
            {
                key: 'missing-handler',
            },
        ])).toThrow('requires onMemberRemoved');
    });
});
