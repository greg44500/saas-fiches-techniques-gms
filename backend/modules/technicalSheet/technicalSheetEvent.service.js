import {
    BUSINESS_ACTIVITY_ENTITY_TYPE,
} from '../businessActivity/businessActivity.registry.js';
import {
    createBusinessActivityEvent,
} from '../businessActivity/businessActivity.service.js';

const createTechnicalSheetEvent = async ({
    workspaceId,
    dossierId = null,
    actorId = null,
    action,
    technicalSheetId,
    metadata = {},
    session,
}) => createBusinessActivityEvent(
    {
        workspaceId,
        dossierId,
        actorId,
        action,
        entityType:
            BUSINESS_ACTIVITY_ENTITY_TYPE.TECHNICAL_SHEET,
        entityId: technicalSheetId,
        metadata,
    },
    { session },
);

export { createTechnicalSheetEvent };
