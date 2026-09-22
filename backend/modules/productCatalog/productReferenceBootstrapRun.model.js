import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const productReferenceBootstrapRunSchema = new Schema(
    {
        version: {
            type: String,
            required: true,
            trim: true,
            immutable: true,
        },
        datasetHash: {
            type: String,
            required: true,
            trim: true,
            immutable: true,
        },
        actor: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },
        categoryCount: {
            type: Number,
            min: 0,
            required: true,
            immutable: true,
        },
        productCount: {
            type: Number,
            min: 0,
            required: true,
            immutable: true,
        },
        variantCount: {
            type: Number,
            min: 0,
            required: true,
            immutable: true,
        },
        installedAt: {
            type: Date,
            required: true,
            default: Date.now,
            immutable: true,
        },
    },
    {
        timestamps: {
            createdAt: true,
            updatedAt: false,
        },
    },
);

productReferenceBootstrapRunSchema.index(
    { version: 1 },
    {
        name: 'product_reference_bootstrap_version_unique',
        unique: true,
    },
);

const ProductReferenceBootstrapRun = model(
    'ProductReferenceBootstrapRun',
    productReferenceBootstrapRunSchema,
);

export { ProductReferenceBootstrapRun };
