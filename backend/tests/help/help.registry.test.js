import { describe, expect, it } from 'vitest';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import {
    WORKSPACE_ACCESS_MODE,
} from '../../constants/workspaceAccess.constants.js';
import {
    HELP_CONTEXT,
    MAX_HELP_CATEGORIES_PER_CONTEXT,
    composeHelpModuleExtensions,
    createHelpRegistry,
} from '../../modules/help/help.registry.js';


const category = {
    id: 'workspace_test',
    context: HELP_CONTEXT.WORKSPACE,
    label: 'Test',
    description: 'Catégorie de test.',
    order: 10,
};

const platformCategory = {
    id: 'platform_test',
    context: HELP_CONTEXT.PLATFORM,
    label: 'Platform',
    description: 'Catégorie Platform de test.',
    order: 10,
};

const entry = {
    id: 'workspace.test.read',
    context: HELP_CONTEXT.WORKSPACE,
    categoryId: category.id,
    title: 'Lire une ressource',
    summary: 'Résumé de test.',
    search: {
        keywords: ['lire'],
        questions: ['Comment lire ?'],
    },
    audience: {
        permissions: [CORE_PERMISSION.WORKSPACE_READ],
        ownerOnly: false,
    },
    requirements: {
        features: [],
    },
    whoCanPerform: 'Un membre autorisé.',
    prerequisites: [],
    steps: ['Ouvrez la ressource.'],
    outcome: 'La ressource est visible.',
    edgeCases: [],
    sensitiveConsequences: [],
    relatedEntryIds: [],
    order: 10,
};


describe('help.registry', () => {
    it('construit un registre immuable et limite Workspace au mode normal par défaut', () => {
        const registry = createHelpRegistry({
            categories: [category],
            entries: [entry],
        });

        expect(registry.entries).toHaveLength(1);
        expect(Object.isFrozen(registry.entries)).toBe(true);
        expect(Object.isFrozen(registry.entries[0].search)).toBe(true);
        expect(registry.entries[0].requirements.workspaceAccessModes).toEqual([
            WORKSPACE_ACCESS_MODE.NORMAL,
        ]);
    });

    it('déclare explicitement une fiche Workspace utilisable en remédiation', () => {
        const registry = createHelpRegistry({
            categories: [category],
            entries: [entry],
            workspaceRemediationEntryIds: [entry.id],
        });

        expect(registry.entries[0].requirements.workspaceAccessModes).toEqual([
            WORKSPACE_ACCESS_MODE.NORMAL,
            WORKSPACE_ACCESS_MODE.REMEDIATION,
        ]);
    });

    it('accepte une action directement rattachée au contexte', () => {
        const registry = createHelpRegistry({
            categories: [category],
            entries: [{
                ...entry,
                id: 'workspace.archive',
            }],
        });

        expect(registry.entries[0].id).toBe('workspace.archive');
    });

    it('valide une exigence Application Global uniquement dans le contexte Platform', () => {
        const registry = createHelpRegistry({
            categories: [platformCategory],
            entries: [{
                ...entry,
                id: 'platform.test.global',
                context: HELP_CONTEXT.PLATFORM,
                categoryId: platformCategory.id,
                audience: {
                    permissions: [],
                    applicationGlobalPermissions: ['catalog:read'],
                    ownerOnly: false,
                },
            }],
            applicationGlobalPermissions: ['catalog:read'],
        });

        expect(
            registry.entries[0].audience.applicationGlobalPermissions,
        ).toEqual(['catalog:read']);
    });

    it('refuse une exigence Application Global sur une fiche Workspace', () => {
        expect(() => createHelpRegistry({
            categories: [category],
            entries: [{
                ...entry,
                audience: {
                    permissions: [CORE_PERMISSION.WORKSPACE_READ],
                    applicationGlobalPermissions: ['catalog:read'],
                    ownerOnly: false,
                },
            }],
            applicationGlobalPermissions: ['catalog:read'],
        })).toThrow(/cannot require application-global permissions/);
    });

    it('refuse une permission Application Global inconnue', () => {
        expect(() => createHelpRegistry({
            categories: [platformCategory],
            entries: [{
                ...entry,
                id: 'platform.test.global',
                context: HELP_CONTEXT.PLATFORM,
                categoryId: platformCategory.id,
                audience: {
                    permissions: [],
                    applicationGlobalPermissions: ['catalog:unknown'],
                    ownerOnly: false,
                },
            }],
            applicationGlobalPermissions: ['catalog:read'],
        })).toThrow(/unknown application-global permission/);
    });

    it('refuse les identifiants de fiche dupliqués', () => {
        expect(() => createHelpRegistry({
            categories: [category],
            entries: [entry, entry],
        })).toThrow(/Duplicate help entry id/);
    });

    it('refuse une permission inconnue', () => {
        expect(() => createHelpRegistry({
            categories: [category],
            entries: [{
                ...entry,
                audience: {
                    permissions: ['workspace:unknown'],
                    ownerOnly: false,
                },
            }],
        })).toThrow(/unknown permission/);
    });

    it('refuse un lien lié inexistant', () => {
        expect(() => createHelpRegistry({
            categories: [category],
            entries: [{
                ...entry,
                relatedEntryIds: ['workspace.test.missing'],
            }],
        })).toThrow(/invalid related entry/);
    });

    it('refuse une déclaration de remédiation qui ne cible pas une fiche Workspace existante', () => {
        expect(() => createHelpRegistry({
            categories: [category],
            entries: [entry],
            workspaceRemediationEntryIds: ['workspace.test.missing'],
        })).toThrow(/Workspace remediation help entry is invalid/);
    });

    it('réserve de la capacité aux catégories dérivées tout en conservant une limite UX', () => {
        const acceptedCategories = Array.from(
            { length: MAX_HELP_CATEGORIES_PER_CONTEXT },
            (_, index) => ({
                ...category,
                id: `workspace_test_${index}`,
                order: index,
            }),
        );

        expect(() => createHelpRegistry({
            categories: acceptedCategories,
            entries: [],
        })).not.toThrow();

        const overflowingCategories = [
            ...acceptedCategories,
            {
                ...category,
                id: 'workspace_test_overflow',
                order: MAX_HELP_CATEGORIES_PER_CONTEXT,
            },
        ];

        expect(() => createHelpRegistry({
            categories: overflowingCategories,
            entries: [],
        })).toThrow(/cannot expose more than/);
    });

    it('compose explicitement les modules métier et leur politique de remédiation', () => {
        const extensions = composeHelpModuleExtensions([
            {
                key: 'catalog',
                categories: [category],
                entries: [entry],
                workspaceRemediationEntryIds: [entry.id],
            },
        ]);

        expect(extensions.categories).toHaveLength(1);
        expect(extensions.entries).toHaveLength(1);
        expect(extensions.workspaceRemediationEntryIds).toEqual([entry.id]);
    });
});