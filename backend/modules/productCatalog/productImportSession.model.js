import mongoose from 'mongoose';

import {
    PRODUCT_IMPORT_SCOPE,
    PRODUCT_IMPORT_STATUS,
} from './productCatalog.registry.js';

const { Schema, model } = mongoose;

const productImportSessionSchema = new Schema(
    {
        scope: {
            type: String,
            enum: Object.values(PRODUCT_IMPORT_SCOPE),
            default: PRODUCT_IMPORT_SCOPE.WORKSPACE,
            required: true,
            immutable: true,
        },
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            default: null,
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
        outOfScopeColumns: {
            type: [Schema.Types.Mixed],
            default: [],
            immutable: true,
        },
        mapping: { type: Schema.Types.Mixed, default: null },
        preview: { type: [Schema.Types.Mixed], default: [] },
        committedResult: { type: Schema.Types.Mixed, default: null },
        committedAt: { type: Date, default: null },
        expiresAt: { type: Date, required: true, immutable: true },
    },
    { timestamps: true },
);

productImportSessionSchema.pre('validate', function validateScopeOwnership() {
    if (
        this.scope === PRODUCT_IMPORT_SCOPE.WORKSPACE
        && !this.workspace
    ) {
        this.invalidate(
            'workspace',
            'Un import Workspace doit référencer un Workspace.',
        );
    }

    if (
        this.scope === PRODUCT_IMPORT_SCOPE.GLOBAL
        && this.workspace
    ) {
        this.invalidate(
            'workspace',
            'Un import global ne doit pas référencer de Workspace.',
        );
    }
});

productImportSessionSchema.index(
    { expiresAt: 1 },
    { name: 'product_import_session_ttl', expireAfterSeconds: 0 },
);
productImportSessionSchema.index(
    { scope: 1, workspace: 1, actor: 1, createdAt: -1 },
    { name: 'product_import_session_scope_workspace_actor_created_at' },
);

const ProductImportSession = model(
    'ProductImportSession',
    productImportSessionSchema,
);

export { ProductImportSession };
