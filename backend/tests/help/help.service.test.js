import { describe, expect, it, vi } from 'vitest';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import {
    PLATFORM_PERMISSION,
} from '../../constants/platformPermissions.constants.js';
import {
    PLATFORM_TEAM_MEMBER_STATUS,
} from '../../constants/platformTeam.constants.js';
import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';
import {
    WORKSPACE_ACCESS_MODE,
} from '../../constants/workspaceAccess.constants.js';
import {
    createHelpRegistry,
    HELP_CONTEXT,
} from '../../modules/help/help.registry.js';
import { createHelpService } from '../../modules/help/help.service.js';


const categories = [
    {
        id: 'workspace_test',
        context: HELP_CONTEXT.WORKSPACE,
        label: 'Workspace',
        description: 'Workspace help.',
        order: 10,
    },
    {
        id: 'platform_test',
        context: HELP_CONTEXT.PLATFORM,
        label: 'Platform',
        description: 'Platform help.',
        order: 10,
    },
];

const makeEntry = ({
    id,
    context,
    permission = null,
    applicationGlobalPermission = null,
    ownerOnly = false,
    feature = null,
    relatedEntryIds = [],
}) => ({
    id,
    context,
    categoryId: context === HELP_CONTEXT.WORKSPACE
        ? 'workspace_test'
        : 'platform_test',
    title: id,
    summary: `Summary ${id}`,
    search: {
        keywords: ['test'],
        questions: ['Question test ?'],
    },
    audience: {
        permissions: permission ? [permission] : [],
        applicationGlobalPermissions: applicationGlobalPermission
            ? [applicationGlobalPermission]
            : [],
        ownerOnly,
    },
    requirements: {
        features: feature ? [feature] : [],
    },
    whoCanPerform: 'Utilisateur autorisé.',
    prerequisites: [],
    steps: ['Étape de test.'],
    outcome: 'Résultat de test.',
    edgeCases: [],
    sensitiveConsequences: [],
    relatedEntryIds,
    order: 10,
});

const registry = createHelpRegistry({
    categories,
    entries: [
        makeEntry({
            id: 'workspace.test.public',
            context: HELP_CONTEXT.WORKSPACE,
            relatedEntryIds: ['workspace.test.invite'],
        }),
        makeEntry({
            id: 'workspace.test.invite',
            context: HELP_CONTEXT.WORKSPACE,
            permission: CORE_PERMISSION.MEMBER_INVITE,
        }),
        makeEntry({
            id: 'workspace.test.owner',
            context: HELP_CONTEXT.WORKSPACE,
            ownerOnly: true,
        }),
        makeEntry({
            id: 'workspace.test.feature',
            context: HELP_CONTEXT.WORKSPACE,
            feature: 'team_management',
        }),
        makeEntry({
            id: 'platform.test.users',
            context: HELP_CONTEXT.PLATFORM,
            permission: PLATFORM_PERMISSION.USERS_READ,
        }),
        makeEntry({
            id: 'platform.test.team',
            context: HELP_CONTEXT.PLATFORM,
            permission: PLATFORM_PERMISSION.TEAM_INVITE,
        }),
        makeEntry({
            id: 'platform.test.catalog',
            context: HELP_CONTEXT.PLATFORM,
            applicationGlobalPermission: 'catalog:read',
        }),
    ],
    workspaceRemediationEntryIds: ['workspace.test.public'],
    applicationGlobalPermissions: ['catalog:read'],
});

const workspace = {
    _id: '507f1f77bcf86cd799439011',
};
const memberRole = {
    key: 'member',
    isSystem: true,
};
const ownerRole = {
    key: SYSTEM_ROLE_KEY.OWNER,
    isSystem: true,
};

const createWorkspaceAccess = ({
    features = [],
    accessMode = WORKSPACE_ACCESS_MODE.NORMAL,
} = {}) => ({
    effectiveCapabilities: { features },
    accessMode,
});


