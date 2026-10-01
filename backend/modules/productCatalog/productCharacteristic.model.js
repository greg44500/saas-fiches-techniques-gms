import mongoose from 'mongoose';

import {
    PRODUCT_CHARACTERISTIC_KIND,
    PRODUCT_DIMENSION_REVIEW_STATUS,
    PRODUCT_GOVERNANCE_STATUS,
    PRODUCT_STATUS,
} from './productCatalog.registry.js';

const { Schema, model } = mongoose;

const productCharacteristicSchema = new Schema(
    {
        canonicalProduct: {
            type: Schema.Types.ObjectId,
            ref: 'CanonicalProduct',
            required: true,
            immutable: true,
        },
        kind: {
            type: String,
            enum: Object.values(PRODUCT_CHARACTERISTIC_KIND),
            required: true,
            immutable: true,
        },
        name: { type: String, required: true, trim: true, maxlength: 120 },
        normalizedName: { type: String, required: true, trim: true, maxlength: 120 },
        aliases: {
            type: [String],
            default: [],
            validate: {
                validator(value) {
                    return Array.isArray(value) && value.length <= 20;
                },
                message: 'Une Caractéristique ne peut pas dépasser 20 alias.',
            },
        },
        searchKeys: { type: [String], default: [], required: true },
        searchGrams: { type: [String], default: [], required: true },
        status: {
            type: String,
            enum: Object.values(PRODUCT_STATUS),
            default: PRODUCT_STATUS.ACTIVE,
            required: true,
        },
        identityActive: { type: Boolean, default: true, required: true },
        governanceStatus: {
            type: String,
            enum: Object.values(PRODUCT_GOVERNANCE_STATUS),
            default: PRODUCT_GOVERNANCE_STATUS.APPROVED,
            required: true,
        },
        contributedFromWorkspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            default: null,
            immutable: true,
        },
        qualityReviewStatus: {
            type: String,
            enum: Object.values(PRODUCT_DIMENSION_REVIEW_STATUS),
            default: PRODUCT_DIMENSION_REVIEW_STATUS.NOT_REQUIRED,
            required: true,
        },
        qualityReviewedAt: { type: Date, default: null },
        qualityReviewedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true },
);

productCharacteristicSchema.index(
    { canonicalProduct: 1, kind: 1, normalizedName: 1 },
    {
        name: 'product_characteristic_approved_product_kind_name_unique',
        unique: true,
        partialFilterExpression: {
            identityActive: true,
            governanceStatus: PRODUCT_GOVERNANCE_STATUS.APPROVED,
        },
    },
);
productCharacteristicSchema.index(
    {
        canonicalProduct: 1,
        contributedFromWorkspace: 1,
        kind: 1,
        normalizedName: 1,
    },
    {
        name: 'product_characteristic_provisional_workspace_kind_name_unique',
        unique: true,
        partialFilterExpression: {
            identityActive: true,
            governanceStatus: PRODUCT_GOVERNANCE_STATUS.PROVISIONAL,
        },
    },
);
productCharacteristicSchema.index(
    { canonicalProduct: 1, kind: 1, status: 1, normalizedName: 1 },
    { name: 'product_characteristic_product_kind_status_name' },
);
productCharacteristicSchema.index(
    { searchGrams: 1, status: 1 },
    { name: 'product_characteristic_search_grams_status' },
);
productCharacteristicSchema.index(
    {
        governanceStatus: 1,
        contributedFromWorkspace: 1,
        canonicalProduct: 1,
        kind: 1,
    },
    { name: 'product_characteristic_governance_workspace_product_kind' },
);

productCharacteristicSchema.index(
    {
        canonicalProduct: 1,
        qualityReviewStatus: 1,
        status: 1,
        identityActive: 1,
    },
    { name: 'product_characteristic_quality_review' },
);

const ProductCharacteristic = model(
    'ProductCharacteristic',
    productCharacteristicSchema,
);

export { ProductCharacteristic };
