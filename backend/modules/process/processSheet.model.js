import mongoose from 'mongoose';

import {
    TECHNICAL_SHEET_STATUS,
} from '../technicalSheet/technicalSheet.registry.js';

const { Schema, model } = mongoose;

const PROCESS_SHEET_EDITORIAL_STATE = Object.freeze({
    DRAFT: 'DRAFT',
    VALIDATED: 'VALIDATED',
});

const processSheetSchema = new Schema({
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, immutable: true },
    dossier: { type: Schema.Types.ObjectId, ref: 'Dossier', required: true, immutable: true },
    technicalSheet: { type: Schema.Types.ObjectId, ref: 'TechnicalSheet', required: true, immutable: true },
    title: { type: String, trim: true, minlength: 1, maxlength: 160, required: true },
    // Mirrors M-004 only; independent process archiving is forbidden.
    status: { type: String, enum: Object.values(TECHNICAL_SHEET_STATUS), default: TECHNICAL_SHEET_STATUS.ACTIVE, required: true },
    sourceValidation: { type: Schema.Types.ObjectId, ref: 'TechnicalSheetValidation', required: true, immutable: true },
    revision: { type: Number, default: 0, min: 0, required: true },
    // The process keeps one mutable current content; no M-006 validation snapshots.
    editorialState: {
        type: String, enum: Object.values(PROCESS_SHEET_EDITORIAL_STATE),
        required: true, default: PROCESS_SHEET_EDITORIAL_STATE.DRAFT,
    },
    validatedAt: { type: Date, default: null },
    validatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // Legacy field from the unimplemented version-history design: never populated.
    currentValidatedState: { type: Schema.Types.ObjectId, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

processSheetSchema.index(
    { technicalSheet: 1 },
    { unique: true, name: 'process_sheet_technical_sheet_unique' },
);
processSheetSchema.index(
    { workspace: 1, dossier: 1, status: 1, updatedAt: -1 },
    { name: 'process_sheet_scope_status_updated' },
);

const ProcessSheet = model('ProcessSheet', processSheetSchema);

export { ProcessSheet, PROCESS_SHEET_EDITORIAL_STATE };
