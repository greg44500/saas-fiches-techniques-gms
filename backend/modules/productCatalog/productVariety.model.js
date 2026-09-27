import mongoose from 'mongoose';

import {
    PRODUCT_STATUS,
} from './productCatalog.registry.js';

const { Schema, model } = mongoose;

const productVarietySchema = new Schema(
    {
        canonicalProduct: {
            type: Schema.Types.ObjectId,
            ref: 'CanonicalProduct',
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
                message: 'Une Variété ne peut pas dépasser 20 alias.',
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
        contributedFromWorkspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            default: null,
            immutable: true,
        },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true },
);

productVarietySchema.index(
    { canonicalProduct: 1, normalizedName: 1 },
    {
        name: 'product_variety_product_name_unique',
        unique: true,
        partialFilterExpression: { identityActive: true },
    },
);
productVarietySchema.index(
    { canonicalProduct: 1, status: 1, normalizedName: 1 },
    { name: 'product_variety_product_status_name' },
);
productVarietySchema.index(
    { searchGrams: 1, status: 1 },
    { name: 'product_variety_search_grams_status' },
);

const ProductVariety = model('ProductVariety', productVarietySchema);

export { ProductVariety };
