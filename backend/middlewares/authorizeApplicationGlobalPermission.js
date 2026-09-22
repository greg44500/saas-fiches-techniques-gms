import {
    ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
} from '../config/applicationGlobalPermission.registry.js';
import {
    resolveApplicationGlobalAuthorization,
} from '../modules/applicationGlobalAuthorization/applicationGlobalAuthorization.service.js';
import { AppError } from '../utils/appError.js';

/**
 * Construit un guard backend pour l'autorité globale de l'application.
 *
 * Le guard est volontairement indépendant des contextes Platform et Workspace.
 * Il recharge l'autorisation persistée à chaque requête et refuse au montage
 * toute permission qui n'existe pas dans le registre applicatif actif.
 */
const createAuthorizeApplicationGlobalPermission = ({
    permissionRegistry =
        ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
    authorizationResolver =
        resolveApplicationGlobalAuthorization,
} = {}) => {
    const knownPermissionSet = new Set(
        permissionRegistry.permissionKeys,
    );

    return (...requiredPermissions) => {
        if (
            requiredPermissions.length === 0
            || requiredPermissions.some(
                (permission) =>
                    !knownPermissionSet.has(permission),
            )
        ) {
            throw new TypeError(
                'authorizeApplicationGlobalPermission requires known application-global permissions',
            );
        }

        return async (req, res, next) => {
            if (!req.user) {
                return next(
                    new AppError(
                        'Contexte utilisateur indisponible',
                        403,
                    ),
                );
            }

            try {
                const authorization =
                    await authorizationResolver({
                        user: req.user,
                        permissionRegistry,
                    });

                const grantedPermissions = new Set(
                    authorization?.permissions ?? [],
                );

                const authorized = requiredPermissions.every(
                    (permission) =>
                        grantedPermissions.has(permission),
                );

                if (!authorized) {
                    return next(
                        new AppError(
                            'Accès global applicatif non autorisé.',
                            403,
                        ),
                    );
                }

                req.applicationGlobalAuthorization =
                    authorization;

                return next();
            } catch (error) {
                return next(error);
            }
        };
    };
};

const authorizeApplicationGlobalPermission =
    createAuthorizeApplicationGlobalPermission();

export {
    authorizeApplicationGlobalPermission,
    createAuthorizeApplicationGlobalPermission,
};
