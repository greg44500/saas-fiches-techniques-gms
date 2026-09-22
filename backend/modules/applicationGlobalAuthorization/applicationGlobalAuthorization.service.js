import mongoose from 'mongoose';

import {
    ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
} from '../../config/applicationGlobalPermission.registry.js';
import {
    APPLICATION_GLOBAL_MEMBER_STATUS,
    APPLICATION_GLOBAL_ROLE_STATUS,
} from '../../constants/applicationGlobalAuthorization.constants.js';
import { AppError } from '../../utils/appError.js';
import { ApplicationGlobalMember } from './applicationGlobalMember.model.js';
import { ApplicationGlobalRole } from './applicationGlobalRole.model.js';

const CURRENT_MEMBER_STATUSES = Object.freeze([
    APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE,
    APPLICATION_GLOBAL_MEMBER_STATUS.SUSPENDED,
]);

const applySession = (query, session) => (
    session ? query.session(session) : query
);

const getApplicationGlobalRoleEffectivePermissions = (
    role,
    {
        permissionRegistry =
            ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
    } = {},
) => {
    if (
        !role
        || role.status !== APPLICATION_GLOBAL_ROLE_STATUS.ACTIVE
    ) {
        return Object.freeze([]);
    }

    const permissions = Array.isArray(role.permissions)
        ? [...new Set(role.permissions)]
        : [];
    const knownPermissionSet = new Set(
        permissionRegistry.permissionKeys,
    );
    const reservedPermissionSet = new Set(
        permissionRegistry.reservedPermissionKeys,
    );

    if (
        permissions.some(
            (permission) => !knownPermissionSet.has(permission),
        )
    ) {
        throw new AppError(
            'La configuration du rôle global applicatif est invalide.',
            403,
        );
    }

    if (
        role.isSystem !== true
        && permissions.some(
            (permission) =>
                reservedPermissionSet.has(permission),
        )
    ) {
        throw new AppError(
            'Un rôle global applicatif personnalisé contient une permission réservée.',
            403,
        );
    }

    return Object.freeze(permissions);
};

/**
 * Résout l'autorité métier globale depuis l'état persistant courant.
 *
 * Aucun droit Platform ou Workspace n'est consulté ou hérité. Un membre
 * suspendu, un membership révoqué ou un rôle archivé produit zéro permission.
 */
const resolveApplicationGlobalAuthorization = async ({
    user,
    session = null,
    permissionRegistry =
        ACTIVE_APPLICATION_GLOBAL_PERMISSION_REGISTRY,
}) => {
    if (!user?._id) {
        throw new TypeError(
            'user is required to resolve application-global authorization',
        );
    }

    const currentMembershipQuery = ApplicationGlobalMember.findOne({
        user: user._id,
        status: mongoose.trusted({
            $in: CURRENT_MEMBER_STATUSES,
        }),
    });

    const currentMembership = await applySession(
        currentMembershipQuery,
        session,
    );

    if (currentMembership) {
        if (
            currentMembership.status
            === APPLICATION_GLOBAL_MEMBER_STATUS.SUSPENDED
        ) {
            return {
                source: 'application_global_member',
                membership: currentMembership,
                role: null,
                roleKey: null,
                permissions: Object.freeze([]),
                status: currentMembership.status,
            };
        }

        const roleQuery = ApplicationGlobalRole.findById(
            currentMembership.role,
        );
        const role = await applySession(roleQuery, session);
        const permissions =
            getApplicationGlobalRoleEffectivePermissions(
                role,
                { permissionRegistry },
            );

        return {
            source: 'application_global_member',
            membership: currentMembership,
            role,
            roleKey: role?.key ?? null,
            permissions,
            status: currentMembership.status,
        };
    }

    const historicalMembershipQuery =
        ApplicationGlobalMember.exists({
            user: user._id,
        });
    const hasHistoricalMembership = await applySession(
        historicalMembershipQuery,
        session,
    );

    if (hasHistoricalMembership) {
        return {
            source: 'application_global_history',
            membership: null,
            role: null,
            roleKey: null,
            permissions: Object.freeze([]),
            status: APPLICATION_GLOBAL_MEMBER_STATUS.REVOKED,
        };
    }

    return {
        source: 'none',
        membership: null,
        role: null,
        roleKey: null,
        permissions: Object.freeze([]),
        status: null,
    };
};

export {
    getApplicationGlobalRoleEffectivePermissions,
    resolveApplicationGlobalAuthorization,
};
