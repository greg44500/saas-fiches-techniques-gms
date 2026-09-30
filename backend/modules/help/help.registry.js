import { z } from 'zod';

import {
    ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
} from '../../config/applicationGlobalPermission.registry.js';
import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
} from '../../config/applicationCapability.registry.js';
import {
    ACTIVE_PLATFORM_PERMISSION_REGISTRY,
} from '../../config/applicationPlatformPermission.registry.js';
import {
    ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY,
} from '../../config/applicationRolePermission.registry.js';
import {
    WORKSPACE_ACCESS_MODE,
} from '../../constants/workspaceAccess.constants.js';


const HELP_CONTEXT = Object.freeze({
    WORKSPACE: 'workspace',
    PLATFORM: 'platform',
});

/*
 * Une fiche est toujours rattachée explicitement à son contexte puis à une ou
 * plusieurs composantes sémantiques. Une action de premier niveau comme
 * `workspace.archive` reste donc valide sans inventer un domaine artificiel.
 */
const HELP_ENTRY_ID_PATTERN =
    /^(workspace|platform)\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/;
const HELP_CATEGORY_ID_PATTERN =
    /^(workspace|platform)_[a-z][a-z0-9_]*$/;
const HELP_MODULE_KEY_PATTERN = /^[a-z][a-z0-9_-]*$/;
const MAX_HELP_CATEGORIES_PER_CONTEXT = 10;

const nonEmptyText = (maxLength) => z
    .string()
    .trim()
    .min(1)
    .max(maxLength);

const helpCategorySchema = z.strictObject({
    id: z.string().regex(HELP_CATEGORY_ID_PATTERN),
    context: z.enum(Object.values(HELP_CONTEXT)),
    label: nonEmptyText(80),
    description: nonEmptyText(180),
    order: z.number().int().nonnegative(),
});

const helpEntrySchema = z.strictObject({
    id: z.string().regex(HELP_ENTRY_ID_PATTERN),
    context: z.enum(Object.values(HELP_CONTEXT)),
    categoryId: z.string().regex(HELP_CATEGORY_ID_PATTERN),
    title: nonEmptyText(140),
    summary: nonEmptyText(280),
    search: z.strictObject({
        keywords: z.array(nonEmptyText(80)).max(20).default([]),
        questions: z.array(nonEmptyText(180)).max(12).default([]),
    }),
    audience: z.strictObject({
        permissions: z.array(nonEmptyText(120)).max(12).default([]),
        applicationGlobalPermissions: z
            .array(nonEmptyText(120))
            .max(12)
            .default([]),
        ownerOnly: z.boolean().default(false),
    }),
    requirements: z.strictObject({
        features: z.array(nonEmptyText(80)).max(8).default([]),
    }),
    whoCanPerform: nonEmptyText(220),
    prerequisites: z.array(nonEmptyText(300)).max(12).default([]),
    steps: z.array(nonEmptyText(500)).min(1).max(16),
    outcome: nonEmptyText(500),
    edgeCases: z.array(nonEmptyText(500)).max(12).default([]),
    sensitiveConsequences: z.array(nonEmptyText(500)).max(8).default([]),
    relatedEntryIds: z.array(z.string().regex(HELP_ENTRY_ID_PATTERN))
        .max(12)
        .default([]),
    order: z.number().int().nonnegative(),
});

const helpModuleSchema = z.strictObject({
    key: z.string().regex(HELP_MODULE_KEY_PATTERN),
    categories: z.array(helpCategorySchema).default([]),
    entries: z.array(helpEntrySchema).default([]),
    workspaceRemediationEntryIds: z
        .array(z.string().regex(HELP_ENTRY_ID_PATTERN))
        .default([]),
});

const freezeCategory = (category) => Object.freeze({ ...category });

