import mongoose from 'mongoose';

import {
    PRODUCT_REFERENCE_UNIT,
} from '../productCatalog/productCatalog.registry.js';
import {
    SUPPLIER_PRICE_BASIS,
    SUPPLIER_SCOPE,
} from './supplierCatalog.registry.js';

const { Schema } = mongoose;

const packagingSchema = new Schema(
    {
        containerType: { type: String, trim: true, maxlength: 80, default: null },
        unitCount: { type: Number, min: 1, default: null },
        quantityPerUnit: { type: Schema.Types.Decimal128, default: null },
        unit: {
            type: String,
            enum: Object.values(PRODUCT_REFERENCE_UNIT),
            default: null,
        },
        totalQuantity: { type: Schema.Types.Decimal128, default: null },
        netWeight: { type: Schema.Types.Decimal128, default: null },
        netWeightUnit: {
            type: String,
            enum: [PRODUCT_REFERENCE_UNIT.G, PRODUCT_REFERENCE_UNIT.KG],
            default: null,
        },
        drainedNetWeight: { type: Schema.Types.Decimal128, default: null },
        drainedNetWeightUnit: {
            type: String,
            enum: [PRODUCT_REFERENCE_UNIT.G, PRODUCT_REFERENCE_UNIT.KG],
            default: null,
        },
        supplierLabel: { type: String, trim: true, maxlength: 240, default: null },
    },
    { _id: false },
);

const sourcePriceSchema = new Schema(
    {
        amount: { type: Schema.Types.Decimal128, required: true },
        basis: {
            type: String,
            enum: Object.values(SUPPLIER_PRICE_BASIS),
            required: true,
        },
        currency: {
            type: String,
            trim: true,
            uppercase: true,
            minlength: 3,
            maxlength: 3,
            default: 'EUR',
            required: true,
        },
    },
    { _id: false },
);

const createAuditFields = () => ({
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
});

const createScopeFields = () => ({
    scope: {
        type: String,
        enum: Object.values(SUPPLIER_SCOPE),
        required: true,
        immutable: true,
    },
    workspace: {
        type: Schema.Types.ObjectId,
        ref: 'Workspace',
        default: null,
        immutable: true,
    },
});

const applySupplierScopeOwnershipValidation = (schema) => {
    schema.pre('validate', function validateScopeOwnership() {
        if (
            this.scope === SUPPLIER_SCOPE.WORKSPACE_PRIVATE
            && !this.workspace
        ) {
            this.invalidate(
                'workspace',
                'Une ressource fournisseur privée doit référencer un Workspace.',
            );
        }

        if (
            this.scope === SUPPLIER_SCOPE.GLOBAL_SHARED
            && this.workspace
        ) {
            this.invalidate(
                'workspace',
                'Une ressource fournisseur globale ne doit pas référencer de Workspace.',
            );
        }
    });

    return schema;
};

export {
    applySupplierScopeOwnershipValidation,
    createAuditFields,
    createScopeFields,
    packagingSchema,
    sourcePriceSchema,
};
