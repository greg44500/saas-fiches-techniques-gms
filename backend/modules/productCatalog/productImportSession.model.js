import mongoose from 'mongoose';

import {
    PRODUCT_IMPORT_STATUS,
} from './productCatalog.registry.js';

const { Schema, model } = mongoose;

const productImportSessionSchema = new Schema(
    {
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            immutable: true,
        },
        actor: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },
        status: {
            type: String,
            enum: Object.values(PRODUCT_IMPORT_STATUS),
            default: PRODUCT_IMPORT_STATUS.INSPECTED,
            required: true,
        },
        format: {
            type: String,
            enum: ['CSV', 'XLS', 'XLSX'],
            required: true,
            immutable: true,
        },
        headers: { type: [String], required: true },
        rows: { type: [Schema.Types.Mixed], required: true },
        mapping: { type: Schema.Types.Mixed, default: null },
        preview: { type: [Schema.Types.Mixed], default: [] },
        committedResult: { type: Schema.Types.Mixed, default: null },
        committedAt: { type: Date, default: null },
        expiresAt: { type: Date, required: true, immutable: true },
    },
    { timestamps: true },
);

productImportSessionSchema.index(
    { expiresAt: 1 },
    { name: 'product_import_session_ttl', expireAfterSeconds: 0 },
);
productImportSessionSchema.index(
    { workspace: 1, actor: 1, createdAt: -1 },
    { name: 'product_import_session_workspace_actor_created_at' },
);

const ProductImportSession = model(
    'ProductImportSession',
    productImportSessionSchema,
);

export { ProductImportSession };
