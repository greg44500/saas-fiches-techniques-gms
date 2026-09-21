import {
    BUSINESS_ACTIVITY_ACTION_REGISTRY,
} from '../businessActivity/businessActivity.registry.js';
import {
    DOSSIER_ACCESS_GRANT_STATUS_REGISTRY,
    DOSSIER_ACCESS_REVOCATION_REASON_REGISTRY,
} from './dossierAccess.registry.js';
import {
    DOSSIER_STATUS_REGISTRY,
    DOSSIER_STATUS_TRANSITIONS,
} from './dossier.registry.js';


const registryEntries = (registry) =>
    Object.values(registry).map(
        ({ value, label }) => ({ value, label }),
    );

const getDossierMetadata = () => ({
    dossierStatuses: registryEntries(
        DOSSIER_STATUS_REGISTRY,
    ),
    statusTransitions: Object.fromEntries(
        Object.entries(DOSSIER_STATUS_TRANSITIONS).map(
            ([status, transitions]) => [
                status,
                [...transitions],
            ],
        ),
    ),
    accessGrantStatuses: registryEntries(
        DOSSIER_ACCESS_GRANT_STATUS_REGISTRY,
    ),
    accessRevocationReasons: registryEntries(
        DOSSIER_ACCESS_REVOCATION_REASON_REGISTRY,
    ),
    businessActivityActions: registryEntries(
        BUSINESS_ACTIVITY_ACTION_REGISTRY,
    ),
});


export { getDossierMetadata };
