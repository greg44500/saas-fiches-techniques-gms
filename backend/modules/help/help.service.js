import {
    ACTIVE_HELP_REGISTRY,
} from '../../config/applicationHelp.registry.js';
import {
    resolveApplicationGlobalAuthorization,
} from '../applicationGlobalAuthorization/applicationGlobalAuthorization.service.js';
import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';
import {
    PLATFORM_TEAM_MEMBER_STATUS,
} from '../../constants/platformTeam.constants.js';
import { AppError } from '../../utils/appError.js';
import {
    getWorkspaceAccessEntitlement,
} from '../subscriptions/subscription.service.js';
import {
    resolvePlatformAuthorization,
} from '../platformTeam/platformAuthorization.service.js';
import { HELP_CONTEXT } from './help.registry.js';


const hasAll = (grantedValues, requiredValues) => {
    const grantedSet = new Set(grantedValues ?? []);
    return requiredValues.every((value) => grantedSet.has(value));
};

const isWorkspaceOwner = (role) =>
    role?.key === SYSTEM_ROLE_KEY.OWNER
    && role?.isSystem === true;

const toCatalogEntry = (entry) => ({
    id: entry.id,
    categoryId: entry.categoryId,
    title: entry.title,
    summary: entry.summary,
    search: {
        keywords: [...entry.search.keywords],
        questions: [...entry.search.questions],
    },
    order: entry.order,
});

const toPublicEntry = (entry, visibleEntryIds) => ({
    id: entry.id,
    categoryId: entry.categoryId,
    title: entry.title,
    summary: entry.summary,
    search: {
        keywords: [...entry.search.keywords],
        questions: [...entry.search.questions],
    },
    whoCanPerform: entry.whoCanPerform,
    prerequisites: [...entry.prerequisites],
    steps: [...entry.steps],
    outcome: entry.outcome,
    edgeCases: [...entry.edgeCases],
    sensitiveConsequences: [...entry.sensitiveConsequences],
    relatedEntryIds: entry.relatedEntryIds.filter(
        (entryId) => visibleEntryIds.has(entryId),
    ),
    order: entry.order,
});

const buildCatalog = ({ registry, context, entries }) => {
    const categoryIds = new Set(entries.map((entry) => entry.categoryId));

    return {
        context,
        categories: registry.categories
            .filter(
                (category) =>
                    category.context === context
                    && categoryIds.has(category.id),
            )
            .map((category) => ({ ...category })),
        entries: entries.map(toCatalogEntry),
    };
};

const createHelpService = ({
    registry = ACTIVE_HELP_REGISTRY,
    resolveWorkspaceAccess = getWorkspaceAccessEntitlement,
    resolvePlatformAccess = resolvePlatformAuthorization,
    resolveApplicationGlobalAccess =
        resolveApplicationGlobalAuthorization,
} = {}) => {
    const getWorkspaceVisibleEntries = async ({
        workspace,
        permissions,
        role,
    }) => {
        if (!workspace?._id) {
            throw new TypeError(
                'workspace is required to resolve Workspace help',
            );
        }

        const workspaceAccess = await resolveWorkspaceAccess({
            workspaceId: workspace._id,
        });
        const effectiveFeatures =
            workspaceAccess?.effectiveCapabilities?.features ?? [];

        return registry.entries.filter((entry) => {
            if (entry.context !== HELP_CONTEXT.WORKSPACE) {
                return false;
            }

            if (!hasAll(permissions, entry.audience.permissions)) {
                return false;
            }

            if (entry.audience.ownerOnly && !isWorkspaceOwner(role)) {
                return false;
            }

            if (!hasAll(
                effectiveFeatures,
                entry.requirements.features,
            )) {
                return false;
            }

            return entry.requirements.workspaceAccessModes.includes(
                workspaceAccess.accessMode,
            );
        });
    };

    const getPlatformAuthorization = async (user) => {
        if (!user?._id) {
            throw new TypeError(
                'user is required to resolve Platform help',
            );
        }

        const authorization = await resolvePlatformAccess({ user });

        if (
            !authorization
            || authorization.status
                !== PLATFORM_TEAM_MEMBER_STATUS.ACTIVE
            || ['none', 'team_history'].includes(authorization.source)
        ) {
            throw new AppError(
                'Centre d’aide Platform indisponible',
                403,
            );
        }

        return authorization;
    };

    const getPlatformVisibleEntries = async ({ user }) => {
        const authorization = await getPlatformAuthorization(user);
        const requiresApplicationGlobalAuthorization =
            registry.entries.some(
                (entry) =>
                    entry.context === HELP_CONTEXT.PLATFORM
                    && entry.audience.applicationGlobalPermissions.length > 0,
            );
        const applicationGlobalAuthorization =
            requiresApplicationGlobalAuthorization
                ? await resolveApplicationGlobalAccess({ user })
                : { permissions: [] };

        return registry.entries.filter((entry) =>
            entry.context === HELP_CONTEXT.PLATFORM
            && hasAll(
                authorization.permissions,
                entry.audience.permissions,
            )
            && hasAll(
                applicationGlobalAuthorization.permissions,
                entry.audience.applicationGlobalPermissions,
            ));
    };

    const getWorkspaceCatalog = async (context) => {
        const entries = await getWorkspaceVisibleEntries(context);
        return buildCatalog({
            registry,
            context: HELP_CONTEXT.WORKSPACE,
            entries,
        });
    };

    const getWorkspaceEntry = async ({ entryId, ...context }) => {
        const entries = await getWorkspaceVisibleEntries(context);
        const entry = entries.find(({ id }) => id === entryId);

        if (!entry) {
            throw new AppError('Aide introuvable', 404);
        }

        return toPublicEntry(
            entry,
            new Set(entries.map(({ id }) => id)),
        );
    };

    const getPlatformCatalog = async ({ user }) => {
        const entries = await getPlatformVisibleEntries({ user });
        return buildCatalog({
            registry,
            context: HELP_CONTEXT.PLATFORM,
            entries,
        });
    };

    const getPlatformEntry = async ({ user, entryId }) => {
        const entries = await getPlatformVisibleEntries({ user });
        const entry = entries.find(({ id }) => id === entryId);

        if (!entry) {
            throw new AppError('Aide introuvable', 404);
        }

        return toPublicEntry(
            entry,
            new Set(entries.map(({ id }) => id)),
        );
    };

    return Object.freeze({
        getPlatformCatalog,
        getPlatformEntry,
        getWorkspaceCatalog,
        getWorkspaceEntry,
    });
};

const helpService = createHelpService();


export {
    createHelpService,
    helpService,
};
