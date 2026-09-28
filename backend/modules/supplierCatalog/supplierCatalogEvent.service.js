import {
    SUPPLIER_CATALOG_EVENT_ACTION,
    SUPPLIER_CATALOG_EVENT_ENTITY_TYPE,
    SUPPLIER_SCOPE,
} from './supplierCatalog.registry.js';
import {
    SupplierCatalogEvent,
} from './supplierCatalogEvent.model.js';

const createSupplierCatalogEvent = async ({
    scope,
    workspaceId = null,
    dossierId = null,
    actorId = null,
    action,
    entityType,
    entityId,
    metadata = {},
    session,
}) => {
    if (
        !Object.values(SUPPLIER_SCOPE).includes(scope)
        || !Object.values(SUPPLIER_CATALOG_EVENT_ACTION).includes(action)
        || !Object.values(SUPPLIER_CATALOG_EVENT_ENTITY_TYPE).includes(entityType)
        || !entityId
        || !session
    ) {
        throw new TypeError(
            'scope, action, entityType, entityId and session are required for supplier catalog events',
        );
    }

    const [event] = await SupplierCatalogEvent.create([
        {
            scope,
            workspace: workspaceId,
            dossier: dossierId,
            actor: actorId,
            action,
            entityType,
            entityId,
            metadata,
        },
    ], { session });

    return event;
};

export { createSupplierCatalogEvent };
