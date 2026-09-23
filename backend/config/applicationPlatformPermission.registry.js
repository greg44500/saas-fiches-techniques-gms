import {
    PLATFORM_PERMISSION,
    PLATFORM_PERMISSION_SENSITIVITY,
} from '../constants/platformPermissions.constants.js';

const PLATFORM_PERMISSION_KEY_PATTERN =
    /^platform:[a-z0-9_]+(?::[a-z0-9_]+)+$/;

const PLATFORM_PERMISSION_SENSITIVITY_SET = new Set(
    Object.values(PLATFORM_PERMISSION_SENSITIVITY),
);

const freezeDefinition = (definition) => Object.freeze({
    ...definition,
});

const CORE_PLATFORM_PERMISSION_DEFINITIONS = Object.freeze([
    freezeDefinition({
        key: PLATFORM_PERMISSION.OVERVIEW_READ,
        label: 'Consulter la vue d’ensemble',
        category: 'overview',
        categoryLabel: 'Vue d’ensemble',
        description: 'Consulter le cockpit administratif de la Plateforme.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.DELEGABLE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.CAPABILITIES_READ,
        label: 'Consulter les fonctionnalités',
        category: 'capabilities',
        categoryLabel: 'Fonctionnalités',
        description: 'Consulter le catalogue technique des fonctionnalités et métriques.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.DELEGABLE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.USERS_READ,
        label: 'Consulter les utilisateurs',
        category: 'users',
        categoryLabel: 'Utilisateurs',
        description: 'Consulter les utilisateurs et leurs informations administratives.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.DELEGABLE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.USERS_DISABLE,
        label: 'Désactiver un utilisateur',
        category: 'users',
        categoryLabel: 'Utilisateurs',
        description: 'Désactiver temporairement un compte utilisateur.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.USERS_ENABLE,
        label: 'Réactiver un utilisateur',
        category: 'users',
        categoryLabel: 'Utilisateurs',
        description: 'Réactiver un compte utilisateur désactivé.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.USERS_REVOKE_SESSIONS,
        label: 'Révoquer les sessions utilisateur',
        category: 'users',
        categoryLabel: 'Utilisateurs',
        description: 'Révoquer les sessions actives d’un utilisateur.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.USERS_CLOSE,
        label: 'Fermer définitivement un utilisateur',
        category: 'users',
        categoryLabel: 'Utilisateurs',
        description: 'Exécuter la fermeture terminale d’un compte utilisateur.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.RESERVED,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.WORKSPACES_READ,
        label: 'Consulter les workspaces',
        category: 'workspaces',
        categoryLabel: 'Workspaces',
        description: 'Consulter les workspaces administrés par la Plateforme.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.DELEGABLE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.WORKSPACES_SUSPEND,
        label: 'Suspendre un workspace',
        category: 'workspaces',
        categoryLabel: 'Workspaces',
        description: 'Suspendre temporairement un workspace.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.WORKSPACES_REACTIVATE,
        label: 'Réactiver un workspace',
        category: 'workspaces',
        categoryLabel: 'Workspaces',
        description: 'Réactiver un workspace suspendu.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.WORKSPACES_CLOSE,
        label: 'Fermer définitivement un workspace',
        category: 'workspaces',
        categoryLabel: 'Workspaces',
        description: 'Exécuter la fermeture terminale d’un workspace.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.RESERVED,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.WORKSPACES_OWNERSHIP_TRANSFER_AUTHORIZE,
        label: 'Autoriser temporairement un transfert de propriété',
        category: 'workspaces',
        categoryLabel: 'Workspaces',
        description: 'Ouvrir pour un workspace précis une fenêtre temporaire et single-use permettant à son propriétaire courant d’exécuter le transfert.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.RESERVED,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.PLANS_READ,
        label: 'Consulter les plans',
        category: 'plans',
        categoryLabel: 'Plans',
        description: 'Consulter les plans commerciaux.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.DELEGABLE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.PLANS_CREATE,
        label: 'Créer un plan',
        category: 'plans',
        categoryLabel: 'Plans',
        description: 'Créer un nouveau plan commercial.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.PLANS_UPDATE,
        label: 'Modifier un plan',
        category: 'plans',
        categoryLabel: 'Plans',
        description: 'Modifier un plan commercial existant.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.PLANS_ARCHIVE,
        label: 'Archiver un plan',
        category: 'plans',
        categoryLabel: 'Plans',
        description: 'Archiver un plan commercial.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.SUBSCRIPTIONS_READ,
        label: 'Consulter les abonnements',
        category: 'subscriptions',
        categoryLabel: 'Abonnements',
        description: 'Consulter les abonnements administrés par la Plateforme.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.DELEGABLE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.SUBSCRIPTIONS_GRANT_TRIAL,
        label: 'Accorder un essai',
        category: 'subscriptions',
        categoryLabel: 'Abonnements',
        description: 'Accorder un essai selon les règles d’éligibilité du Core.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.SUBSCRIPTIONS_UPDATE,
        label: 'Modifier un abonnement',
        category: 'subscriptions',
        categoryLabel: 'Abonnements',
        description: 'Modifier les propriétés administratives autorisées d’un abonnement.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.SUBSCRIPTIONS_CANCEL,
        label: 'Annuler un abonnement',
        category: 'subscriptions',
        categoryLabel: 'Abonnements',
        description: 'Annuler un abonnement selon son cycle de vie.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.SUBSCRIPTIONS_RESUME,
        label: 'Reprendre un abonnement',
        category: 'subscriptions',
        categoryLabel: 'Abonnements',
        description: 'Retirer une annulation programmée lorsque le cycle le permet.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_READ,
        label: 'Consulter les invitations commerciales',
        category: 'commercial_invitations',
        categoryLabel: 'Invitations commerciales',
        description: 'Consulter les propositions commerciales envoyées aux futurs clients.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.DELEGABLE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_CREATE,
        label: 'Créer une invitation commerciale',
        category: 'commercial_invitations',
        categoryLabel: 'Invitations commerciales',
        description: 'Proposer un plan privé existant à un futur client.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_RESEND,
        label: 'Renvoyer une invitation commerciale',
        category: 'commercial_invitations',
        categoryLabel: 'Invitations commerciales',
        description: 'Faire tourner le secret et renvoyer une invitation commerciale active.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_REVOKE,
        label: 'Révoquer une invitation commerciale',
        category: 'commercial_invitations',
        categoryLabel: 'Invitations commerciales',
        description: 'Révoquer une invitation commerciale encore active.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_READ,
        label: 'Consulter les dérogations',
        category: 'entitlement_overrides',
        categoryLabel: 'Dérogations',
        description: 'Consulter les dérogations de fonctionnalités et limites.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.DELEGABLE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_CREATE,
        label: 'Créer une dérogation',
        category: 'entitlement_overrides',
        categoryLabel: 'Dérogations',
        description: 'Créer une dérogation commerciale ou administrative.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_UPDATE,
        label: 'Modifier une dérogation',
        category: 'entitlement_overrides',
        categoryLabel: 'Dérogations',
        description: 'Modifier une dérogation encore modifiable.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_REVOKE,
        label: 'Révoquer une dérogation',
        category: 'entitlement_overrides',
        categoryLabel: 'Dérogations',
        description: 'Révoquer une dérogation active.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.AUDIT_LOGS_READ,
        label: 'Consulter le journal d’activité global',
        category: 'audit',
        categoryLabel: 'Journal d’activité',
        description: 'Consulter les événements d’audit de la Plateforme.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.RETENTION_READ,
        label: 'Consulter la rétention et les purges',
        category: 'retention',
        categoryLabel: 'Rétention et purge',
        description: 'Consulter les policies, leur état et les exécutions de rétention.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.RETENTION_PREVIEW,
        label: 'Prévisualiser une policy de rétention',
        category: 'retention',
        categoryLabel: 'Rétention et purge',
        description: 'Prévisualiser côté serveur les effets d’une policy sans supprimer de données.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.RETENTION_UPDATE,
        label: 'Modifier une policy de rétention',
        category: 'retention',
        categoryLabel: 'Rétention et purge',
        description: 'Modifier ou activer une policy de rétention strictement validée.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.RESERVED,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.RETENTION_EXECUTE,
        label: 'Exécuter une purge manuelle',
        category: 'retention',
        categoryLabel: 'Rétention et purge',
        description: 'Déclencher manuellement une exécution destructive autorisée par une policy.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.RESERVED,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.TEAM_READ,
        label: 'Consulter l’équipe de la Plateforme',
        category: 'team',
        categoryLabel: 'Équipe de la Plateforme',
        description: 'Consulter les membres, invitations et rôles de la Plateforme.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.DELEGABLE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.TEAM_INVITE,
        label: 'Inviter un membre',
        category: 'team',
        categoryLabel: 'Équipe de la Plateforme',
        description: 'Inviter un nouveau collaborateur dans l’équipe de la Plateforme.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.TEAM_INVITATION_RESEND,
        label: 'Renvoyer une invitation',
        category: 'team',
        categoryLabel: 'Équipe de la Plateforme',
        description: 'Générer un nouveau secret et renvoyer une invitation active.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.TEAM_INVITATION_REVOKE,
        label: 'Révoquer une invitation',
        category: 'team',
        categoryLabel: 'Équipe de la Plateforme',
        description: 'Révoquer une invitation encore active.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.TEAM_MEMBER_ROLE_UPDATE,
        label: 'Modifier le rôle d’un membre',
        category: 'team',
        categoryLabel: 'Équipe de la Plateforme',
        description: 'Modifier le rôle d’un membre lorsque les règles anti-escalade le permettent.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.TEAM_MEMBER_SUSPEND,
        label: 'Suspendre un membre',
        category: 'team',
        categoryLabel: 'Équipe de la Plateforme',
        description: 'Suspendre temporairement l’accès interne d’un membre.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.TEAM_MEMBER_REACTIVATE,
        label: 'Réactiver un membre',
        category: 'team',
        categoryLabel: 'Équipe de la Plateforme',
        description: 'Réactiver l’accès interne d’un membre suspendu.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.TEAM_MEMBER_REVOKE,
        label: 'Retirer un membre',
        category: 'team',
        categoryLabel: 'Équipe de la Plateforme',
        description: 'Retirer un collaborateur de l’équipe sans supprimer son User.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.ROLES_READ,
        label: 'Consulter les rôles',
        category: 'roles',
        categoryLabel: 'Rôles et permissions',
        description: 'Consulter les rôles de la Plateforme et leurs permissions.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.DELEGABLE,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.ROLES_CREATE,
        label: 'Créer un rôle personnalisé',
        category: 'roles',
        categoryLabel: 'Rôles et permissions',
        description: 'Créer un rôle personnalisé réservé au Fondateur et aux Super administrateurs.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.RESERVED,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.ROLES_UPDATE,
        label: 'Modifier un rôle personnalisé',
        category: 'roles',
        categoryLabel: 'Rôles et permissions',
        description: 'Modifier un rôle personnalisé réservé au Fondateur et aux Super administrateurs.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.RESERVED,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.ROLES_ARCHIVE,
        label: 'Archiver un rôle personnalisé',
        category: 'roles',
        categoryLabel: 'Rôles et permissions',
        description: 'Archiver un rôle personnalisé réservé au Fondateur et aux Super administrateurs.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.RESERVED,
    }),
    freezeDefinition({
        key: PLATFORM_PERMISSION.SUPER_ADMINS_MANAGE,
        label: 'Gérer les Super administrateurs',
        category: 'security',
        categoryLabel: 'Sécurité',
        description: 'Promouvoir, rétrograder ou administrer un Super administrateur sous réserve de la protection du Fondateur.',
        sensitivity: PLATFORM_PERMISSION_SENSITIVITY.RESERVED,
    }),
]);

