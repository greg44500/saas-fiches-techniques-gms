import {
    BUSINESS_ACTIVITY_ACTION,
    BUSINESS_ACTIVITY_ENTITY_TYPE,
} from './businessActivity.registry.js';
import {
    BusinessActivityEvent,
} from './businessActivity.model.js';


const ACCESS_ACTIVITY_ACTIONS = Object.freeze([
    BUSINESS_ACTIVITY_ACTION.DOSSIER_ACCESS_GRANTED,
    BUSINESS_ACTIVITY_ACTION.DOSSIER_ACCESS_REVOKED,
]);

const assertPlainMetadata = (metadata) => {
    if (
        metadata === null
        || Array.isArray(metadata)
        || typeof metadata !== 'object'
    ) {
        throw new TypeError(
            'Business activity metadata must be an object',
        );
    }
};

const createBusinessActivityEvent = async (
    {
        workspaceId,
        dossierId = null,
        actorId = null,
        action,
        entityType,
        entityId,
        metadata = {},
    },
    { session } = {},
) => {
    if (!workspaceId || !action || !entityType || !entityId || !session) {
        throw new TypeError(
            'workspaceId, action, entityType, entityId and session are required',
        );
    }

    if (!Object.values(BUSINESS_ACTIVITY_ACTION).includes(action)) {
        throw new TypeError(
            `Unknown business activity action: ${action}`,
        );
    }

    if (
        !Object.values(BUSINESS_ACTIVITY_ENTITY_TYPE)
            .includes(entityType)
    ) {
        throw new TypeError(
            `Unknown business activity entity type: ${entityType}`,
        );
    }

    assertPlainMetadata(metadata);

    const [event] = await BusinessActivityEvent.create(
        [
            {
                workspace: workspaceId,
                dossier: dossierId,
                actor: actorId,
                action,
                entityType,
                entityId,
                metadata,
            },
        ],
        { session },
    );

    return event;
};

const serializeBusinessActivityEvent = (event) => ({
    id: event._id.toString(),
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId.toString(),
    actor: event.actor
        ? {
            id: event.actor._id.toString(),
            firstName: event.actor.firstName,
            lastName: event.actor.lastName,
        }
        : null,
    metadata: event.metadata ?? {},
    createdAt: event.createdAt,
});

const listBusinessActivityForDossier = async ({
    workspaceId,
    dossierId,
    page = 1,
    limit = 20,
    canReadAccessEvents = false,
}) => {
    const filter = {
        workspace: workspaceId,
        dossier: dossierId,
    };

    if (!canReadAccessEvents) {
        filter.action = {
            $nin: ACCESS_ACTIVITY_ACTIONS,
        };
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
        BusinessActivityEvent.find(filter)
            .sort({
                createdAt: -1,
                _id: -1,
            })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'actor',
                select: '_id firstName lastName',
            })
            .lean(),
        BusinessActivityEvent.countDocuments(filter),
    ]);

    return {
        events: events.map(serializeBusinessActivityEvent),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};


export {
    ACCESS_ACTIVITY_ACTIONS,
    createBusinessActivityEvent,
    listBusinessActivityForDossier,
};