describe('help.service', () => {
    it('ne sérialise que les fiches Workspace compatibles avec les droits effectifs', async () => {
        const service = createHelpService({
            registry,
            resolveWorkspaceAccess: vi.fn(async () =>
                createWorkspaceAccess()),
        });

        const catalog = await service.getWorkspaceCatalog({
            workspace,
            permissions: [CORE_PERMISSION.MEMBER_INVITE],
            role: memberRole,
        });

        const visibleEntryIds = catalog.entries.map(({ id }) => id);

        expect(visibleEntryIds).toHaveLength(2);
        expect(visibleEntryIds).toEqual(expect.arrayContaining([
            'workspace.test.public',
            'workspace.test.invite',
        ]));
        expect(catalog.entries).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({ audience: expect.anything() }),
            ]),
        );
    });

    it('filtre ownerOnly et les features puis autorise le propriétaire lorsque les conditions sont remplies', async () => {
        const service = createHelpService({
            registry,
            resolveWorkspaceAccess: vi.fn(async () =>
                createWorkspaceAccess({
                    features: ['team_management'],
                })),
        });

        const catalog = await service.getWorkspaceCatalog({
            workspace,
            permissions: [],
            role: ownerRole,
        });

        const visibleEntryIds = catalog.entries.map(({ id }) => id);

        expect(visibleEntryIds).toHaveLength(3);
        expect(visibleEntryIds).toEqual(expect.arrayContaining([
            'workspace.test.public',
            'workspace.test.owner',
            'workspace.test.feature',
        ]));
    });

    it('masque en remédiation les procédures réservées au mode normal', async () => {
        const service = createHelpService({
            registry,
            resolveWorkspaceAccess: vi.fn(async () =>
                createWorkspaceAccess({
                    accessMode: WORKSPACE_ACCESS_MODE.REMEDIATION,
                })),
        });

        const catalog = await service.getWorkspaceCatalog({
            workspace,
            permissions: [CORE_PERMISSION.MEMBER_INVITE],
            role: memberRole,
        });

        expect(catalog.entries.map(({ id }) => id)).toEqual([
            'workspace.test.public',
        ]);
    });

    it('retourne le même 404 pour une fiche Workspace interdite et une fiche inexistante', async () => {
        const service = createHelpService({
            registry,
            resolveWorkspaceAccess: vi.fn(async () =>
                createWorkspaceAccess()),
        });

        const readHidden = () => service.getWorkspaceEntry({
            workspace,
            permissions: [],
            role: memberRole,
            entryId: 'workspace.test.invite',
        });
        const readMissing = () => service.getWorkspaceEntry({
            workspace,
            permissions: [],
            role: memberRole,
            entryId: 'workspace.test.missing',
        });

        await expect(readHidden()).rejects.toMatchObject({
            statusCode: 404,
            message: 'Aide introuvable',
        });
        await expect(readMissing()).rejects.toMatchObject({
            statusCode: 404,
            message: 'Aide introuvable',
        });
    });

    it('retire des "Voir aussi" les fiches non autorisées', async () => {
        const service = createHelpService({
            registry,
            resolveWorkspaceAccess: vi.fn(async () =>
                createWorkspaceAccess()),
        });

        const entry = await service.getWorkspaceEntry({
            workspace,
            permissions: [],
            role: memberRole,
            entryId: 'workspace.test.public',
        });

        expect(entry.relatedEntryIds).toEqual([]);
    });

    it('limite le catalogue Platform aux permissions effectives du membre', async () => {
        const service = createHelpService({
            registry,
            resolvePlatformAccess: vi.fn(async () => ({
                source: 'team_member',
                status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
                permissions: [PLATFORM_PERMISSION.USERS_READ],
            })),
            resolveApplicationGlobalAccess: vi.fn(async () => ({
                permissions: [],
            })),
        });

        const catalog = await service.getPlatformCatalog({
            user: { _id: 'user-id' },
        });

        expect(catalog.entries.map(({ id }) => id)).toEqual([
            'platform.test.users',
        ]);
    });

    it('filtre aussi les fiches Platform selon les permissions Application Global effectives', async () => {
        const service = createHelpService({
            registry,
            resolvePlatformAccess: vi.fn(async () => ({
                source: 'team_member',
                status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
                permissions: [PLATFORM_PERMISSION.USERS_READ],
            })),
            resolveApplicationGlobalAccess: vi.fn(async () => ({
                permissions: ['catalog:read'],
            })),
        });

        const catalog = await service.getPlatformCatalog({
            user: { _id: 'user-id' },
        });

        expect(catalog.entries.map(({ id }) => id)).toEqual(
            expect.arrayContaining([
                'platform.test.users',
                'platform.test.catalog',
            ]),
        );
        expect(catalog.entries.map(({ id }) => id))
            .not.toContain('platform.test.team');
    });

    it('refuse le centre Platform à un utilisateur sans contexte Platform actif', async () => {
        const service = createHelpService({
            registry,
            resolvePlatformAccess: vi.fn(async () => ({
                source: 'none',
                status: null,
                permissions: [],
            })),
        });

        await expect(service.getPlatformCatalog({
            user: { _id: 'user-id' },
        })).rejects.toMatchObject({
            statusCode: 403,
            message: 'Centre d’aide Platform indisponible',
        });
    });
});