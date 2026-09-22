import {
    ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
} from '../../config/applicationGlobalPermission.registry.js';
import { AppError } from '../../utils/appError.js';

const normalizePermissionList = (permissions, label) => {
    if (!Array.isArray(permissions)) {
        throw new TypeError(label + ' must be an array');
    }

    return [
        ...new Set(
            permissions.map((permission) => {
                if (typeof permission !== 'string') {
                    throw new TypeError(
                        label + ' must contain only strings',
                    );
                }

                return permission.trim().toLowerCase();
            }),
        ),
    ];
};

const assertKnownApplicationGlobalPermission = ({
    permission,
    permissionRegistry =
        ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
}) => {
    if (
        typeof permission !== 'string'
        || !permissionRegistry.permissionKeys.includes(permission)
    ) {
        throw new TypeError(
            'A known application-global permission is required',
        );
    }

    return permission;
};

const assertActorHasApplicationGlobalPermission = ({
    authorization,
    permission,
    permissionRegistry =
        ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
}) => {
    assertKnownApplicationGlobalPermission({
        permission,
        permissionRegistry,
    });

    if (!authorization?.permissions?.includes(permission)) {
        throw new AppError(
            'Accès global applicatif non autorisé.',
            403,
        );
    }
};

const assertApplicationGlobalRolePermissions = ({
    permissions,
    actorPermissions = null,
    allowReserved = false,
    permissionRegistry =
        ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
}) => {
    const normalizedPermissions = normalizePermissionList(
        permissions,
        'permissions',
    );
    const knownPermissionSet = new Set(
        permissionRegistry.permissionKeys,
    );
    const reservedPermissionSet = new Set(
        permissionRegistry.reservedPermissionKeys,
    );

    const unknownPermission = normalizedPermissions.find(
        (permission) => !knownPermissionSet.has(permission),
    );

    if (unknownPermission) {
        throw new AppError(
            'Permission globale applicative inconnue ou inactive : '
                + unknownPermission,
            400,
        );
    }

    if (!allowReserved) {
        const reservedPermission = normalizedPermissions.find(
            (permission) =>
                reservedPermissionSet.has(permission),
        );

        if (reservedPermission) {
            throw new AppError(
                'Cette permission globale applicative réservée ne peut pas être attribuée à un rôle personnalisé.',
                403,
            );
        }
    }

    if (actorPermissions !== null) {
        if (!Array.isArray(actorPermissions)) {
            throw new AppError(
                'Contexte de permissions globales indisponible.',
                403,
            );
        }

        const actorPermissionSet = new Set(actorPermissions);
        const escalatedPermission = normalizedPermissions.find(
            (permission) =>
                !actorPermissionSet.has(permission),
        );

        if (escalatedPermission) {
            throw new AppError(
                'Vous ne pouvez pas attribuer un rôle global contenant des permissions que vous ne possédez pas.',
                403,
            );
        }
    }

    return Object.freeze(normalizedPermissions);
};

const assertApplicationGlobalRoleWithinActorAuthority = ({
    rolePermissions,
    actorPermissions,
}) => {
    if (!Array.isArray(actorPermissions)) {
        throw new AppError(
            'Contexte de permissions globales indisponible.',
            403,
        );
    }

    const actorPermissionSet = new Set(actorPermissions);
    const outsideAuthority = rolePermissions.find(
        (permission) => !actorPermissionSet.has(permission),
    );

    if (outsideAuthority) {
        throw new AppError(
            'Vous ne pouvez administrer qu’un rôle global dont les permissions sont incluses dans vos propres droits.',
            403,
        );
    }
};

export {
    assertActorHasApplicationGlobalPermission,
    assertApplicationGlobalRolePermissions,
    assertApplicationGlobalRoleWithinActorAuthority,
    assertKnownApplicationGlobalPermission,
};
