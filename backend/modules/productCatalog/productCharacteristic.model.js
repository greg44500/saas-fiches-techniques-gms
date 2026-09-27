import mongoose from 'mongoose';

import {
    PRODUCT_CHARACTERISTIC_KIND,
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

productCharacteristicSchema.index(
    { canonicalProduct: 1, kind: 1, normalizedName: 1 },
    {
        name: 'product_characteristic_product_kind_name_unique',
        unique: true,
        partialFilterExpression: { identityActive: true },
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

const ProductCharacteristic = model(
    'ProductCharacteristic',
    productCharacteristicSchema,
);

export { ProductCharacteristic };
