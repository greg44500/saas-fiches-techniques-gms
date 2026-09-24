import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    PLATFORM_PERMISSION,
} from '../../constants/platformPermissions.constants.js';
import {
    PLATFORM_TEAM_MEMBER_STATUS,
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
import {
    getCurrentPlatformContext,
} from '../../modules/platform/currentContext/platformCurrentContext.service.js';
import {
    resolveApplicationGlobalAuthorization,
} from '../../modules/applicationGlobalAuthorization/applicationGlobalAuthorization.service.js';
import { PlatformRole } from '../../modules/platformRole/platformRole.model.js';
import {
    resolvePlatformAuthorization,
} from '../../modules/platformTeam/platformAuthorization.service.js';

vi.mock(
    '../../modules/applicationGlobalAuthorization/applicationGlobalAuthorization.service.js',
    () => ({
        resolveApplicationGlobalAuthorization: vi.fn(),
    }),
);

vi.mock('../../modules/platformRole/platformRole.model.js', () => ({
    PlatformRole: {
        findById: vi.fn(),
    },
}));

vi.mock('../../modules/platformTeam/platformAuthorization.service.js', () => ({
    resolvePlatformAuthorization: vi.fn(),
}));

const user = {
    _id: 'user-id',
};


describe('getCurrentPlatformContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resolveApplicationGlobalAuthorization.mockResolvedValue({
            source: 'none',
            permissions: [],
            status: null,
        });
    });

    it('expose explicitement la qualité de Fondateur et le rôle effectif', async () => {
        resolvePlatformAuthorization.mockResolvedValue({
            source: 'team_member',
            membership: {
                _id: 'member-id',
                role: 'role-id',
            },
            role: {
                _id: 'role-id',
                key: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
                name: 'Super administrateur',
                description: 'Autorité administrative maximale.',
                isSystem: true,
            },
            roleKey: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
            permissions: [
                PLATFORM_PERMISSION.USERS_READ,
                PLATFORM_PERMISSION.SUPER_ADMINS_MANAGE,
            ],
            isFounder: true,
            status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
        });

        const context = await getCurrentPlatformContext({ user });

        expect(resolvePlatformAuthorization).toHaveBeenCalledWith({
            user,
        });
        expect(resolveApplicationGlobalAuthorization).toHaveBeenCalledWith({
            user,
        });
        expect(context).toEqual({
            isFounder: true,
            status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
            role: {
                id: 'role-id',
                key: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
                name: 'Super administrateur',
                description: 'Autorité administrative maximale.',
                isSystem: true,
            },
            permissions: [
                PLATFORM_PERMISSION.USERS_READ,
                PLATFORM_PERMISSION.SUPER_ADMINS_MANAGE,
            ],
            applicationGlobalPermissions: [],
        });
        expect(PlatformRole.findById).not.toHaveBeenCalled();
    });

    it('expose séparément les permissions Application Global explicitement attribuées', async () => {
        resolvePlatformAuthorization.mockResolvedValue({
            source: 'team_member',
            membership: {
                _id: 'member-id',
                role: 'role-id',
            },
            role: {
                _id: 'role-id',
                key: PLATFORM_TEAM_ROLE_KEY.TECHNICAL_SUPPORT,
                name: 'Support technique',
                description: 'Support technique.',
                isSystem: true,
            },
            roleKey: PLATFORM_TEAM_ROLE_KEY.TECHNICAL_SUPPORT,
            permissions: [
                PLATFORM_PERMISSION.OVERVIEW_READ,
            ],
            isFounder: false,
            status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
        });
        resolveApplicationGlobalAuthorization.mockResolvedValue({
            source: 'application_global_member',
            permissions: [
                'derived:reference:read',
                'derived:reference:manage',
            ],
            status: 'active',
        });

        const context = await getCurrentPlatformContext({ user });

        expect(context.permissions).toEqual([
            PLATFORM_PERMISSION.OVERVIEW_READ,
        ]);
        expect(context.applicationGlobalPermissions).toEqual([
            'derived:reference:read',
            'derived:reference:manage',
        ]);
    });

    it('n’accorde aucun droit Application Global implicite au Super Admin Platform', async () => {
        resolvePlatformAuthorization.mockResolvedValue({
            source: 'team_member',
            membership: {
                _id: 'member-id',
                role: 'role-id',
            },
            role: {
                _id: 'role-id',
                key: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
                name: 'Super administrateur',
                description: 'Autorité administrative maximale.',
                isSystem: true,
            },
            roleKey: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
            permissions: Object.values(PLATFORM_PERMISSION),
            isFounder: true,
            status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
        });

        const context = await getCurrentPlatformContext({ user });

        expect(context.applicationGlobalPermissions).toEqual([]);
    });

    it('conserve le rôle visible d’un membre suspendu sans lui rendre ses permissions', async () => {
        resolvePlatformAuthorization.mockResolvedValue({
            source: 'team_member',
            membership: {
                _id: 'member-id',
                role: 'role-id',
            },
            role: null,
            roleKey: null,
            permissions: [],
            isFounder: false,
            status: PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
        });
        PlatformRole.findById.mockResolvedValue({
            _id: 'role-id',
            key: PLATFORM_TEAM_ROLE_KEY.TECHNICAL_SUPPORT,
            name: 'Support technique',
            description: 'Support technique.',
            isSystem: true,
        });

        const context = await getCurrentPlatformContext({ user });

        expect(PlatformRole.findById).toHaveBeenCalledWith('role-id');
        expect(context).toEqual({
            isFounder: false,
            status: PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
            role: {
                id: 'role-id',
                key: PLATFORM_TEAM_ROLE_KEY.TECHNICAL_SUPPORT,
                name: 'Support technique',
                description: 'Support technique.',
                isSystem: true,
            },
            permissions: [],
            applicationGlobalPermissions: [],
        });
    });

    it('retourne null pour un utilisateur sans appartenance Platform courante', async () => {
        resolvePlatformAuthorization.mockResolvedValue({
            source: 'none',
            membership: null,
            role: null,
            roleKey: null,
            permissions: [],
            isFounder: false,
            status: null,
        });

        await expect(
            getCurrentPlatformContext({ user }),
        ).resolves.toBeNull();
        expect(
            resolveApplicationGlobalAuthorization,
        ).not.toHaveBeenCalled();
    });

    it('ne réexpose pas un ancien membre révoqué comme accès Platform courant', async () => {
        resolvePlatformAuthorization.mockResolvedValue({
            source: 'team_history',
            membership: null,
            role: null,
            roleKey: null,
            permissions: [],
            isFounder: false,
            status: PLATFORM_TEAM_MEMBER_STATUS.REVOKED,
        });

        await expect(
            getCurrentPlatformContext({ user }),
        ).resolves.toBeNull();
        expect(
            resolveApplicationGlobalAuthorization,
        ).not.toHaveBeenCalled();
    });

    it('préserve le contexte du super-admin legacy pendant la transition sans le marquer Fondateur', async () => {
        resolvePlatformAuthorization.mockResolvedValue({
            source: 'legacy_super_admin',
            membership: null,
            role: null,
            roleKey: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
            permissions: [
                PLATFORM_PERMISSION.SUPER_ADMINS_MANAGE,
            ],
            isFounder: false,
            status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
        });

        const context = await getCurrentPlatformContext({ user });

        expect(context.isFounder).toBe(false);
        expect(context.role).toMatchObject({
            id: null,
            key: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
            name: 'Super administrateur',
            isSystem: true,
        });
        expect(context.permissions).toEqual([
            PLATFORM_PERMISSION.SUPER_ADMINS_MANAGE,
        ]);
        expect(context.applicationGlobalPermissions).toEqual([]);
    });
});
