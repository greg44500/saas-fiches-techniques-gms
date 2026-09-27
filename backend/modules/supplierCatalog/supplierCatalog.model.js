import mongoose from 'mongoose';

import {
    PRODUCT_REFERENCE_UNIT,
} from '../productCatalog/productCatalog.registry.js';
import {
    SUPPLIER_CATALOG_IMPORT_STATUS,
    SUPPLIER_CATALOG_MATCH_STATUS,
    SUPPLIER_PRICE_BASIS,
    SUPPLIER_RESOURCE_STATUS,
    SUPPLIER_SCOPE,
} from './supplierCatalog.registry.js';
import {
    applySupplierScopeOwnershipValidation,
    createAuditFields,
    createScopeFields,
    packagingSchema,
    sourcePriceSchema,
} from './supplierCatalog.schemas.js';

const { Schema, model } = mongoose;

const supplierCatalogEditionSchema = new Schema(
    {
        ...createScopeFields(),
        supplier: {
            type: Schema.Types.ObjectId,
            ref: 'Supplier',
            required: true,
            immutable: true,
        },
        name: {
            type: String,
            trim: true,
            minlength: 1,
            maxlength: 180,
            required: true,
            immutable: true,
        },
        normalizedName: {
            type: String,
            trim: true,
            minlength: 1,
            maxlength: 200,
            required: true,
            immutable: true,
        },
        identityKey: {
            type: String,
            trim: true,
            minlength: 1,
            maxlength: 500,
            required: true,
            immutable: true,
        },
        editionDate: { type: Date, default: null, immutable: true },
        validFrom: { type: Date, default: null, immutable: true },
        validTo: { type: Date, default: null, immutable: true },
        source: { type: String, trim: true, maxlength: 500, default: null },
        integratedAt: {
            type: Date,
            default: Date.now,
            required: true,
            immutable: true,
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

applySupplierScopeOwnershipValidation(supplierCatalogEditionSchema);

supplierCatalogEditionSchema.index(
    { scope: 1, supplier: 1, identityKey: 1 },
    {
        name: 'supplier_catalog_global_edition_unique',
        unique: true,
        partialFilterExpression: { scope: SUPPLIER_SCOPE.GLOBAL_SHARED },
    },
);
supplierCatalogEditionSchema.index(
    { scope: 1, workspace: 1, supplier: 1, identityKey: 1 },
    {
        name: 'supplier_catalog_workspace_edition_unique',
        unique: true,
        partialFilterExpression: { scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE },
    },
);
supplierCatalogEditionSchema.index(
    { scope: 1, workspace: 1, status: 1, integratedAt: -1 },
    { name: 'supplier_catalog_scope_workspace_status' },
);

const supplierCatalogLineSchema = new Schema(
    {
        catalogEdition: {
            type: Schema.Types.ObjectId,
            ref: 'SupplierCatalogEdition',
            required: true,
            immutable: true,
        },
        ...createScopeFields(),
        lineIdentityKey: {
            type: String,
            trim: true,
            minlength: 1,
            maxlength: 700,
            required: true,
            immutable: true,
        },
        revision: { type: Number, min: 1, default: 1, required: true, immutable: true },
        isCurrent: { type: Boolean, default: true, required: true },
        sourceRowNumber: { type: Number, min: 1, default: null },
        supplierReference: { type: String, trim: true, maxlength: 120, default: null },
        normalizedSupplierReference: {
            type: String,
            trim: true,
            maxlength: 140,
            default: '',
        },
        designation: { type: String, trim: true, maxlength: 300, default: null },
        normalizedDesignation: {
            type: String,
            trim: true,
            maxlength: 320,
            default: '',
        },
        brand: { type: String, trim: true, maxlength: 160, default: null },
        packaging: { type: packagingSchema, default: null },
        sourcePrice: { type: sourcePriceSchema, default: null },
        supplierArticle: {
            type: Schema.Types.ObjectId,
            ref: 'SupplierArticle',
            default: null,
        },
        productVariant: {
            type: Schema.Types.ObjectId,
            ref: 'ProductVariant',
            default: null,
        },
        matchStatus: {
            type: String,
            enum: Object.values(SUPPLIER_CATALOG_MATCH_STATUS),
            default: SUPPLIER_CATALOG_MATCH_STATUS.UNMATCHED,
            required: true,
        },
        provenance: { type: String, trim: true, maxlength: 500, default: null },
        ...createAuditFields(),
    },
    { timestamps: true },
);

applySupplierScopeOwnershipValidation(supplierCatalogLineSchema);

supplierCatalogLineSchema.index(
    { catalogEdition: 1, lineIdentityKey: 1, isCurrent: 1 },
    {
        name: 'supplier_catalog_line_current_identity_unique',
        unique: true,
        partialFilterExpression: { isCurrent: true },
    },
);
supplierCatalogLineSchema.index(
    { scope: 1, workspace: 1, matchStatus: 1, updatedAt: -1 },
    { name: 'supplier_catalog_line_scope_workspace_match' },
);

const supplierTariffSchema = new Schema(
    {
        catalogEdition: {
            type: Schema.Types.ObjectId,
            ref: 'SupplierCatalogEdition',
            required: true,
            immutable: true,
        },
        catalogLine: {
            type: Schema.Types.ObjectId,
            ref: 'SupplierCatalogLine',
            default: null,
            immutable: true,
        },
        supplierArticle: {
            type: Schema.Types.ObjectId,
            ref: 'SupplierArticle',
            required: true,
            immutable: true,
        },
        ...createScopeFields(),
        revision: { type: Number, min: 1, default: 1, required: true, immutable: true },
        isCurrent: { type: Boolean, default: true, required: true },
        sourceAmount: {
            type: Schema.Types.Decimal128,
            required: true,
            immutable: true,
        },
        sourceBasis: {
            type: String,
            enum: Object.values(SUPPLIER_PRICE_BASIS),
            required: true,
            immutable: true,
        },
        currency: {
            type: String,
            trim: true,
            uppercase: true,
            minlength: 3,
            maxlength: 3,
            default: 'EUR',
            required: true,
            immutable: true,
        },
        normalizedAmount: {
            type: Schema.Types.Decimal128,
            default: null,
            immutable: true,
        },
        normalizedUnit: {
            type: String,
            enum: Object.values(PRODUCT_REFERENCE_UNIT),
            default: null,
            immutable: true,
        },
        validFrom: { type: Date, default: null, immutable: true },
        validTo: { type: Date, default: null, immutable: true },
        provenance: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
            immutable: true,
        },
        ...createAuditFields(),
    },
    { timestamps: true },
);

applySupplierScopeOwnershipValidation(supplierTariffSchema);

supplierTariffSchema.index(
    { catalogEdition: 1, supplierArticle: 1, isCurrent: 1 },
    {
        name: 'supplier_tariff_current_edition_article_unique',
        unique: true,
        partialFilterExpression: { isCurrent: true },
    },
);
supplierTariffSchema.index(
    { supplierArticle: 1, validFrom: -1, validTo: -1 },
    { name: 'supplier_tariff_article_validity' },
);

const supplierCatalogImportSessionSchema = new Schema(
    {
        ...createScopeFields(),
        actor: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },
        supplier: {
            type: Schema.Types.ObjectId,
            ref: 'Supplier',
            default: null,
        },
        status: {
            type: String,
            enum: Object.values(SUPPLIER_CATALOG_IMPORT_STATUS),
            default: SUPPLIER_CATALOG_IMPORT_STATUS.INSPECTED,
            required: true,
        },
        format: {
            type: String,
            enum: ['CSV', 'XLS', 'XLSX'],
            required: true,
            immutable: true,
        },
        headers: { type: [String], required: true },
        rows: { type: [Schema.Types.Mixed], required: true },
        editionDraft: { type: Schema.Types.Mixed, default: null },
        mapping: { type: Schema.Types.Mixed, default: null },
        preview: { type: [Schema.Types.Mixed], default: [] },
        committedResult: { type: Schema.Types.Mixed, default: null },
        committedAt: { type: Date, default: null },
        expiresAt: { type: Date, required: true, immutable: true },
    },
    { timestamps: true },
);

applySupplierScopeOwnershipValidation(supplierCatalogImportSessionSchema);

supplierCatalogImportSessionSchema.index(
    { expiresAt: 1 },
    {
        name: 'supplier_catalog_import_session_ttl',
        expireAfterSeconds: 0,
    },
);
supplierCatalogImportSessionSchema.index(
    { scope: 1, workspace: 1, actor: 1, createdAt: -1 },
    { name: 'supplier_catalog_import_scope_workspace_actor_created_at' },
);

const supplierCommerceLockSchema = new Schema(
    {
        key: {
            type: String,
            trim: true,
            minlength: 1,
            maxlength: 500,
            required: true,
            immutable: true,
        },
        version: { type: Number, min: 0, default: 0, required: true },
    },
    { timestamps: true },
);

supplierCommerceLockSchema.index(
    { key: 1 },
    { name: 'supplier_commerce_lock_key_unique', unique: true },
);

const SupplierCatalogEdition = model(
    'SupplierCatalogEdition',
    supplierCatalogEditionSchema,
);
const SupplierCatalogLine = model(
    'SupplierCatalogLine',
    supplierCatalogLineSchema,
);
const SupplierTariff = model('SupplierTariff', supplierTariffSchema);
const SupplierCatalogImportSession = model(
    'SupplierCatalogImportSession',
    supplierCatalogImportSessionSchema,
);
const SupplierCommerceLock = model(
    'SupplierCommerceLock',
    supplierCommerceLockSchema,
);

export {
    SupplierCatalogEdition,
    SupplierCatalogImportSession,
    SupplierCatalogLine,
    SupplierCommerceLock,
    SupplierTariff,
};
