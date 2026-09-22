import {
    BusinessActivityEvent,
} from '../modules/businessActivity/businessActivity.model.js';
import {
    DOSSIER_ACCESS_GRANT_STATUS,
} from '../modules/dossier/dossierAccess.registry.js';
import {
    DossierAccessGrant,
} from '../modules/dossier/dossierAccess.model.js';
import { Dossier } from '../modules/dossier/dossier.model.js';


const M001_INDEX_SPECS = Object.freeze([
    Object.freeze({
        collection: Dossier.collection,
        name: 'dossiers_workspace_status_updated_at',
        key: {
            workspace: 1,
            status: 1,
            updatedAt: -1,
        },
        options: Object.freeze({}),
    }),
    Object.freeze({
        collection: Dossier.collection,
        name: 'dossiers_workspace_name',
        key: {
            workspace: 1,
            name: 1,
        },
        options: Object.freeze({}),
    }),
    Object.freeze({
        collection: Dossier.collection,
        name: 'dossiers_workspace_city',
        key: {
            workspace: 1,
            'location.city': 1,
        },
        options: Object.freeze({}),
    }),
    Object.freeze({
        collection: DossierAccessGrant.collection,
        name: 'dossier_access_active_unique',
        key: {
            workspace: 1,
            dossier: 1,
            workspaceMember: 1,
        },
        options: Object.freeze({
            unique: true,
            partialFilterExpression: Object.freeze({
                status:
                    DOSSIER_ACCESS_GRANT_STATUS.ACTIVE,
            }),
        }),
    }),
    Object.freeze({
        collection: DossierAccessGrant.collection,
        name: 'dossier_access_dossier_status_granted_at',
        key: {
            workspace: 1,
            dossier: 1,
            status: 1,
            grantedAt: -1,
        },
        options: Object.freeze({}),
    }),
    Object.freeze({
        collection: DossierAccessGrant.collection,
        name: 'dossier_access_member_status',
        key: {
            workspace: 1,
            workspaceMember: 1,
            status: 1,
        },
        options: Object.freeze({}),
    }),
    Object.freeze({
        collection: BusinessActivityEvent.collection,
        name: 'business_activity_dossier_created_at',
        key: {
            workspace: 1,
            dossier: 1,
            createdAt: -1,
        },
        options: Object.freeze({}),
    }),
    Object.freeze({
        collection: BusinessActivityEvent.collection,
        name: 'business_activity_action_created_at',
        key: {
            workspace: 1,
            action: 1,
            createdAt: -1,
        },
        options: Object.freeze({}),
    }),
]);

/**
 * Provisionne les indexes structurels de M-001.
 *
 * La migration est additive et idempotente : createIndex retourne l'index
 * existant lorsque sa définition est identique et échoue explicitement si un
 * index du même nom possède une définition incompatible.
 */
const ensureM001Indexes = async () => {
    const ensured = [];

    for (const spec of M001_INDEX_SPECS) {
        const name = await spec.collection.createIndex(
            spec.key,
            {
                name: spec.name,
                ...spec.options,
            },
        );

        ensured.push(name);
    }

    return {
        ensured,
        ensuredCount: ensured.length,
        totalExpected: M001_INDEX_SPECS.length,
    };
};


export {
    M001_INDEX_SPECS,
    ensureM001Indexes,
};
