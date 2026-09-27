import {
    PRODUCT_REFERENCE_EVENT_ACTION,
    PRODUCT_REFERENCE_EVENT_ENTITY_TYPE,
} from './productCatalog.registry.js';
import {
    ProductReferenceEvent,
} from './productReferenceEvent.model.js';

const createProductReferenceEvent = async ({
    actorId = null,
    workspaceId = null,
    action,
    entityType,
    entityId,
    metadata = {},
    session,
}) => {
    if (
        !Object.values(PRODUCT_REFERENCE_EVENT_ACTION).includes(action)
        || !Object.values(PRODUCT_REFERENCE_EVENT_ENTITY_TYPE).includes(entityType)
        || !entityId
        || !session
    ) {
        throw new TypeError(
            'action, entityType, entityId and session are required for product reference events',
        );
    }

    const [event] = await ProductReferenceEvent.create([
        {
            actor: actorId,
            workspace: workspaceId,
            action,
            entityType,
            entityId,
            metadata,
        },
    ], { session });

    return event;
};

const listProductReferenceEvents = async ({
    entityType,
    entityId,
    limit = 50,
}) => ProductReferenceEvent.find({
    entityType,
    entityId,
})
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .populate({
        path: 'actor',
        select: '_id firstName lastName',
    })
    .lean();

export {
    createProductReferenceEvent,
    listProductReferenceEvents,
};
