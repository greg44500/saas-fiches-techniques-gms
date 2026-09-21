import { CORE_PERMISSION } from '../constants/permissions.constants.js';
import {
    DOSSIER_ROLE_PERMISSION_MODULE,
} from '../modules/dossier/dossierPermission.registry.js';
import {
    composeRolePermissionExtensions,
    configureRolePermissionRegistry,
    createRolePermissionRegistry,
} from '../modules/role/rolePermission.registry.js';


/**
 * Point de composition unique du RBAC Workspace de l'application.
 *
 * Le Core reste propriétaire de CORE_PERMISSION. Une application dérivée
 * importe ici les descriptors RBAC de ses modules métier et les ajoute à cette
 * liste. Aucun module métier n'a besoin de modifier permissions.constants.js
 * ou les définitions Core des rôles système.
 *
 * Exemple de descriptor métier :
 *
 * {
 *     permissions: ['catalog:item:read', 'catalog:item:update'],
 *     systemRolePermissions: {
 *         owner: ['catalog:item:read', 'catalog:item:update'],
 *         admin: ['catalog:item:read', 'catalog:item:update'],
 *         member: ['catalog:item:read'],
 *     },
 * }
 */
const APPLICATION_ROLE_PERMISSION_MODULES = Object.freeze([
    DOSSIER_ROLE_PERMISSION_MODULE,
]);

const applicationRolePermissionExtensions =
    composeRolePermissionExtensions(
        APPLICATION_ROLE_PERMISSION_MODULES,
    );

const ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY =
    createRolePermissionRegistry({
        permissions: [
            ...Object.values(CORE_PERMISSION),
            ...applicationRolePermissionExtensions.permissions,
        ],
        reservedPermissions: [
            CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
            ...applicationRolePermissionExtensions.reservedPermissions,
        ],
        systemRolePermissions:
            applicationRolePermissionExtensions.systemRolePermissions,
    });

/*
 * Les services historiques consomment le getter du registre runtime actif.
 * La configuration est donc effectuée une seule fois lors de l'initialisation
 * de l'application, avant tout traitement de requête.
 */
configureRolePermissionRegistry(
    ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY,
);


export {
    ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY,
    APPLICATION_ROLE_PERMISSION_MODULES,
};
