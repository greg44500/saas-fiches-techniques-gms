import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    ACTIVE_APPLICATION_WORKSPACE_MEMBER_LIFECYCLE_REGISTRY,
    APPLICATION_WORKSPACE_MEMBER_LIFECYCLE_MODULES,
} from '../../config/applicationWorkspaceMemberLifecycle.registry.js';


describe('application WorkspaceMember lifecycle registry', () => {
    it('compose le handler Dossier dans le lifecycle REMOVED', () => {
        expect(
            APPLICATION_WORKSPACE_MEMBER_LIFECYCLE_MODULES,
        ).toHaveLength(1);

        expect(
            APPLICATION_WORKSPACE_MEMBER_LIFECYCLE_MODULES[0].key,
        ).toBe('dossier-access');

        expect(
            ACTIVE_APPLICATION_WORKSPACE_MEMBER_LIFECYCLE_REGISTRY
                .memberRemovedHandlers,
        ).toEqual([
            expect.objectContaining({
                key: 'dossier-access',
                onMemberRemoved: expect.any(Function),
            }),
        ]);
    });
});
