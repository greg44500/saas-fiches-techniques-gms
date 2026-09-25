import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';

import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    PLATFORM_TEAM_MEMBER_STATUS,
} from '../constants/platformTeam.constants.js';
import { USER_STATUS } from '../constants/userStatus.constants.js';
import {
    bootstrapApplicationGlobalMember,
} from '../modules/applicationGlobalAuthorization/applicationGlobalMember.service.js';
import {
    syncApplicationGlobalSystemRole,
} from '../modules/applicationGlobalAuthorization/applicationGlobalRole.service.js';
import {
    PRODUCT_CATALOG_GLOBAL_PERMISSION,
} from '../modules/productCatalog/productCatalogGlobalPermission.registry.js';
import {
    PlatformTeamMember,
} from '../modules/platformTeam/platformTeamMember.model.js';

const PRODUCT_REFERENCE_GOVERNOR_ROLE =
    Object.freeze({
        key: 'product_reference_governor',
        name: 'Gouvernance référentiel Produits',
        description:
            'Administration métier globale du référentiel Produit partagé.',
        permissions: Object.freeze([
            PRODUCT_CATALOG_GLOBAL_PERMISSION.READ,
            PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE,
        ]),
    });

const resolveM002GovernanceFounderId = async () => {
    const founder = await PlatformTeamMember.findOne({
        isFounder: true,
        status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
    })
        .populate({
            path: 'user',
            match: {
                status: USER_STATUS.ACTIVE,
            },
            select: '_id',
        })
        .lean();

    if (!founder?.user?._id) {
        throw new Error(
            'Un Fondateur Platform actif est requis avant le bootstrap de la gouvernance Produits.',
        );
    }

    return founder.user._id;
};

/**
 * Attribue explicitement au Fondateur le rôle métier global initial.
 *
 * Le droit ne découle jamais de son statut Platform : il est matérialisé par
 * ApplicationGlobalRole + ApplicationGlobalMember et peut ensuite suivre son
 * propre cycle de vie.
 */
const seedM002ProductGovernance = async ({
    userId,
}) => {
    if (!userId) {
        throw new TypeError(
            'userId is required to bootstrap M-002 product governance',
        );
    }

    const role =
        await syncApplicationGlobalSystemRole({
            roleData:
                PRODUCT_REFERENCE_GOVERNOR_ROLE,
            actorId: userId,
        });

    const member =
        await bootstrapApplicationGlobalMember({
            userId,
            roleId: role.id,
            actorId: userId,
        });

    return {
        role,
        member,
    };
};

const runSeedM002ProductGovernance = async () => {
    await connectDB(env.MONGODB_URI);

    try {
        const userId =
            await resolveM002GovernanceFounderId();
        const result =
            await seedM002ProductGovernance({
                userId,
            });

        console.log(
            'Gouvernance globale Produits M-002 initialisée :',
            {
                roleId: result.role.id,
                memberId: result.member.id,
                userId: userId.toString(),
            },
        );
    } finally {
        await mongoose.disconnect();
    }
};

const isExecutedDirectly =
    process.argv[1]
    && import.meta.url
        === pathToFileURL(process.argv[1]).href;

if (isExecutedDirectly) {
    runSeedM002ProductGovernance().catch(
        (error) => {
            console.error(
                'Échec du bootstrap de la gouvernance Produits M-002 :',
                { message: error.message },
            );
            process.exitCode = 1;
        },
    );
}

export {
    PRODUCT_REFERENCE_GOVERNOR_ROLE,
    resolveM002GovernanceFounderId,
    runSeedM002ProductGovernance,
    seedM002ProductGovernance,
};
