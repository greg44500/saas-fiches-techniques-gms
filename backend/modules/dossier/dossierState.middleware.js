import { AppError } from '../../utils/appError.js';
import {
    DOSSIER_PERMISSION,
} from './dossierPermission.registry.js';
import { DOSSIER_STATUS } from './dossier.registry.js';


const DOSSIER_STATE_POLICY = Object.freeze({
    READ: 'READ',
    READ_ACTIVITY: 'READ_ACTIVITY',
    UPDATE: 'UPDATE',
    GRANT_READ: 'GRANT_READ',
    GRANT_MANAGE: 'GRANT_MANAGE',
});

const READABLE_STATUSES = new Set([
    DOSSIER_STATUS.ACTIVE,
    DOSSIER_STATUS.PAUSED,
    DOSSIER_STATUS.ARCHIVED,
]);

const MUTABLE_STATUSES = new Set([
    DOSSIER_STATUS.ACTIVE,
    DOSSIER_STATUS.PAUSED,
]);

const hasLifecycleAuthority = (req) =>
    Array.isArray(req.permissions)
    && req.permissions.includes(
        DOSSIER_PERMISSION.LIFECYCLE_UPDATE,
    );

const isStateAllowed = (req, policy) => {
    const status = req.dossier?.status;

    switch (policy) {
        case DOSSIER_STATE_POLICY.READ:
        case DOSSIER_STATE_POLICY.READ_ACTIVITY:
            return (
                READABLE_STATUSES.has(status)
                || (
                    status === DOSSIER_STATUS.DELETED
                    && hasLifecycleAuthority(req)
                )
            );

        case DOSSIER_STATE_POLICY.UPDATE:
        case DOSSIER_STATE_POLICY.GRANT_MANAGE:
            return MUTABLE_STATUSES.has(status);

        case DOSSIER_STATE_POLICY.GRANT_READ:
            return (
                READABLE_STATUSES.has(status)
                || (
                    status === DOSSIER_STATUS.DELETED
                    && hasLifecycleAuthority(req)
                )
            );

        default:
            throw new TypeError(
                `Unknown dossier state policy: ${policy}`,
            );
    }
};

const enforceDossierStatePolicy = (policy) => {
    if (!Object.values(DOSSIER_STATE_POLICY).includes(policy)) {
        throw new TypeError(
            `Unknown dossier state policy: ${policy}`,
        );
    }

    return (req, res, next) => {
        if (!req.dossier) {
            return next(
                new AppError(
                    'Contexte Dossier indisponible',
                    500,
                ),
            );
        }

        if (isStateAllowed(req, policy)) {
            return next();
        }

        const isMutationPolicy = (
            policy === DOSSIER_STATE_POLICY.UPDATE
            || policy === DOSSIER_STATE_POLICY.GRANT_MANAGE
        );

        return next(
            new AppError(
                isMutationPolicy
                    ? 'État du Dossier incompatible avec cette action'
                    : 'Dossier introuvable',
                isMutationPolicy ? 409 : 404,
            ),
        );
    };
};


export {
    DOSSIER_STATE_POLICY,
    enforceDossierStatePolicy,
};
