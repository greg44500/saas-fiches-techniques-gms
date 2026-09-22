import { ApplicationGlobalMember } from '../modules/applicationGlobalAuthorization/applicationGlobalMember.model.js';
import { ApplicationGlobalRole } from '../modules/applicationGlobalAuthorization/applicationGlobalRole.model.js';

/**
 * Provisionne les index des nouvelles collections d'autorisation globale.
 *
 * autoIndex est désactivé en production. Cette migration explicite garantit
 * donc notamment l'unicité d'un membership ACTIVE/SUSPENDED par utilisateur.
 */
const migrateApplicationGlobalAuthorizationIndexes =
    async () => {
        const indexes = [];

        indexes.push(
            await ApplicationGlobalRole.collection.createIndex(
                { key: 1 },
                {
                    unique: true,
                    name: 'application_global_role_key_unique',
                },
            ),
        );

        indexes.push(
            await ApplicationGlobalRole.collection.createIndex(
                {
                    status: 1,
                    isSystem: 1,
                },
                {
                    name: 'application_global_role_status_system',
                },
            ),
        );

        indexes.push(
            await ApplicationGlobalMember.collection.createIndex(
                { user: 1 },
                {
                    unique: true,
                    partialFilterExpression: {
                        status: {
                            $in: ['active', 'suspended'],
                        },
                    },
                    name: 'application_global_current_member_user_unique',
                },
            ),
        );

        indexes.push(
            await ApplicationGlobalMember.collection.createIndex(
                {
                    status: 1,
                    role: 1,
                    createdAt: -1,
                },
                {
                    name: 'application_global_member_status_role',
                },
            ),
        );

        return {
            indexesEnsured: indexes,
        };
    };

export { migrateApplicationGlobalAuthorizationIndexes };
