import mongoose from 'mongoose';

import {
    PRODUCT_CATEGORY_STATUS,
} from './productCatalog.registry.js';

const { Schema, model } = mongoose;

const productCategorySchema = new Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        normalizedKey: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
            immutable: true,
        },
        status: {
            type: String,
            enum: Object.values(PRODUCT_CATEGORY_STATUS),
            default: PRODUCT_CATEGORY_STATUS.ACTIVE,
            required: true,
        },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true },
);

productCategorySchema.index(
    { normalizedKey: 1 },
    { name: 'product_category_normalized_unique', unique: true },
);
productCategorySchema.index(
    { status: 1, name: 1 },
    { name: 'product_category_status_name' },
);

const ProductCategory = model('ProductCategory', productCategorySchema);

export { ProductCategory };