const LEGACY_PLATFORM_PERMISSION_KEYS = Object.freeze([
    PLATFORM_PERMISSION.USERS_UPDATE,
    PLATFORM_PERMISSION.WORKSPACES_UPDATE,
]);

const validatePermissionDefinition = (definition) => {
    if (!definition || typeof definition !== 'object') {
        throw new TypeError(
            'Platform permission definition must be an object',
        );
    }

    const {
        key,
        label,
        category,
        categoryLabel,
        description,
        sensitivity,
    } = definition;

    if (
        typeof key !== 'string'
        || !PLATFORM_PERMISSION_KEY_PATTERN.test(key)
    ) {
        throw new TypeError('Invalid Platform permission key');
    }

    for (const value of [
        label,
        category,
        categoryLabel,
        description,
    ]) {
        if (typeof value !== 'string' || value.trim() === '') {
            throw new TypeError(
                'Platform permission presentation fields are required',
            );
        }
    }

    if (!PLATFORM_PERMISSION_SENSITIVITY_SET.has(sensitivity)) {
        throw new TypeError(
            'Invalid Platform permission sensitivity',
        );
    }

    return freezeDefinition({
        key,
        label: label.trim(),
        category: category.trim(),
        categoryLabel: categoryLabel.trim(),
        description: description.trim(),
        sensitivity,
    });
};

