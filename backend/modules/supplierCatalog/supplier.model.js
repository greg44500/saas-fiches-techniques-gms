import mongoose from 'mongoose';

import {
    SUPPLIER_RESOURCE_STATUS,
    SUPPLIER_SCOPE,
} from './supplierCatalog.registry.js';
import {
    applySupplierScopeOwnershipValidation,
    createAuditFields,
    createScopeFields,
    packagingSchema,
} from './supplierCatalog.schemas.js';

const { Schema, model } = mongoose;

const supplierSchema = new Schema(
    {
        ...createScopeFields(),
        name: {
            type: String,
            trim: true,
            minlength: 1,
            maxlength: 160,
            required: true,
        },
        normalizedName: {
            type: String,
            trim: true,
            minlength: 1,
            maxlength: 180,
            required: true,
        },
        supplierCode: { type: String, trim: true, maxlength: 80, default: null },
        legalName: { type: String, trim: true, maxlength: 200, default: null },
        website: { type: String, trim: true, maxlength: 500, default: null },
        productCategories: {
            type: [{
                type: Schema.Types.ObjectId,
                ref: 'ProductCategory',
            }],
            default: [],
        },
        status: {
            type: String,
            enum: Object.values(SUPPLIER_RESOURCE_STATUS),
            default: SUPPLIER_RESOURCE_STATUS.ACTIVE,
            required: true,
        },
        ...createAuditFields(),
    },
    { timestamps: true },
);

applySupplierScopeOwnershipValidation(supplierSchema);

supplierSchema.index(
    { scope: 1, status: 1, normalizedName: 1 },
    { name: 'supplier_scope_status_name' },
);
supplierSchema.index(
    { workspace: 1, status: 1, normalizedName: 1 },
    { name: 'supplier_workspace_status_name' },
);

const supplierArticleSchema = new Schema(
    {
        ...createScopeFields(),
        supplier: {
            type: Schema.Types.ObjectId,
            ref: 'Supplier',
            required: true,
            immutable: true,
        },
        productVariant: {
            type: Schema.Types.ObjectId,
            ref: 'ProductVariant',
            default: null,
        },
        supplierReference: {
            type: String,
            trim: true,
            minlength: 1,
            maxlength: 120,
            required: true,
        },
        normalizedSupplierReference: {
            type: String,
            trim: true,
            minlength: 1,
            maxlength: 140,
            required: true,
        },
        supplierDesignation: {
            type: String,
            trim: true,
            maxlength: 300,
            default: null,
        },
        brand: { type: String, trim: true, maxlength: 160, default: null },
        packaging: { type: packagingSchema, default: null },
        status: {
            type: String,
            enum: Object.values(SUPPLIER_RESOURCE_STATUS),
            default: SUPPLIER_RESOURCE_STATUS.ACTIVE,
            required: true,
        },
        replacedBy: {
            type: Schema.Types.ObjectId,
            ref: 'SupplierArticle',
            default: null,
        },
        provenance: { type: String, trim: true, maxlength: 240, default: null },
        ...createAuditFields(),
    },
    { timestamps: true },
);

applySupplierScopeOwnershipValidation(supplierArticleSchema);

supplierArticleSchema.index(
    { scope: 1, supplier: 1, normalizedSupplierReference: 1 },
    {
        name: 'supplier_article_global_reference_unique',
        unique: true,
        partialFilterExpression: { scope: SUPPLIER_SCOPE.GLOBAL_SHARED },
    },
);
supplierArticleSchema.index(
    {
        scope: 1,
        workspace: 1,
        supplier: 1,
        normalizedSupplierReference: 1,
    },
    {
        name: 'supplier_article_workspace_reference_unique',
        unique: true,
        partialFilterExpression: { scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE },
    },
);
supplierArticleSchema.index(
    { productVariant: 1, status: 1, updatedAt: -1 },
    { name: 'supplier_article_product_status' },
);

const Supplier = model('Supplier', supplierSchema);
const SupplierArticle = model('SupplierArticle', supplierArticleSchema);

export {
    Supplier,
    SupplierArticle,
};
