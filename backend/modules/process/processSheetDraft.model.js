import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const processSheetDraftSchema = new Schema({
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, immutable: true },
    dossier: { type: Schema.Types.ObjectId, ref: 'Dossier', required: true, immutable: true },
    processSheet: { type: Schema.Types.ObjectId, ref: 'ProcessSheet', required: true, immutable: true },
    sourceValidation: { type: Schema.Types.ObjectId, ref: 'TechnicalSheetValidation', required: true, immutable: true },
    revision: { type: Number, default: 0, min: 0, required: true },
    phases: { type: [Schema.Types.Mixed], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

processSheetDraftSchema.index(
    { processSheet: 1 },
    { unique: true, name: 'process_sheet_draft_unique' },
);
processSheetDraftSchema.index(
    { workspace: 1, dossier: 1, updatedAt: -1 },
    { name: 'process_sheet_draft_scope_updated' },
);

const ProcessSheetDraft = model('ProcessSheetDraft', processSheetDraftSchema);

export { ProcessSheetDraft };
