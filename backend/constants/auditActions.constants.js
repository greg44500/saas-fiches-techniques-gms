const freezeRegistry = (entries) => Object.freeze(
    Object.fromEntries(
        Object.entries(entries).map(([key, definition]) => [
            key,
            Object.freeze({ ...definition }),
        ]),
    ),
);

const valuesFromRegistry = (registry) => Object.freeze(
    Object.fromEntries(
        Object.entries(registry).map(([key, definition]) => [
            key,
            definition.value,
        ]),
    ),
);


/**
 * Registre canonique du vocabulaire Audit.
 *
 * Les identifiants techniques sont consommés par les modèles, validations et
 * services. Les libellés constituent le contrat de présentation exposé aux
 * interfaces clientes. Toute nouvelle valeur Audit doit être déclarée ici :
 * les constantes runtime et les métadonnées HTTP en sont dérivées.
 */
const AUDIT_STATUS_REGISTRY = freezeRegistry({
    SUCCESS: {
        value: 'success',
        label: 'Réussie',
    },
    FAILED: {
        value: 'failed',
        label: 'Échouée',
    },
});

const AUDIT_ENTITY_TYPE_REGISTRY = freezeRegistry({
    APPLICATION_GLOBAL_MEMBER: {
        value: 'ApplicationGlobalMember',
        label: 'Membre global de l’application',
    },
    APPLICATION_GLOBAL_ROLE: {
        value: 'ApplicationGlobalRole',
        label: 'Rôle global de l’application',
    },
    AUTH_SESSION: {
        value: 'AuthSession',
        label: 'Session',
    },
    COMMERCIAL_INVITATION: {
        value: 'CommercialInvitation',
        label: 'Invitation commerciale',
    },
    ENTITLEMENT_OVERRIDE: {
        value: 'EntitlementOverride',
        label: 'Dérogation',
    },
    FILE: {
        value: 'File',
        label: 'Fichier',
    },
    ORGANIZATION: {
        value: 'Organization',
        label: 'Organisation',
    },
    PLAN: {
        value: 'Plan',
        label: 'Plan',
    },
    PLATFORM_INVITATION: {
        value: 'PlatformInvitation',
        label: 'Invitation de la Plateforme',
    },
    PLATFORM_ROLE: {
        value: 'PlatformRole',
        label: 'Rôle de la Plateforme',
    },
    PLATFORM_TEAM_MEMBER: {
        value: 'PlatformTeamMember',
        label: 'Membre de l’équipe de la Plateforme',
    },
    ROLE: {
        value: 'Role',
        label: 'Rôle d’espace de travail',
    },
    SUBSCRIPTION: {
        value: 'Subscription',
        label: 'Abonnement',
    },
    USER: {
        value: 'User',
        label: 'Utilisateur',
    },
    WORKSPACE: {
        value: 'Workspace',
        label: 'Espace de travail',
    },
    WORKSPACE_INVITATION: {
        value: 'WorkspaceInvitation',
        label: 'Invitation d’espace de travail',
    },
    WORKSPACE_MEMBER: {
        value: 'WorkspaceMember',
        label: 'Membre d’espace de travail',
    },
});

