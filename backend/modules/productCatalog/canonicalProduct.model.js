import mongoose from 'mongoose';

import {
    PRODUCT_REJECTION_REASON,
    PRODUCT_STATUS,
} from './productCatalog.registry.js';

const { Schema, model } = mongoose;

const canonicalProductSchema = new Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        normalizedName: { type: String, required: true, trim: true, maxlength: 120 },
        aliases: {
            type: [String],
            default: [],
            validate: {
                validator(value) {
                    return Array.isArray(value) && value.length <= 20;
                },
                message: 'Un Produit ne peut pas dépasser 20 alias.',
            },
        },
        searchKeys: { type: [String], default: [], required: true },
        searchGrams: { type: [String], default: [], required: true },
        category: { type: Schema.Types.ObjectId, ref: 'ProductCategory', default: null },
        status: {
            type: String,
            enum: Object.values(PRODUCT_STATUS),
            default: PRODUCT_STATUS.PENDING_REVIEW,
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
        replacementProduct: { type: Schema.Types.ObjectId, ref: 'CanonicalProduct', default: null },
        replacementVariant: { type: Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true },
);

canonicalProductSchema.index(
    { searchKeys: 1 },
    {
        name: 'canonical_product_search_keys_unique',
        unique: true,
        partialFilterExpression: { identityActive: true },
    },
);
canonicalProductSchema.index(
    { searchGrams: 1, status: 1 },
    { name: 'canonical_product_search_grams_status' },
);
canonicalProductSchema.index(
    { status: 1, category: 1, updatedAt: -1 },
    { name: 'canonical_product_status_category_updated_at' },
);
canonicalProductSchema.index(
    { contributedFromWorkspace: 1, status: 1, createdAt: -1 },
    { name: 'canonical_product_workspace_status_created_at' },
);

const CanonicalProduct = model('CanonicalProduct', canonicalProductSchema);

export { CanonicalProduct };
