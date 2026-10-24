import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const technicalSheetRangeSchema = new Schema({
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, immutable: true },
    name: { type: String, trim: true, required: true, maxlength: 100 },
    normalizedName: { type: String, required: true, maxlength: 100 },
    status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE', required: true },
    revision: { type: Number, default: 0, min: 0, required: true },
    // Each new association also writes this document inside its transaction.
    // Archival/deletion thus conflict with concurrent associations.
    assignmentVersion: { type: Number, default: 0, min: 0, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    statusChangedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

technicalSheetRangeSchema.index(
    { workspace: 1, normalizedName: 1 },
    { unique: true, name: 'technical_sheet_range_workspace_name_unique' },
);
technicalSheetRangeSchema.index(
    { workspace: 1, status: 1, name: 1 },
    { name: 'technical_sheet_range_workspace_status_name' },
);

const TechnicalSheetRange = model('TechnicalSheetRange', technicalSheetRangeSchema);

export { TechnicalSheetRange };