const AUDIT_ACTION_REGISTRY = freezeRegistry({
    APPLICATION_GLOBAL_ROLE_CREATED: {
        value: 'APPLICATION_GLOBAL_ROLE_CREATED',
        label: 'Rôle global applicatif créé',
    },
    APPLICATION_GLOBAL_ROLE_UPDATED: {
        value: 'APPLICATION_GLOBAL_ROLE_UPDATED',
        label: 'Rôle global applicatif modifié',
    },
    APPLICATION_GLOBAL_ROLE_ARCHIVED: {
        value: 'APPLICATION_GLOBAL_ROLE_ARCHIVED',
        label: 'Rôle global applicatif archivé',
    },
    APPLICATION_GLOBAL_MEMBER_ASSIGNED: {
        value: 'APPLICATION_GLOBAL_MEMBER_ASSIGNED',
        label: 'Rôle global applicatif attribué',
    },
    APPLICATION_GLOBAL_MEMBER_SUSPENDED: {
        value: 'APPLICATION_GLOBAL_MEMBER_SUSPENDED',
        label: 'Membre global applicatif suspendu',
    },
    APPLICATION_GLOBAL_MEMBER_REACTIVATED: {
        value: 'APPLICATION_GLOBAL_MEMBER_REACTIVATED',
        label: 'Membre global applicatif réactivé',
    },
    APPLICATION_GLOBAL_MEMBER_REVOKED: {
        value: 'APPLICATION_GLOBAL_MEMBER_REVOKED',
        label: 'Membre global applicatif révoqué',
    },
    LOGIN_SUCCESS: {
        value: 'LOGIN_SUCCESS',
        label: 'Connexion réussie',
    },
    LOGIN_FAILED: {
        value: 'LOGIN_FAILED',
        label: 'Échec de connexion',
    },
    LOGOUT: {
        value: 'LOGOUT',
        label: 'Déconnexion',
    },
    LOGOUT_ALL: {
        value: 'LOGOUT_ALL',
        label: 'Déconnexion de toutes les sessions',
    },
    PASSWORD_CHANGED: {
        value: 'PASSWORD_CHANGED',
        label: 'Mot de passe modifié',
    },
    PASSWORD_RESET_COMPLETED: {
        value: 'PASSWORD_RESET_COMPLETED',
        label: 'Mot de passe réinitialisé',
    },

    FORGOT_PASSWORD_REQUESTED: {
        value: 'FORGOT_PASSWORD_REQUESTED',
        label: 'Demande de réinitialisation reçue',
    },

    USER_CREATED: {
        value: 'USER_CREATED',
        label: 'Utilisateur créé',
    },
    USER_PROFILE_UPDATED: {
        value: 'USER_PROFILE_UPDATED',
        label: 'Profil utilisateur modifié',
    },
    USER_DISABLED: {
        value: 'USER_DISABLED',
        label: 'Utilisateur désactivé',
    },
    USER_ENABLED: {
        value: 'USER_ENABLED',
        label: 'Utilisateur réactivé',
    },
    USER_DELETION_REQUESTED: {
        value: 'USER_DELETION_REQUESTED',
        label: 'Suppression de l’utilisateur demandée',
    },
    USER_CLOSED: {
        value: 'USER_CLOSED',
        label: 'Utilisateur clôturé',
    },
    USER_PLATFORM_ROLE_UPDATED: {
        value: 'USER_PLATFORM_ROLE_UPDATED',
        label: 'Ancien rôle Plateforme de l’utilisateur modifié',
    },

    SESSION_REVOKED: {
        value: 'SESSION_REVOKED',
        label: 'Session révoquée',
    },
    SESSION_REUSE_DETECTED: {
        value: 'SESSION_REUSE_DETECTED',
        label: 'Réutilisation de session détectée',
    },

    WORKSPACE_CREATED: {
        value: 'WORKSPACE_CREATED',
        label: 'Espace de travail créé',
    },
    WORKSPACE_UPDATED: {
        value: 'WORKSPACE_UPDATED',
        label: 'Espace de travail modifié',
    },
    WORKSPACE_SUSPENDED: {
        value: 'WORKSPACE_SUSPENDED',
        label: 'Espace de travail suspendu',
    },
    WORKSPACE_REACTIVATED: {
        value: 'WORKSPACE_REACTIVATED',
        label: 'Espace de travail réactivé',
    },
    WORKSPACE_ARCHIVED: {
        value: 'WORKSPACE_ARCHIVED',
        label: 'Espace de travail archivé',
    },
    WORKSPACE_CLOSED: {
        value: 'WORKSPACE_CLOSED',
        label: 'Espace de travail clôturé',
    },
    WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZED: {
        value: 'WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZED',
        label: 'Transfert de propriété temporairement autorisé',
    },
    WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_REVOKED: {
        value: 'WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_REVOKED',
        label: 'Autorisation de transfert de propriété révoquée',
    },
    WORKSPACE_OWNERSHIP_TRANSFERRED: {
        value: 'WORKSPACE_OWNERSHIP_TRANSFERRED',
        label: 'Propriété de l’espace de travail transférée',
    },

    MEMBER_INVITED: {
        value: 'MEMBER_INVITED',
        label: 'Membre d’espace invité',
    },
    MEMBER_INVITATION_ACCEPTED: {
        value: 'MEMBER_INVITATION_ACCEPTED',
        label: 'Invitation d’espace acceptée',
    },
    MEMBER_INVITATION_REVOKED: {
        value: 'MEMBER_INVITATION_REVOKED',
        label: 'Invitation d’espace révoquée',
    },
    MEMBER_INVITATION_RESENT: {
        value: 'MEMBER_INVITATION_RESENT',
        label: 'Invitation d’espace renvoyée',
    },
    MEMBER_ROLE_UPDATED: {
        value: 'MEMBER_ROLE_UPDATED',
        label: 'Rôle d’un membre d’espace modifié',
    },
    MEMBER_SUSPENDED: {
        value: 'MEMBER_SUSPENDED',
        label: 'Membre d’espace suspendu',
    },
    MEMBER_REMOVED: {
        value: 'MEMBER_REMOVED',
        label: 'Membre d’espace retiré',
    },

    PLATFORM_INVITATION_CREATED: {
        value: 'PLATFORM_INVITATION_CREATED',
        label: 'Invitation de la Plateforme créée',
    },
    PLATFORM_INVITATION_ACCEPTED: {
        value: 'PLATFORM_INVITATION_ACCEPTED',
        label: 'Invitation de la Plateforme acceptée',
    },
    PLATFORM_INVITATION_REVOKED: {
        value: 'PLATFORM_INVITATION_REVOKED',
        label: 'Invitation de la Plateforme révoquée',
    },
    PLATFORM_INVITATION_RESENT: {
        value: 'PLATFORM_INVITATION_RESENT',
        label: 'Invitation de la Plateforme renvoyée',
    },
    COMMERCIAL_INVITATION_CREATED: {
        value: 'COMMERCIAL_INVITATION_CREATED',
        label: 'Invitation commerciale créée',
    },
    COMMERCIAL_INVITATION_ACCEPTED: {
        value: 'COMMERCIAL_INVITATION_ACCEPTED',
        label: 'Invitation commerciale acceptée',
    },
    COMMERCIAL_INVITATION_DECLINED: {
        value: 'COMMERCIAL_INVITATION_DECLINED',
        label: 'Invitation commerciale refusée',
    },
    COMMERCIAL_INVITATION_REVOKED: {
        value: 'COMMERCIAL_INVITATION_REVOKED',
        label: 'Invitation commerciale révoquée',
    },
    COMMERCIAL_INVITATION_RESENT: {
        value: 'COMMERCIAL_INVITATION_RESENT',
        label: 'Invitation commerciale renvoyée',
    },
    PLATFORM_MEMBER_ROLE_UPDATED: {
        value: 'PLATFORM_MEMBER_ROLE_UPDATED',
        label: 'Rôle d’un membre de la Plateforme modifié',
    },
    PLATFORM_MEMBER_SUSPENDED: {
        value: 'PLATFORM_MEMBER_SUSPENDED',
        label: 'Membre de la Plateforme suspendu',
    },
    PLATFORM_MEMBER_REACTIVATED: {
        value: 'PLATFORM_MEMBER_REACTIVATED',
        label: 'Membre de la Plateforme réactivé',
    },
    PLATFORM_MEMBER_REVOKED: {
        value: 'PLATFORM_MEMBER_REVOKED',
        label: 'Membre de la Plateforme révoqué',
    },
    PLATFORM_ROLE_CREATED: {
        value: 'PLATFORM_ROLE_CREATED',
        label: 'Rôle de la Plateforme créé',
    },
    PLATFORM_ROLE_UPDATED: {
        value: 'PLATFORM_ROLE_UPDATED',
        label: 'Rôle de la Plateforme modifié',
    },
    PLATFORM_ROLE_ARCHIVED: {
        value: 'PLATFORM_ROLE_ARCHIVED',
        label: 'Rôle de la Plateforme archivé',
    },

    ROLE_CREATED: {
        value: 'ROLE_CREATED',
        label: 'Rôle d’espace créé',
    },
    ROLE_UPDATED: {
        value: 'ROLE_UPDATED',
        label: 'Rôle d’espace modifié',
    },
    ROLE_DELETED: {
        value: 'ROLE_DELETED',
        label: 'Rôle d’espace supprimé',
    },

    PLAN_CREATED: {
        value: 'PLAN_CREATED',
        label: 'Plan créé',
    },
    PLAN_UPDATED: {
        value: 'PLAN_UPDATED',
        label: 'Plan modifié',
    },
    PLAN_ARCHIVED: {
        value: 'PLAN_ARCHIVED',
        label: 'Plan archivé',
    },

    SUBSCRIPTION_CREATED: {
        value: 'SUBSCRIPTION_CREATED',
        label: 'Abonnement créé',
    },
    SUBSCRIPTION_UPDATED: {
        value: 'SUBSCRIPTION_UPDATED',
        label: 'Abonnement modifié',
    },
    SUBSCRIPTION_CANCELLATION_SCHEDULED: {
        value: 'SUBSCRIPTION_CANCELLATION_SCHEDULED',
        label: 'Résiliation programmée',
    },
    SUBSCRIPTION_CANCELED: {
        value: 'SUBSCRIPTION_CANCELED',
        label: 'Abonnement résilié',
    },
    SUBSCRIPTION_EXPIRED: {
        value: 'SUBSCRIPTION_EXPIRED',
        label: 'Abonnement expiré',
    },
    SUBSCRIPTION_ACTIVATED_FROM_TRIAL: {
        value: 'SUBSCRIPTION_ACTIVATED_FROM_TRIAL',
        label: 'Abonnement activé après essai',
    },
    SUBSCRIPTION_PROMOTION_APPLIED: {
        value: 'SUBSCRIPTION_PROMOTION_APPLIED',
        label: 'Promotion appliquée',
    },
    SUBSCRIPTION_RESUMED: {
        value: 'SUBSCRIPTION_RESUMED',
        label: 'Abonnement repris',
    },
    SUBSCRIPTION_DOWNGRADE_SCHEDULED: {
        value: 'SUBSCRIPTION_DOWNGRADE_SCHEDULED',
        label: 'Passage vers une offre inférieure programmé',
    },
    SUBSCRIPTION_DOWNGRADE_REVOKED: {
        value: 'SUBSCRIPTION_DOWNGRADE_REVOKED',
        label: 'Passage vers une offre inférieure annulé',
    },
    SUBSCRIPTION_DOWNGRADE_APPLIED: {
        value: 'SUBSCRIPTION_DOWNGRADE_APPLIED',
        label: 'Passage vers une offre inférieure appliqué',
    },

    ENTITLEMENT_OVERRIDE_CREATED: {
        value: 'ENTITLEMENT_OVERRIDE_CREATED',
        label: 'Dérogation créée',
    },
    ENTITLEMENT_OVERRIDE_UPDATED: {
        value: 'ENTITLEMENT_OVERRIDE_UPDATED',
        label: 'Dérogation modifiée',
    },
    ENTITLEMENT_OVERRIDE_REVOKED: {
        value: 'ENTITLEMENT_OVERRIDE_REVOKED',
        label: 'Dérogation révoquée',
    },

    FILE_UPLOADED: {
        value: 'FILE_UPLOADED',
        label: 'Fichier ajouté',
    },
    FILE_UPLOAD_REJECTED: {
        value: 'FILE_UPLOAD_REJECTED',
        label: 'Ajout de fichier refusé',
    },
    FILE_DELETED: {
        value: 'FILE_DELETED',
        label: 'Fichier supprimé',
    },
    FILE_RESTORED: {
        value: 'FILE_RESTORED',
        label: 'Fichier restauré',
    },
    FILE_PERMANENTLY_DELETED: {
        value: 'FILE_PERMANENTLY_DELETED',
        label: 'Fichier supprimé définitivement',
    },
    FILE_PURGED: {
        value: 'FILE_PURGED',
        label: 'Fichier supprimé définitivement automatiquement',
    },

    ORGANIZATION_CREATED: {
        value: 'ORGANIZATION_CREATED',
        label: 'Organisation créée',
    },
    ORGANIZATION_UPDATED: {
        value: 'ORGANIZATION_UPDATED',
        label: 'Organisation modifiée',
    },
    ORGANIZATION_SUSPENDED: {
        value: 'ORGANIZATION_SUSPENDED',
        label: 'Organisation suspendue',
    },
    ORGANIZATION_REACTIVATED: {
        value: 'ORGANIZATION_REACTIVATED',
        label: 'Organisation réactivée',
    },
});


const AUDIT_STATUS = valuesFromRegistry(AUDIT_STATUS_REGISTRY);
const AUDIT_ENTITY_TYPE = valuesFromRegistry(AUDIT_ENTITY_TYPE_REGISTRY);
const AUDIT_ACTION = valuesFromRegistry(AUDIT_ACTION_REGISTRY);


export {
    AUDIT_ACTION,
    AUDIT_ACTION_REGISTRY,
    AUDIT_ENTITY_TYPE,
    AUDIT_ENTITY_TYPE_REGISTRY,
    AUDIT_STATUS,
    AUDIT_STATUS_REGISTRY,
};