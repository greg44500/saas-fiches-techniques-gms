import mongoose from 'mongoose';

import {
    BUSINESS_ACTIVITY_ACTION,
    BUSINESS_ACTIVITY_ENTITY_TYPE,
} from './businessActivity.registry.js';


const { Schema, model } = mongoose;

const businessActivityEventSchema = new Schema(
    {
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            immutable: true,
        },
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
            enum: Object.values(BUSINESS_ACTIVITY_ACTION),
            required: true,
            immutable: true,
        },
        entityType: {
            type: String,
            enum: Object.values(BUSINESS_ACTIVITY_ENTITY_TYPE),
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
        timestamps: {
            createdAt: true,
            updatedAt: false,
        },
    },
);

businessActivityEventSchema.index(
    {
        workspace: 1,
        dossier: 1,
        createdAt: -1,
    },
    {
        name: 'business_activity_dossier_created_at',
    },
);

businessActivityEventSchema.index(
    {
        workspace: 1,
        action: 1,
        createdAt: -1,
    },
    {
        name: 'business_activity_action_created_at',
    },
);


const BusinessActivityEvent = model(
    'BusinessActivityEvent',
    businessActivityEventSchema,
);


export { BusinessActivityEvent };
