import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';


const DOSSIER_PERMISSION = Object.freeze({
    READ: 'dossier:read',
    CREATE: 'dossier:create',
    UPDATE: 'dossier:update',
    LIFECYCLE_UPDATE: 'dossier:lifecycle:update',
    ACCESS_READ: 'dossier:access:read',
    ACCESS_MANAGE: 'dossier:access:manage',
});

const DOSSIER_PERMISSIONS = Object.freeze(
    Object.values(DOSSIER_PERMISSION),
);

/**
 * Descriptor RBAC du module M-001.
 *
 * Les permissions restent propriété du produit. Le Core ne connaît ni Dossier,
 * ni les profils métier GMS. Seul le rôle système owner reçoit ces permissions
 * par défaut ; les autres membres les obtiennent via des rôles Workspace
 * personnalisés.
 */
const DOSSIER_ROLE_PERMISSION_MODULE = Object.freeze({
    permissions: DOSSIER_PERMISSIONS,
    reservedPermissions: Object.freeze([]),
    systemRolePermissions: Object.freeze({
        [SYSTEM_ROLE_KEY.OWNER]: DOSSIER_PERMISSIONS,
    }),
});


export {
    DOSSIER_PERMISSION,
    DOSSIER_PERMISSIONS,
    DOSSIER_ROLE_PERMISSION_MODULE,
};
