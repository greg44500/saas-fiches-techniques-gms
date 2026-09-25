import mongoose from 'mongoose';

import {
    PRODUCT_REFERENCE_EVENT_ACTION,
    PRODUCT_REFERENCE_EVENT_ENTITY_TYPE,
} from './productCatalog.registry.js';

const { Schema, model } = mongoose;
const IMMUTABLE_OPERATIONS = [
    'updateOne',
    'updateMany',
    'findOneAndUpdate',
    'replaceOne',
    'deleteOne',
    'deleteMany',
    'findOneAndDelete',
];

const productReferenceEventSchema = new Schema(
    {
        actor: { type: Schema.Types.ObjectId, ref: 'User', default: null, immutable: true },
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            default: null,
            immutable: true,
        },
        action: {
            type: String,
            enum: Object.values(PRODUCT_REFERENCE_EVENT_ACTION),
            required: true,
            immutable: true,
        },
        entityType: {
            type: String,
            enum: Object.values(PRODUCT_REFERENCE_EVENT_ENTITY_TYPE),
            required: true,
            immutable: true,
        },
        entityId: { type: Schema.Types.ObjectId, required: true, immutable: true },
        metadata: { type: Schema.Types.Mixed, default: () => ({}), immutable: true },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        versionKey: false,
    },
);

productReferenceEventSchema.pre('save', function preventExistingSave() {
    if (!this.isNew) {
        throw new Error('Un événement du référentiel Produit est immuable.');
    }
});

productReferenceEventSchema.pre(IMMUTABLE_OPERATIONS, function preventMutation() {
    throw new Error('Les événements du référentiel Produit sont immuables.');
});

productReferenceEventSchema.index(
    { entityType: 1, entityId: 1, createdAt: -1 },
    { name: 'product_reference_event_entity_created_at' },
);
productReferenceEventSchema.index(
    { action: 1, createdAt: -1 },
    { name: 'product_reference_event_action_created_at' },
);

const ProductReferenceEvent = model(
    'ProductReferenceEvent',
    productReferenceEventSchema,
);

export { ProductReferenceEvent };
