import mongoose from 'mongoose';

import {
    PRODUCT_CHARACTERISTIC_KIND,
    PRODUCT_CONTRIBUTION_CLASSIFICATION,
    PRODUCT_CONTRIBUTION_STATUS,
    PRODUCT_CONTRIBUTION_TYPE,
    PRODUCT_REFERENCE_EVENT_ENTITY_TYPE,
} from './productCatalog.registry.js';

const { Schema, model } = mongoose;

const referenceContributionReasonSchema = new Schema(
    {
        code: { type: String, required: true, trim: true, maxlength: 120 },
        message: { type: String, required: true, trim: true, maxlength: 500 },
    },
    { _id: false },
);

const referenceContributionSchema = new Schema(
    {
        type: {
            type: String,
            enum: Object.values(PRODUCT_CONTRIBUTION_TYPE),
            required: true,
            immutable: true,
        },
        canonicalProduct: {
            type: Schema.Types.ObjectId,
            ref: 'CanonicalProduct',
            default: null,
            immutable: true,
        },
        characteristicKind: {
            type: String,
            enum: Object.values(PRODUCT_CHARACTERISTIC_KIND),
            default: null,
            immutable: true,
        },
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            immutable: true,
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },
        proposedValue: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
            immutable: true,
        },
        normalizedValue: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
            immutable: true,
        },
        payload: {
            type: Schema.Types.Mixed,
            default: () => ({}),
            immutable: true,
        },
        classification: {
            type: String,
            enum: Object.values(PRODUCT_CONTRIBUTION_CLASSIFICATION),
            required: true,
            immutable: true,
        },
        reasons: {
            type: [referenceContributionReasonSchema],
            default: [],
            immutable: true,
        },
        status: {
            type: String,
            enum: Object.values(PRODUCT_CONTRIBUTION_STATUS),
            default: PRODUCT_CONTRIBUTION_STATUS.PENDING_REVIEW,
            required: true,
        },
        reviewer: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        reviewedAt: { type: Date, default: null },
        resolutionEntityType: {
            type: String,
            enum: Object.values(PRODUCT_REFERENCE_EVENT_ENTITY_TYPE),
            default: null,
        },
        resolutionEntityId: {
            type: Schema.Types.ObjectId,
            default: null,
        },
    },
    { timestamps: true },
);

referenceContributionSchema.index(
    { status: 1, createdAt: 1 },
    { name: 'reference_contribution_status_created_at' },
);
referenceContributionSchema.index(
    { workspace: 1, status: 1, createdAt: -1 },
    { name: 'reference_contribution_workspace_status_created_at' },
);
referenceContributionSchema.index(
    { canonicalProduct: 1, type: 1, status: 1, createdAt: -1 },
    { name: 'reference_contribution_product_type_status_created_at' },
);

const ReferenceContribution = model(
    'ReferenceContribution',
    referenceContributionSchema,
);

export { ReferenceContribution };
