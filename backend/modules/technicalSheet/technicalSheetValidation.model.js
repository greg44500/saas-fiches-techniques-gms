import mongoose from 'mongoose';

import {
    PRODUCT_REFERENCE_UNIT,
} from '../productCatalog/productCatalog.registry.js';
import {
    TECHNICAL_SHEET_CHANGE_KIND,
    TECHNICAL_SHEET_FINAL_PRICE_MODE,
    TECHNICAL_SHEET_LINE_KIND,
} from './technicalSheet.registry.js';

const { Schema, model } = mongoose;

const sheetSnapshotSchema = new Schema(
    {
        name: { type: String, required: true },
        description: { type: String, default: null },
        productionQuantity: {
            type: Schema.Types.Decimal128,
            required: true,
        },
        productionUnit: {
            type: String,
            enum: Object.values(PRODUCT_REFERENCE_UNIT),
            required: true,
        },
        portions: {
            type: Schema.Types.Decimal128,
            default: null,
        },
        vatRateBasisPoints: {
            type: Number,
            min: 0,
            max: 10000,
            required: true,
        },
        targetMarginBasisPoints: {
            type: Number,
            min: 0,
            max: 9999,
            required: true,
        },
    },
    { _id: false },
);

const lineSnapshotSchema = new Schema(
    {
        kind: {
            type: String,
            enum: Object.values(TECHNICAL_SHEET_LINE_KIND),
            required: true,
        },
        productVariantId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        productVariantName: { type: String, required: true },
        netQuantity: {
            type: Schema.Types.Decimal128,
            required: true,
        },
        inputUnit: {
            type: String,
            enum: Object.values(PRODUCT_REFERENCE_UNIT),
            required: true,
        },
        yieldPercentUsed: {
            type: Schema.Types.Decimal128,
            default: null,
        },
        grossQuantity: {
            type: Schema.Types.Decimal128,
            required: true,
        },
        grossUnit: {
            type: String,
            enum: Object.values(PRODUCT_REFERENCE_UNIT),
            required: true,
        },
        recipePercent: {
            type: Schema.Types.Decimal128,
            default: null,
        },
        supplierArticleId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        supplierId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        supplierName: { type: String, required: true },
        supplierReference: { type: String, default: null },
        supplierDesignation: { type: String, default: null },
        brand: { type: String, default: null },
        normalizedPriceHt: {
            type: Schema.Types.Decimal128,
            required: true,
        },
        normalizedUnit: {
            type: String,
            enum: Object.values(PRODUCT_REFERENCE_UNIT),
            required: true,
        },
        applicableSource: { type: String, required: true },
        applicableSourceId: { type: String, required: true },
        lineCostHt: {
            type: Schema.Types.Decimal128,
            required: true,
        },
        order: { type: Number, min: 0, required: true },
        note: { type: String, default: null },
    },
    { _id: false },
);

const economicSnapshotSchema = new Schema(
    {
        materialCostHt: {
            type: Schema.Types.Decimal128,
            required: true,
        },
        economatCostHt: {
            type: Schema.Types.Decimal128,
            required: true,
        },
        manufacturingCostHt: {
            type: Schema.Types.Decimal128,
            required: true,
        },
        theoreticalPriceHt: {
            type: Schema.Types.Decimal128,
            required: true,
        },
        theoreticalPriceTtc: {
            type: Schema.Types.Decimal128,
            required: true,
        },
        advisedPriceTtcMinor: {
            type: Number,
            min: 0,
            required: true,
        },
        finalPriceHt: {
            type: Schema.Types.Decimal128,
            required: true,
        },
        finalPriceTtcMinor: {
            type: Number,
            min: 0,
            required: true,
        },
        finalPriceMode: {
            type: String,
            enum: Object.values(
                TECHNICAL_SHEET_FINAL_PRICE_MODE,
            ),
            required: true,
        },
        actualMarginAmountHt: {
            type: Schema.Types.Decimal128,
            required: true,
        },
        actualMarginBasisPoints: {
            type: Number,
            required: true,
        },
        economicFloorTtc: {
            type: Schema.Types.Decimal128,
            required: true,
        },
    },
    { _id: false },
);

const technicalSheetValidationSchema = new Schema(
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
        validatedAt: {
            type: Date,
            required: true,
            immutable: true,
        },
        validatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },
        comment: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
            immutable: true,
        },
        changeKinds: {
            type: [{
                type: String,
                enum: Object.values(TECHNICAL_SHEET_CHANGE_KIND),
            }],
            default: [],
            immutable: true,
        },
        sheetSnapshot: {
            type: sheetSnapshotSchema,
            required: true,
            immutable: true,
        },
        linesSnapshot: {
            type: [lineSnapshotSchema],
            required: true,
            immutable: true,
        },
        economicSnapshot: {
            type: economicSnapshotSchema,
            required: true,
            immutable: true,
        },
        valuationFingerprint: {
            type: String,
            required: true,
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

technicalSheetValidationSchema.pre(
    'save',
    function preventValidationMutation() {
        if (!this.isNew) {
            throw new Error(
                'Un état validé de Fiche technique est immuable.',
            );
        }
    },
);

for (const hook of [
    'updateOne',
    'updateMany',
    'findOneAndUpdate',
    'replaceOne',
]) {
    technicalSheetValidationSchema.pre(
        hook,
        function preventValidationUpdate() {
            throw new Error(
                'Un état validé de Fiche technique est immuable.',
            );
        },
    );
}

technicalSheetValidationSchema.index(
    { technicalSheet: 1, validatedAt: -1, _id: -1 },
    { name: 'technical_sheet_validation_history' },
);
technicalSheetValidationSchema.index(
    { workspace: 1, dossier: 1, validatedAt: -1 },
    { name: 'technical_sheet_validation_workspace_dossier' },
);

const TechnicalSheetValidation = model(
    'TechnicalSheetValidation',
    technicalSheetValidationSchema,
);

export { TechnicalSheetValidation };
