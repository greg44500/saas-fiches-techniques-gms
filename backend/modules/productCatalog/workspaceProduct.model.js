import mongoose from 'mongoose';

import {
    WORKSPACE_PRODUCT_STATUS,
} from './productCatalog.registry.js';

const { Schema, model } = mongoose;

const workspaceProductSchema = new Schema(
    {
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            immutable: true,
        },
        productVariant: {
            type: Schema.Types.ObjectId,
            ref: 'ProductVariant',
            required: true,
            immutable: true,
        },
        status: {
            type: String,
            enum: Object.values(WORKSPACE_PRODUCT_STATUS),
            default: WORKSPACE_PRODUCT_STATUS.ACTIVE,
            required: true,
        },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true },
);

workspaceProductSchema.index(
    { workspace: 1, productVariant: 1 },
    { name: 'workspace_product_unique', unique: true },
);
workspaceProductSchema.index(
    { workspace: 1, status: 1, updatedAt: -1 },
    { name: 'workspace_product_status_updated_at' },
);

const WorkspaceProduct = model('WorkspaceProduct', workspaceProductSchema);

export { WorkspaceProduct };
