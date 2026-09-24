import { AppError } from '../../../utils/appError.js';
import {
    resolveApplicationGlobalAuthorization,
} from '../../applicationGlobalAuthorization/applicationGlobalAuthorization.service.js';
import {
    SYSTEM_PLATFORM_ROLE_PRESETS,
} from '../../platformRole/platformRole.presets.js';
import { PlatformRole } from '../../platformRole/platformRole.model.js';
import {
    resolvePlatformAuthorization,
} from '../../platformTeam/platformAuthorization.service.js';


const toRoleContext = (role) => {
    if (!role) {
        return null;
    }

    return {
        id: role._id?.toString?.() ?? null,
        key: role.key,
        name: role.name,
        description: role.description ?? null,
        isSystem: role.isSystem === true,
    };
};

const getSystemRolePreset = (roleKey) => (
    SYSTEM_PLATFORM_ROLE_PRESETS.find(
        ({ key }) => key === roleKey,
    ) ?? null
);

/**
 * Résout le rôle destiné à l'affichage du contexte Platform courant.
 *
 * Pour un membre ACTIVE, resolvePlatformAuthorization a déjà chargé et validé
 * le rôle. Pour un membre SUSPENDED, les permissions restent volontairement
 * vides mais le rôle assigné est relu afin que l'interface puisse expliquer
 * clairement le contexte du compte sans réactiver la moindre autorisation.
 *
 * Le fallback legacy super_admin reste uniquement une compatibilité de
 * transition. Son libellé provient du preset système code-owned et ne participe
 * jamais à une décision d'autorisation.
 */
const resolvePlatformContextRole = async (authorization) => {
    if (authorization.role) {
        return toRoleContext(authorization.role);
    }

    if (authorization.membership?.role) {
        const role = await PlatformRole.findById(
            authorization.membership.role,
        );

        if (!role) {
            throw new AppError(
                'Le rôle associé au membre de la Plateforme est introuvable.',
                500,
            );
        }

        return toRoleContext(role);
    }

    if (authorization.roleKey) {
        const preset = getSystemRolePreset(
            authorization.roleKey,
        );

        return preset
            ? {
                id: null,
                key: preset.key,
                name: preset.name,
                description: preset.description ?? null,
                isSystem: true,
            }
            : null;
    }

    return null;
};

/**
 * Retourne la projection Platform du User authentifié.
 *
 * Cette projection ne crée aucune nouvelle règle d'autorisation : elle repose
 * sur resolvePlatformAuthorization() pour les droits Platform et expose
 * séparément les permissions Application Global résolues depuis leur propre
 * autorité persistée. Aucun droit Platform n'est converti en droit métier
 * global, y compris pour le Fondateur ou un Super Admin.
 *
 * Un utilisateur sans appartenance Platform courante reçoit null. Un membre
 * suspendu conserve son identité de membre et son rôle pour l'UX, mais ses
 * permissions Platform effectives restent vides.
 */
const getCurrentPlatformContext = async ({ user }) => {
    const authorization = await resolvePlatformAuthorization({
        user,
    });

    if (
        authorization.source === 'none'
        || authorization.source === 'team_history'
    ) {
        return null;
    }

    const [
        role,
        applicationGlobalAuthorization,
    ] = await Promise.all([
        resolvePlatformContextRole(
            authorization,
        ),
        resolveApplicationGlobalAuthorization({
            user,
        }),
    ]);

    return {
        isFounder: authorization.isFounder === true,
        status: authorization.status,
        role,
        permissions: [...authorization.permissions],
        applicationGlobalPermissions: [
            ...applicationGlobalAuthorization.permissions,
        ],
    };
};


export {
    getCurrentPlatformContext,
    resolvePlatformContextRole,
    toRoleContext,
};
