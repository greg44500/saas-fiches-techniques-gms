import {
    ACTIVE_PLATFORM_PERMISSION_REGISTRY,
} from './applicationPlatformPermission.registry.js';
import {
    ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY,
} from './applicationRolePermission.registry.js';
import {
    composeApplicationGlobalPermissions,
    getApplicationGlobalPermissionDefinition,
} from '../modules/applicationGlobalAuthorization/applicationGlobalPermission.registry.js';

/**
 * Point de composition unique des permissions métier globales de l'application.
 *
 * Le Core reste volontairement vide. Un SaaS dérivé importe ici les
 * descriptors de ses modules globaux puis les ajoute explicitement à cette
 * liste. Les permissions restent code-owned et ne sont jamais créées depuis
 * une interface d'administration.
 */
const APPLICATION_GLOBAL_PERMISSION_MODULES = Object.freeze([]);

const ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY =
    composeApplicationGlobalPermissions(
        APPLICATION_GLOBAL_PERMISSION_MODULES,
        {
            workspacePermissionKeys:
                ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY.permissions,
            platformPermissionKeys:
                ACTIVE_PLATFORM_PERMISSION_REGISTRY.permissionKeys,
        },
    );

const getActiveApplicationGlobalPermissionDefinition = (
    permissionKey,
) => getApplicationGlobalPermissionDefinition(
    permissionKey,
    ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
);

export {
    ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
    APPLICATION_GLOBAL_PERMISSION_MODULES,
    getActiveApplicationGlobalPermissionDefinition,
};
