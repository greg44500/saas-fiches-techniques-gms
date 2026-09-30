import mongoose from 'mongoose';

import {
    TECHNICAL_SHEET_TRASH_RETENTION,
} from './technicalSheet.registry.js';

const { Schema, model } = mongoose;

const workspaceBusinessSettingsSchema = new Schema(
    {
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            immutable: true,
        },
        trashRetentionDays: {
            type: Number,
            min: TECHNICAL_SHEET_TRASH_RETENTION.MIN_DAYS,
            max: TECHNICAL_SHEET_TRASH_RETENTION.MAX_DAYS,
            default:
                TECHNICAL_SHEET_TRASH_RETENTION.DEFAULT_DAYS,
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

workspaceBusinessSettingsSchema.index(
    { workspace: 1 },
    { name: 'workspace_business_settings_unique', unique: true },
);

const WorkspaceBusinessSettings = model(
    'WorkspaceBusinessSettings',
    workspaceBusinessSettingsSchema,
);

export { WorkspaceBusinessSettings };
