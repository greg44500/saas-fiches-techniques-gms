import mongoose from 'mongoose';

import {
    TECHNICAL_SHEET_STATUS,
} from './technicalSheet.registry.js';

const { Schema, model } = mongoose;

const copyOriginSchema = new Schema(
    {
        sourceTechnicalSheet: {
            type: Schema.Types.ObjectId,
            ref: 'TechnicalSheet',
            default: null,
        },
        sourceDossier: {
            type: Schema.Types.ObjectId,
            ref: 'Dossier',
            default: null,
        },
        copiedAt: { type: Date, default: null },
    },
    { _id: false },
);

const technicalSheetSchema = new Schema(
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
            required: true,
            immutable: true,
        },
        name: {
            type: String,
            trim: true,
            minlength: 1,
            maxlength: 160,
            required: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: null,
        },
        status: {
            type: String,
            enum: Object.values(TECHNICAL_SHEET_STATUS),
            default: TECHNICAL_SHEET_STATUS.ACTIVE,
            required: true,
        },
        statusChangedAt: {
            type: Date,
            default: Date.now,
            required: true,
        },
        statusChangedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        currentValidatedState: {
            type: Schema.Types.ObjectId,
            ref: 'TechnicalSheetValidation',
            default: null,
        },
        copyOrigin: { type: copyOriginSchema, default: null },
        preDeleteStatus: {
            type: String,
            enum: [
                TECHNICAL_SHEET_STATUS.ACTIVE,
                TECHNICAL_SHEET_STATUS.ARCHIVED,
                null,
            ],
            default: null,
        },
        deletedAt: { type: Date, default: null },
        deletedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        purgeScheduledAt: { type: Date, default: null },
        revision: {
            type: Number,
            min: 0,
            default: 0,
            required: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true },
);

technicalSheetSchema.index(
    { workspace: 1, dossier: 1, status: 1, updatedAt: -1 },
    { name: 'technical_sheet_workspace_dossier_status_updated_at' },
);
technicalSheetSchema.index(
    { workspace: 1, status: 1, updatedAt: -1 },
    { name: 'technical_sheet_workspace_status_updated_at' },
);
technicalSheetSchema.index(
    { workspace: 1, dossier: 1, name: 1 },
    { name: 'technical_sheet_workspace_dossier_name' },
);
technicalSheetSchema.index(
    { workspace: 1, status: 1, purgeScheduledAt: 1 },
    { name: 'technical_sheet_purge_schedule' },
);

const TechnicalSheet = model('TechnicalSheet', technicalSheetSchema);

export { TechnicalSheet };