const freezeEntry = ({
    entry,
    workspaceRemediationEntryIds,
}) => {
    const workspaceAccessModes = entry.context === HELP_CONTEXT.WORKSPACE
        ? workspaceRemediationEntryIds.has(entry.id)
            ? [
                WORKSPACE_ACCESS_MODE.NORMAL,
                WORKSPACE_ACCESS_MODE.REMEDIATION,
            ]
            : [WORKSPACE_ACCESS_MODE.NORMAL]
        : [];

    return Object.freeze({
        ...entry,
        search: Object.freeze({
            keywords: Object.freeze([...entry.search.keywords]),
            questions: Object.freeze([...entry.search.questions]),
        }),
        audience: Object.freeze({
            permissions: Object.freeze([...entry.audience.permissions]),
            applicationGlobalPermissions: Object.freeze([
                ...entry.audience.applicationGlobalPermissions,
            ]),
            ownerOnly: entry.audience.ownerOnly,
        }),
        requirements: Object.freeze({
            features: Object.freeze([...entry.requirements.features]),
            workspaceAccessModes: Object.freeze(workspaceAccessModes),
        }),
        prerequisites: Object.freeze([...entry.prerequisites]),
        steps: Object.freeze([...entry.steps]),
        edgeCases: Object.freeze([...entry.edgeCases]),
        sensitiveConsequences: Object.freeze([
            ...entry.sensitiveConsequences,
        ]),
        relatedEntryIds: Object.freeze([...entry.relatedEntryIds]),
    });
};

/**
 * Compose explicitement les extensions d'aide embarquées dans un SaaS dérivé.
 * Aucun scan automatique de fichiers n'est utilisé : le produit dérivé doit
 * déclarer les modules qu'il souhaite réellement distribuer.
 */
const composeHelpModuleExtensions = (modules = []) => {
    if (!Array.isArray(modules)) {
        throw new TypeError('Help modules must be an array');
    }

    const parsedModules = modules.map((moduleDefinition) =>
        helpModuleSchema.parse(moduleDefinition));
    const moduleKeys = new Set();

    for (const moduleDefinition of parsedModules) {
        if (moduleKeys.has(moduleDefinition.key)) {
            throw new TypeError(
                `Duplicate help module key: ${moduleDefinition.key}`,
            );
        }
        moduleKeys.add(moduleDefinition.key);
    }

    return Object.freeze({
        categories: Object.freeze(
            parsedModules.flatMap(({ categories }) => categories),
        ),
        entries: Object.freeze(
            parsedModules.flatMap(({ entries }) => entries),
        ),
        workspaceRemediationEntryIds: Object.freeze(
            parsedModules.flatMap(
                ({ workspaceRemediationEntryIds }) =>
                    workspaceRemediationEntryIds,
            ),
        ),
    });
};

/**
 * Construit le registre autoritatif du centre d'aide.
 *
 * Les validations croisées sont faites au démarrage afin qu'une permission,
 * une feature, une catégorie ou un lien "Voir aussi" obsolète casse le build
 * plutôt que de créer une documentation trompeuse en production.
 *
 * Les fiches Workspace sont `normal` par défaut. Une fiche qui doit rester
 * visible en remédiation doit être déclarée explicitement, ce qui reproduit le
 * principe de sécurité du middleware `enforceWorkspaceAccessMode`.
 */
