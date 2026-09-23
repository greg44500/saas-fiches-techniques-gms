import mongoose from 'mongoose';

import {
    PRODUCT_FOOD_RANGES,
    PRODUCT_REFERENCE_UNIT,
    PRODUCT_REJECTION_REASON,
    PRODUCT_STATUS,
} from './productCatalog.registry.js';

const { Schema, model } = mongoose;

const productVariantSchema = new Schema(
    {
        canonicalProduct: {
            type: Schema.Types.ObjectId,
            ref: 'CanonicalProduct',
            required: true,
            immutable: true,
        },
        form: { type: String, trim: true, maxlength: 80, default: null },
        normalizedForm: { type: String, trim: true, maxlength: 80, default: '' },
        processingState: { type: String, trim: true, maxlength: 80, default: null },
        normalizedProcessingState: { type: String, trim: true, maxlength: 80, default: '' },
        preservation: { type: String, trim: true, maxlength: 80, default: null },
        normalizedPreservation: { type: String, trim: true, maxlength: 80, default: '' },
        normalizedSignature: { type: String, required: true, maxlength: 260 },
        foodRange: {
            type: Number,
            enum: PRODUCT_FOOD_RANGES,
            default: null,
        },
        referenceUnit: {
            type: String,
            enum: Object.values(PRODUCT_REFERENCE_UNIT),
            required: true,
        },
        yieldPercent: { type: Number, min: 0.000001, max: 100, default: null },
        status: {
            type: String,
            enum: Object.values(PRODUCT_STATUS),
            default: PRODUCT_STATUS.ACTIVE,
            required: true,
        },
        identityActive: { type: Boolean, default: true, required: true },
        contributedFromWorkspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            default: null,
            immutable: true,
        },
        rejectionReason: {
            type: String,
            enum: Object.values(PRODUCT_REJECTION_REASON),
            default: null,
        },
        rejectionComment: { type: String, trim: true, maxlength: 500, default: null },
        replacementVariant: { type: Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true },
);

productVariantSchema.index(
    { canonicalProduct: 1, normalizedSignature: 1 },
    {
        name: 'product_variant_identity_unique',
        unique: true,
        partialFilterExpression: { identityActive: true },
    },
);
productVariantSchema.index(
    { canonicalProduct: 1, status: 1, updatedAt: -1 },
    { name: 'product_variant_product_status_updated_at' },
);
productVariantSchema.index(
    { contributedFromWorkspace: 1, status: 1, createdAt: -1 },
    { name: 'product_variant_workspace_status_created_at' },
);

const ProductVariant = model('ProductVariant', productVariantSchema);

export { ProductVariant };
