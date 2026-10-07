import mongoose from 'mongoose';

import {
    PRODUCT_REFERENCE_UNIT,
} from '../productCatalog/productCatalog.registry.js';
import {
    TECHNICAL_SHEET_FINAL_PRICE_MODE,
    TECHNICAL_SHEET_LINE_KIND,
    TECHNICAL_SHEET_LINE_VALUATION_STATUS,
    TECHNICAL_SHEET_SALE_BASIS,
    TECHNICAL_SHEET_VALUATION_STATUS,
} from './technicalSheet.registry.js';

const { Schema, model } = mongoose;

const lineCalculationSchema = new Schema(
    {
        yieldPercentUsed: {
            type: Schema.Types.Decimal128,
            default: null,
        },
        grossQuantity: {
            type: Schema.Types.Decimal128,
            default: null,
        },
        grossUnit: {
            type: String,
            enum: Object.values(PRODUCT_REFERENCE_UNIT),
            default: null,
        },
    },
    { _id: false },
);

const lineValuationSchema = new Schema(
    {
        status: {
            type: String,
            enum: Object.values(
                TECHNICAL_SHEET_LINE_VALUATION_STATUS,
            ),
            default:
                TECHNICAL_SHEET_LINE_VALUATION_STATUS.UNRESOLVED,
            required: true,
        },
        supplierArticleId: {
            type: Schema.Types.ObjectId,
            ref: 'SupplierArticle',
            default: null,
        },
        applicableSource: {
            type: String,
            trim: true,
            maxlength: 80,
            default: null,
        },
        applicableSourceId: {
            type: String,
            trim: true,
            maxlength: 64,
            default: null,
        },
        normalizedAmount: {
            type: Schema.Types.Decimal128,
            default: null,
        },
        normalizedUnit: {
            type: String,
            enum: Object.values(PRODUCT_REFERENCE_UNIT),
            default: null,
        },
        lineCostHt: {
            type: Schema.Types.Decimal128,
            default: null,
        },
        materialCostSharePercent: {
            type: Schema.Types.Decimal128,
            default: null,
        },
        pricedAt: { type: Date, default: null },
        sourceFingerprint: {
            type: String,
            trim: true,
            maxlength: 128,
            default: null,
        },
        alerts: { type: [String], default: [] },
    },
    { _id: false },
);

const lineOptimizationSchema = new Schema(
    {
        minNetQuantity: {
            type: Schema.Types.Decimal128,
            default: null,
        },
        maxNetQuantity: {
            type: Schema.Types.Decimal128,
            default: null,
        },
        locked: {
            type: Boolean,
            default: false,
            required: true,
        },
    },
    { _id: false },
);

const technicalSheetLineSchema = new Schema(
    {
        kind: {
            type: String,
            enum: Object.values(TECHNICAL_SHEET_LINE_KIND),
            required: true,
        },
        productVariant: {
            type: Schema.Types.ObjectId,
            ref: 'ProductVariant',
            required: true,
        },
        netQuantity: {
            type: Schema.Types.Decimal128,
            required: true,
        },
        inputUnit: {
            type: String,
            enum: Object.values(PRODUCT_REFERENCE_UNIT),
            required: true,
        },
        order: { type: Number, min: 0, required: true },
        note: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },
        selectedSupplierArticle: {
            type: Schema.Types.ObjectId,
            ref: 'SupplierArticle',
            default: null,
        },
        optimization: {
            type: lineOptimizationSchema,
            default: () => ({}),
        },
        calculation: {
            type: lineCalculationSchema,
            default: () => ({}),
        },
        valuation: {
            type: lineValuationSchema,
            default: () => ({}),
        },
    },
    { _id: true },
);

const technicalSheetDraftSchema = new Schema(
    {
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
        technicalSheet: {
            type: Schema.Types.ObjectId,
            ref: 'TechnicalSheet',
            required: true,
            immutable: true,
        },
        revision: {
            type: Number,
            min: 0,
            default: 0,
            required: true,
        },
        productionQuantity: {
            type: Schema.Types.Decimal128,
            default: null,
        },
        productionUnit: {
            type: String,
            enum: [PRODUCT_REFERENCE_UNIT.UNIT],
            default: null,
        },
        portionsPerProductionUnit: {
            type: Schema.Types.Decimal128,
            default: null,
        },
        saleBasis: {
            type: String,
            enum: Object.values(TECHNICAL_SHEET_SALE_BASIS),
            default: null,
        },
        vatRateBasisPoints: {
            type: Number,
            min: 0,
            max: 10000,
            default: null,
        },
        targetMarginBasisPoints: {
            type: Number,
            min: 0,
            max: 9999,
            default: null,
        },
        finalPriceTtcMinor: {
            type: Number,
            min: 0,
            default: null,
        },
        finalPriceMode: {
            type: String,
            enum: Object.values(TECHNICAL_SHEET_FINAL_PRICE_MODE),
            default: TECHNICAL_SHEET_FINAL_PRICE_MODE.ADVISED,
            required: true,
        },
        lines: {
            type: [technicalSheetLineSchema],
            default: [],
        },
        valuationStatus: {
            type: String,
            enum: Object.values(TECHNICAL_SHEET_VALUATION_STATUS),
            default: TECHNICAL_SHEET_VALUATION_STATUS.NOT_VALUED,
            required: true,
        },
        valuedAt: { type: Date, default: null },
        valuationFingerprint: {
            type: String,
            trim: true,
            maxlength: 128,
            default: null,
        },
        economicSnapshot: {
            type: Schema.Types.Mixed,
            default: null,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true },
);

technicalSheetDraftSchema.index(
    { technicalSheet: 1 },
    { name: 'technical_sheet_draft_unique', unique: true },
);
technicalSheetDraftSchema.index(
    { workspace: 1, dossier: 1, updatedAt: -1 },
    { name: 'technical_sheet_draft_workspace_dossier_updated_at' },
);

const TechnicalSheetDraft = model(
    'TechnicalSheetDraft',
    technicalSheetDraftSchema,
);

export { TechnicalSheetDraft };