const createHelpRegistry = ({
    categories = [],
    entries = [],
    workspaceRemediationEntryIds = [],
    workspacePermissions =
        ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY.permissions,
    platformPermissions =
        ACTIVE_PLATFORM_PERMISSION_REGISTRY.permissionKeys,
    applicationGlobalPermissions =
        ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY.permissionKeys,
    features = ACTIVE_PLAN_CAPABILITY_REGISTRY.features,
} = {}) => {
    const parsedCategories = z.array(helpCategorySchema).parse(categories);
    const parsedEntries = z.array(helpEntrySchema).parse(entries);
    const parsedWorkspaceRemediationEntryIds = z
        .array(z.string().regex(HELP_ENTRY_ID_PATTERN))
        .parse(workspaceRemediationEntryIds);

    const categoryIds = new Set();
    for (const category of parsedCategories) {
        if (categoryIds.has(category.id)) {
            throw new TypeError(`Duplicate help category id: ${category.id}`);
        }
        categoryIds.add(category.id);
    }

    for (const context of Object.values(HELP_CONTEXT)) {
        const contextCategoryCount = parsedCategories.filter(
            (category) => category.context === context,
        ).length;

        if (
            contextCategoryCount
            > MAX_HELP_CATEGORIES_PER_CONTEXT
        ) {
            throw new TypeError(
                `Help context "${context}" cannot expose more than ${MAX_HELP_CATEGORIES_PER_CONTEXT} categories`,
            );
        }
    }

    const workspacePermissionSet = new Set(workspacePermissions);
    const platformPermissionSet = new Set(platformPermissions);
    const applicationGlobalPermissionSet = new Set(
        applicationGlobalPermissions,
    );
    const featureSet = new Set(features);
    const entriesById = new Map();
    const categoriesById = new Map(
        parsedCategories.map((category) => [category.id, category]),
    );

    for (const entry of parsedEntries) {
        if (entriesById.has(entry.id)) {
            throw new TypeError(`Duplicate help entry id: ${entry.id}`);
        }

        const category = categoriesById.get(entry.categoryId);
        if (!category || category.context !== entry.context) {
            throw new TypeError(
                `Help entry "${entry.id}" references an invalid category`,
            );
        }

        const allowedPermissions = entry.context === HELP_CONTEXT.WORKSPACE
            ? workspacePermissionSet
            : platformPermissionSet;
        const unknownPermission = entry.audience.permissions.find(
            (permission) => !allowedPermissions.has(permission),
        );

        if (unknownPermission) {
            throw new TypeError(
                `Help entry "${entry.id}" references an unknown permission: ${unknownPermission}`,
            );
        }

        const unknownApplicationGlobalPermission =
            entry.audience.applicationGlobalPermissions.find(
                (permission) =>
                    !applicationGlobalPermissionSet.has(permission),
            );

        if (unknownApplicationGlobalPermission) {
            throw new TypeError(
                `Help entry "${entry.id}" references an unknown application-global permission: ${unknownApplicationGlobalPermission}`,
            );
        }

        if (
            entry.context === HELP_CONTEXT.WORKSPACE
            && entry.audience.applicationGlobalPermissions.length > 0
        ) {
            throw new TypeError(
                `Workspace help entry "${entry.id}" cannot require application-global permissions`,
            );
        }

        if (
            entry.context === HELP_CONTEXT.PLATFORM
            && entry.audience.ownerOnly
        ) {
            throw new TypeError(
                `Platform help entry "${entry.id}" cannot use ownerOnly`,
            );
        }

        if (
            entry.context === HELP_CONTEXT.PLATFORM
            && entry.requirements.features.length > 0
        ) {
            throw new TypeError(
                `Platform help entry "${entry.id}" cannot require Workspace features`,
            );
        }

        const unknownFeature = entry.requirements.features.find(
            (feature) => !featureSet.has(feature),
        );

        if (unknownFeature) {
            throw new TypeError(
                `Help entry "${entry.id}" references an unknown feature: ${unknownFeature}`,
            );
        }

        entriesById.set(entry.id, entry);
    }

    const remediationEntryIds = new Set();
    for (const entryId of parsedWorkspaceRemediationEntryIds) {
        if (remediationEntryIds.has(entryId)) {
            throw new TypeError(
                `Duplicate Workspace remediation help entry id: ${entryId}`,
            );
        }

        const entry = entriesById.get(entryId);
        if (!entry || entry.context !== HELP_CONTEXT.WORKSPACE) {
            throw new TypeError(
                `Workspace remediation help entry is invalid: ${entryId}`,
            );
        }

        remediationEntryIds.add(entryId);
    }

    for (const entry of parsedEntries) {
        for (const relatedEntryId of entry.relatedEntryIds) {
            const relatedEntry = entriesById.get(relatedEntryId);
            if (!relatedEntry || relatedEntry.context !== entry.context) {
                throw new TypeError(
                    `Help entry "${entry.id}" references an invalid related entry: ${relatedEntryId}`,
                );
            }
        }
    }

    const frozenCategories = Object.freeze(
        parsedCategories
            .map(freezeCategory)
            .sort((left, right) => left.order - right.order),
    );
    const frozenEntries = Object.freeze(
        parsedEntries
            .map((entry) => freezeEntry({
                entry,
                workspaceRemediationEntryIds: remediationEntryIds,
            }))
            .sort((left, right) =>
                left.order - right.order
                || left.title.localeCompare(right.title, 'fr')),
    );

    return Object.freeze({
        categories: frozenCategories,
        entries: frozenEntries,
        categoriesById: Object.freeze(
            Object.fromEntries(
                frozenCategories.map((category) => [category.id, category]),
            ),
        ),
        entriesById: Object.freeze(
            Object.fromEntries(
                frozenEntries.map((entry) => [entry.id, entry]),
            ),
        ),
    });
};


export {
    HELP_CONTEXT,
    MAX_HELP_CATEGORIES_PER_CONTEXT,
    composeHelpModuleExtensions,
    createHelpRegistry,
    helpCategorySchema,
    helpEntrySchema,
};
