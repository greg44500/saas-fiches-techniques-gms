import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';

import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    APPLICATION_GLOBAL_MEMBER_STATUS,
} from '../constants/applicationGlobalAuthorization.constants.js';
import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../constants/auditActions.constants.js';
import {
    createAuditLog,
} from '../modules/auditLog/auditLog.service.js';
import {
    ApplicationGlobalMember,
} from '../modules/applicationGlobalAuthorization/applicationGlobalMember.model.js';
import {
    ApplicationGlobalRole,
} from '../modules/applicationGlobalAuthorization/applicationGlobalRole.model.js';
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
    SUPPLIER_CATALOG_GLOBAL_PERMISSION,
} from '../modules/supplierCatalog/supplierCatalogGlobalPermission.registry.js';
import {
    PRODUCT_REFERENCE_GOVERNOR_ROLE,
    resolveM002GovernanceFounderId,
} from './seedM002ProductGovernance.js';

const BUSINESS_REFERENCE_GOVERNOR_ROLE =
    Object.freeze({
        key: 'business_reference_governor',
        name: 'Gouvernance des référentiels métier',
        description:
            'Administration métier globale des référentiels Produits et Fournisseurs partagés.',
        permissions: Object.freeze([
            PRODUCT_CATALOG_GLOBAL_PERMISSION.READ,
            PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE,
            SUPPLIER_CATALOG_GLOBAL_PERMISSION.READ,
            SUPPLIER_CATALOG_GLOBAL_PERMISSION.MANAGE,
        ]),
    });

const CURRENT_MEMBER_STATUSES = Object.freeze([
    APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE,
    APPLICATION_GLOBAL_MEMBER_STATUS.SUSPENDED,
]);

const migrateExistingM002Governor = async ({
    userId,
    role,
}) => mongoose.connection.transaction(
    async (session) => {
        const member =
            await ApplicationGlobalMember.findOne({
                user: userId,
                status: mongoose.trusted({
                    $in: CURRENT_MEMBER_STATUSES,
                }),
            }).session(session);

        if (!member) {
            return null;
        }

        if (
            member.status
            !== APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE
        ) {
            throw new Error(
                'Le membership global applicatif courant est suspendu ; le bootstrap M-003 refuse de le modifier implicitement.',
            );
        }

        if (
            member.role.toString()
            === role.id
        ) {
            return {
                member,
                changed: false,
            };
        }

        const previousRole =
            await ApplicationGlobalRole.findById(
                member.role,
            ).session(session);

        if (
            !previousRole
            || previousRole.isSystem !== true
            || previousRole.key
                !== PRODUCT_REFERENCE_GOVERNOR_ROLE.key
        ) {
            throw new Error(
                'Le bootstrap M-003 refuse de remplacer un rôle global applicatif qui ne provient pas du bootstrap M-002.',
            );
        }

        member.role = role.id;
        member.updatedBy = userId;
        await member.save({ session });

        await createAuditLog(
            {
                actor: userId,
                action:
                    AUDIT_ACTION.APPLICATION_GLOBAL_MEMBER_ASSIGNED,
                entityType:
                    AUDIT_ENTITY_TYPE.APPLICATION_GLOBAL_MEMBER,
                entityId: member._id,
                status: AUDIT_STATUS.SUCCESS,
                metadata: {
                    roleKey:
                        BUSINESS_REFERENCE_GOVERNOR_ROLE.key,
                    previousRoleKey:
                        previousRole.key,
                    bootstrap: true,
                    module: 'M-003',
                },
            },
            { session },
        );

        return {
            member,
            changed: true,
        };
    },
);

const seedM003ReferenceGovernance = async ({
    userId,
}) => {
    if (!userId) {
        throw new TypeError(
            'userId is required to bootstrap M-003 reference governance',
        );
    }

    const role =
        await syncApplicationGlobalSystemRole({
            roleData:
                BUSINESS_REFERENCE_GOVERNOR_ROLE,
            actorId: userId,
        });

    const migrated =
        await migrateExistingM002Governor({
            userId,
            role,
        });

    if (migrated) {
        return {
            role,
            member: {
                id:
                    migrated.member._id.toString(),
                user:
                    migrated.member.user.toString(),
                role:
                    migrated.member.role.toString(),
                status:
                    migrated.member.status,
            },
            migrated:
                migrated.changed,
        };
    }

    const member =
        await bootstrapApplicationGlobalMember({
            userId,
            roleId: role.id,
            actorId: userId,
        });

    return {
        role,
        member,
        migrated: false,
    };
};

const runSeedM003ReferenceGovernance = async () => {
    await connectDB(env.MONGODB_URI);

    try {
        const userId =
            await resolveM002GovernanceFounderId();
        const result =
            await seedM003ReferenceGovernance({
                userId,
            });

        console.log(
            'Gouvernance globale des référentiels M-003 initialisée :',
            {
                roleId: result.role.id,
                memberId: result.member.id,
                userId: userId.toString(),
                migrated:
                    result.migrated,
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
    runSeedM003ReferenceGovernance().catch(
        (error) => {
            console.error(
                'Échec du bootstrap de la gouvernance M-003 :',
                { message: error.message },
            );
            process.exitCode = 1;
        },
    );
}

export {
    BUSINESS_REFERENCE_GOVERNOR_ROLE,
    runSeedM003ReferenceGovernance,
    seedM003ReferenceGovernance,
};
