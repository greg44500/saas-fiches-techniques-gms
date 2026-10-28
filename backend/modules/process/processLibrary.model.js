import mongoose from 'mongoose';

import {
    PROCESS_LIBRARY_KIND,
    PROCESS_LIBRARY_STATUS,
} from './processLibrary.registry.js';

const { Schema, model } = mongoose;

const scopeFields = {
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
    kind: {
        type: String,
        enum: Object.values(PROCESS_LIBRARY_KIND),
        required: true,
        immutable: true,
    },
};

const processLibraryTemplateSchema = new Schema({
    ...scopeFields,
    title: { type: String, trim: true, required: true, maxlength: 160 },
    normalizedTitle: { type: String, trim: true, required: true, maxlength: 160 },
    definition: { type: Schema.Types.Mixed, required: true },
    status: {
        type: String,
        enum: Object.values(PROCESS_LIBRARY_STATUS),
        default: PROCESS_LIBRARY_STATUS.ACTIVE,
        required: true,
    },
    revision: { type: Number, default: 0, min: 0, required: true },
    // A publishing transaction writes this counter, preventing a concurrent
    // archive/revision from silently changing the selected definition.
    assignmentVersion: { type: Number, default: 0, min: 0, required: true },
    publishedFrom: {
        type: Schema.Types.ObjectId,
        ref: 'ProcessLibraryTemplate',
        immutable: true,
        default: null,
    },
    createdBy: {
        type: Schema.Types.ObjectId, ref: 'User',
        required: true, immutable: true,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

processLibraryTemplateSchema.index(
    { workspace: 1, dossier: 1, kind: 1, normalizedTitle: 1 },
    { unique: true, name: 'process_library_scope_kind_name_unique' },
);
processLibraryTemplateSchema.index(
    { workspace: 1, dossier: 1, kind: 1, status: 1, updatedAt: -1 },
    { name: 'process_library_scope_kind_status_updated' },
);

const processLibraryRevisionSchema = new Schema({
    ...scopeFields,
    template: {
        type: Schema.Types.ObjectId,
        ref: 'ProcessLibraryTemplate',
        required: true,
        immutable: true,
    },
    revision: { type: Number, min: 0, required: true, immutable: true },
    definition: { type: Schema.Types.Mixed, required: true, immutable: true },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        immutable: true,
    },
}, {
    timestamps: { createdAt: true, updatedAt: false },
});

processLibraryRevisionSchema.index(
    { template: 1, revision: 1 },
    { unique: true, name: 'process_library_revision_unique' },
);
processLibraryRevisionSchema.index(
    { workspace: 1, dossier: 1, template: 1, revision: -1 },
    { name: 'process_library_revision_scope_history' },
);

const ProcessLibraryTemplate = model(
    'ProcessLibraryTemplate',
    processLibraryTemplateSchema,
);
const ProcessLibraryRevision = model(
    'ProcessLibraryRevision',
    processLibraryRevisionSchema,
);

export { ProcessLibraryRevision, ProcessLibraryTemplate };
