import mongoose from 'mongoose';

import {
    PRODUCT_REFERENCE_UNIT,
} from '../productCatalog/productCatalog.registry.js';
import {
    DOSSIER_SUPPLIER_REFERENCE_STATUS,
    INVOICED_PRICE_STATUS,
    NEGOTIATED_PRICE_STATUS,
    SUPPLIER_PRICE_BASIS,
    SUPPLIER_PRICING_POLICY_MODE,
} from './supplierCatalog.registry.js';
import {
    createAuditFields,
} from './supplierCatalog.schemas.js';

const { Schema, model } = mongoose;

const priceFields = () => ({
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
});

const dossierFields = () => ({
    workspace: {
        type: Schema.Types.ObjectId,
        ref: 'Workspace',
        required: true,
        immutable: true,
    },
    dossier: {
        type: Schema.Types.ObjectId,
        ref: 'Dossier',
        required: true,
        immutable: true,
    },
});

const negotiatedPriceSchema = new Schema(
    {
        ...dossierFields(),
        supplierArticle: {
            type: Schema.Types.ObjectId,
            ref: 'SupplierArticle',
            required: true,
            immutable: true,
        },
        ...priceFields(),
        validFrom: { type: Date, required: true, immutable: true },
        validTo: { type: Date, default: null, immutable: true },
        status: {
            type: String,
            enum: Object.values(NEGOTIATED_PRICE_STATUS),
            default: NEGOTIATED_PRICE_STATUS.ACTIVE,
            required: true,
        },
        source: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
            immutable: true,
        },
        archivedAt: { type: Date, default: null },
        archivedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        ...createAuditFields(),
    },
    { timestamps: true },
);

negotiatedPriceSchema.index(
    {
        workspace: 1,
        dossier: 1,
        supplierArticle: 1,
        status: 1,
        validFrom: -1,
        validTo: -1,
    },
    { name: 'negotiated_price_dossier_article_period' },
);

const invoicedPriceSchema = new Schema(
    {
        ...dossierFields(),
        supplier: {
            type: Schema.Types.ObjectId,
            ref: 'Supplier',
            required: true,
            immutable: true,
        },
        supplierArticle: {
            type: Schema.Types.ObjectId,
            ref: 'SupplierArticle',
            required: true,
            immutable: true,
        },
        invoiceDate: { type: Date, required: true, immutable: true },
        ...priceFields(),
        status: {
            type: String,
            enum: Object.values(INVOICED_PRICE_STATUS),
            default: INVOICED_PRICE_STATUS.PENDING_VALIDATION,
            required: true,
        },
        source: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
            immutable: true,
        },
        validatedAt: { type: Date, default: null },
        validatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        rejectedAt: { type: Date, default: null },
        rejectedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        ...createAuditFields(),
    },
    { timestamps: true },
);

invoicedPriceSchema.index(
    {
        workspace: 1,
        dossier: 1,
        supplierArticle: 1,
        invoiceDate: -1,
    },
    { name: 'invoiced_price_dossier_article_invoice_date' },
);
invoicedPriceSchema.index(
    {
        workspace: 1,
        dossier: 1,
        status: 1,
        invoiceDate: -1,
    },
    { name: 'invoiced_price_dossier_status_date' },
);

const dossierSupplierReferenceSchema = new Schema(
    {
        ...dossierFields(),
        supplierArticle: {
            type: Schema.Types.ObjectId,
            ref: 'SupplierArticle',
            required: true,
            immutable: true,
        },
        status: {
            type: String,
            enum: Object.values(DOSSIER_SUPPLIER_REFERENCE_STATUS),
            default: DOSSIER_SUPPLIER_REFERENCE_STATUS.ACTIVE,
            required: true,
        },
        ...createAuditFields(),
    },
    { timestamps: true },
);

dossierSupplierReferenceSchema.index(
    { workspace: 1, dossier: 1, supplierArticle: 1 },
    { name: 'dossier_supplier_reference_unique', unique: true },
);
dossierSupplierReferenceSchema.index(
    { workspace: 1, dossier: 1, status: 1, updatedAt: -1 },
    { name: 'dossier_supplier_reference_status' },
);

const workspaceSupplierPricingPolicySchema = new Schema(
    {
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            immutable: true,
        },
        mode: {
            type: String,
            enum: Object.values(SUPPLIER_PRICING_POLICY_MODE),
            default: SUPPLIER_PRICING_POLICY_MODE.NEGOTIATED_PRICE,
            required: true,
        },
        ...createAuditFields(),
    },
    { timestamps: true },
);

workspaceSupplierPricingPolicySchema.index(
    { workspace: 1 },
    { name: 'workspace_supplier_pricing_policy_unique', unique: true },
);

const NegotiatedPrice = model('NegotiatedPrice', negotiatedPriceSchema);
const InvoicedPrice = model('InvoicedPrice', invoicedPriceSchema);
const DossierSupplierReference = model(
    'DossierSupplierReference',
    dossierSupplierReferenceSchema,
);
const WorkspaceSupplierPricingPolicy = model(
    'WorkspaceSupplierPricingPolicy',
    workspaceSupplierPricingPolicySchema,
);

export {
    DossierSupplierReference,
    InvoicedPrice,
    NegotiatedPrice,
    WorkspaceSupplierPricingPolicy,
};
