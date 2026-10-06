import mongoose from 'mongoose';

import {
    PRODUCT_CONSERVATION_TYPE,
    PRODUCT_FOOD_RANGES,
    PRODUCT_GOVERNANCE_STATUS,
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
        name: { type: String, required: true, trim: true, maxlength: 160 },
        normalizedName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 180,
        },
        variety: {
            type: Schema.Types.ObjectId,
            ref: 'ProductVariety',
            default: null,
        },
        characteristics: {
            type: [{
                type: Schema.Types.ObjectId,
                ref: 'ProductCharacteristic',
            }],
            default: [],
            validate: {
                validator(value) {
                    if (!Array.isArray(value) || value.length > 6) return false;
                    return new Set(value.map((entry) => entry.toString())).size
                        === value.length;
                },
                message: 'Une référence contient des caractéristiques invalides ou dupliquées.',
            },
        },
        processingState: { type: String, trim: true, maxlength: 80, default: null },
        normalizedProcessingState: { type: String, trim: true, maxlength: 80, default: '' },
        normalizedSignature: { type: String, required: true, maxlength: 700 },
        conservationType: {
            type: String,
            enum: Object.values(PRODUCT_CONSERVATION_TYPE),
            required: true,
        },
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
        countUnitLabelSingular: {
            type: String,
            trim: true,
            maxlength: 40,
            default: null,
        },
        countUnitLabelPlural: {
            type: String,
            trim: true,
            maxlength: 40,
            default: null,
        },
        yieldPercent: { type: Number, min: 0.000001, max: 100, default: null },
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

productVariantSchema.pre('validate', function normalizeCountUnitLabels() {
    if (this.referenceUnit !== PRODUCT_REFERENCE_UNIT.UNIT) {
        this.countUnitLabelSingular = null;
        this.countUnitLabelPlural = null;
        return;
    }

    this.countUnitLabelSingular =
        this.countUnitLabelSingular?.trim() || 'pièce';
    this.countUnitLabelPlural =
        this.countUnitLabelPlural?.trim() || 'pièces';
});

productVariantSchema.index(
    { normalizedName: 1 },
    {
        name: 'product_variant_approved_normalized_name_unique',
        unique: true,
        partialFilterExpression: {
            identityActive: true,
            governanceStatus: PRODUCT_GOVERNANCE_STATUS.APPROVED,
        },
    },
);
productVariantSchema.index(
    { contributedFromWorkspace: 1, normalizedName: 1 },
    {
        name: 'product_variant_provisional_workspace_name_unique',
        unique: true,
        partialFilterExpression: {
            identityActive: true,
            governanceStatus: PRODUCT_GOVERNANCE_STATUS.PROVISIONAL,
        },
    },
);
productVariantSchema.index(
    { canonicalProduct: 1, normalizedSignature: 1 },
    {
        name: 'product_variant_approved_identity_unique',
        unique: true,
        partialFilterExpression: {
            identityActive: true,
            governanceStatus: PRODUCT_GOVERNANCE_STATUS.APPROVED,
        },
    },
);
productVariantSchema.index(
    {
        canonicalProduct: 1,
        contributedFromWorkspace: 1,
        normalizedSignature: 1,
    },
    {
        name: 'product_variant_provisional_workspace_identity_unique',
        unique: true,
        partialFilterExpression: {
            identityActive: true,
            governanceStatus: PRODUCT_GOVERNANCE_STATUS.PROVISIONAL,
        },
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
productVariantSchema.index(
    { governanceStatus: 1, contributedFromWorkspace: 1, updatedAt: -1 },
    { name: 'product_variant_governance_workspace_updated_at' },
);

const ProductVariant = model('ProductVariant', productVariantSchema);

export { ProductVariant };
