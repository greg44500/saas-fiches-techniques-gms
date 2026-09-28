import mongoose from 'mongoose';

import {
    SUPPLIER_CATALOG_EVENT_ACTION,
    SUPPLIER_CATALOG_EVENT_ENTITY_TYPE,
} from './supplierCatalog.registry.js';
import {
    applySupplierScopeOwnershipValidation,
    createScopeFields,
} from './supplierCatalog.schemas.js';

const { Schema, model } = mongoose;

const IMMUTABLE_OPERATIONS = Object.freeze([
    'updateOne',
    'updateMany',
    'findOneAndUpdate',
    'replaceOne',
    'deleteOne',
    'deleteMany',
    'findOneAndDelete',
]);

const supplierCatalogEventSchema = new Schema(
    {
        ...createScopeFields(),
        dossier: {
            type: Schema.Types.ObjectId,
            ref: 'Dossier',
            default: null,
            immutable: true,
        },
        actor: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            immutable: true,
        },
        action: {
            type: String,
            enum: Object.values(SUPPLIER_CATALOG_EVENT_ACTION),
            required: true,
            immutable: true,
        },
        entityType: {
            type: String,
            enum: Object.values(SUPPLIER_CATALOG_EVENT_ENTITY_TYPE),
            required: true,
            immutable: true,
        },
        entityId: {
            type: Schema.Types.ObjectId,
            required: true,
            immutable: true,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: () => ({}),
            immutable: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        versionKey: false,
    },
);

applySupplierScopeOwnershipValidation(supplierCatalogEventSchema);

supplierCatalogEventSchema.pre('save', function preventExistingSave() {
    if (!this.isNew) {
        throw new Error(
            'Un événement du référentiel fournisseur est immuable.',
        );
    }
});

supplierCatalogEventSchema.pre(
    IMMUTABLE_OPERATIONS,
    function preventMutation() {
        throw new Error(
            'Les événements du référentiel fournisseur sont immuables.',
        );
    },
);

supplierCatalogEventSchema.index(
    { scope: 1, workspace: 1, entityType: 1, entityId: 1, createdAt: -1 },
    { name: 'supplier_catalog_event_entity_created_at' },
);
supplierCatalogEventSchema.index(
    { workspace: 1, dossier: 1, createdAt: -1 },
    { name: 'supplier_catalog_event_dossier_created_at' },
);
supplierCatalogEventSchema.index(
    { action: 1, createdAt: -1 },
    { name: 'supplier_catalog_event_action_created_at' },
);

const SupplierCatalogEvent = model(
    'SupplierCatalogEvent',
    supplierCatalogEventSchema,
);

export { SupplierCatalogEvent };