const composeApplicationPlatformPermissions = (
    modules = [],
) => {
    if (!Array.isArray(modules)) {
        throw new TypeError(
            'Platform permission modules must be an array',
        );
    }

    const definitions = [...CORE_PLATFORM_PERMISSION_DEFINITIONS];
    const knownKeys = new Set([
        ...definitions.map(({ key }) => key),
        ...LEGACY_PLATFORM_PERMISSION_KEYS,
    ]);

    for (const moduleDefinition of modules) {
        if (!moduleDefinition || typeof moduleDefinition !== 'object') {
            throw new TypeError(
                'Platform permission module must be an object',
            );
        }

        const permissions = moduleDefinition.permissions ?? [];

        if (!Array.isArray(permissions)) {
            throw new TypeError(
                'Platform permission module permissions must be an array',
            );
        }

        for (const permission of permissions) {
            const normalized = validatePermissionDefinition(permission);

            if (knownKeys.has(normalized.key)) {
                throw new TypeError(
                    `Duplicate Platform permission: ${normalized.key}`,
                );
            }

            knownKeys.add(normalized.key);
            definitions.push(normalized);
        }
    }

    return Object.freeze({
        definitions: Object.freeze(definitions),
        permissionKeys: Object.freeze([...knownKeys]),
    });
};

const APPLICATION_PLATFORM_PERMISSION_MODULES = Object.freeze([]);

const ACTIVE_PLATFORM_PERMISSION_REGISTRY =
    composeApplicationPlatformPermissions(
        APPLICATION_PLATFORM_PERMISSION_MODULES,
    );

const getPlatformPermissionDefinition = (permissionKey) =>
    ACTIVE_PLATFORM_PERMISSION_REGISTRY.definitions.find(
        ({ key }) => key === permissionKey,
    ) ?? null;

export {
    ACTIVE_PLATFORM_PERMISSION_REGISTRY,
    APPLICATION_PLATFORM_PERMISSION_MODULES,
    CORE_PLATFORM_PERMISSION_DEFINITIONS,
    LEGACY_PLATFORM_PERMISSION_KEYS,
    composeApplicationPlatformPermissions,
    getPlatformPermissionDefinition,
};
