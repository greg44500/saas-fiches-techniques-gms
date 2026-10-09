import mongoose from 'mongoose';
import { SUPPLIER_CATALOG_IMPORT_STATUS } from './supplierCatalog.registry.js';
import { applySupplierScopeOwnershipValidation, createScopeFields } from './supplierCatalog.schemas.js';

const { Schema, model } = mongoose;
const articleImportSessionSchema = new Schema({
    ...createScopeFields(),
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', default: null },
    status: {
        type: String, required: true,
        enum: Object.values(SUPPLIER_CATALOG_IMPORT_STATUS),
        default: SUPPLIER_CATALOG_IMPORT_STATUS.INSPECTED,
    },
    format: { type: String, required: true, enum: ['CSV', 'XLS', 'XLSX'] },
    headers: { type: [String], required: true },
    rows: { type: [Schema.Types.Mixed], required: true },
    mapping: { type: Schema.Types.Mixed, default: null },
    preview: { type: [Schema.Types.Mixed], default: [] },
    committedResult: { type: Schema.Types.Mixed, default: null },
    expiresAt: { type: Date, required: true },
}, { timestamps: true });

applySupplierScopeOwnershipValidation(articleImportSessionSchema);
articleImportSessionSchema.index(
    { expiresAt: 1 },
    { name: 'supplier_article_import_session_ttl', expireAfterSeconds: 0 },
);
const SupplierArticleImportSession = model('SupplierArticleImportSession', articleImportSessionSchema);
export { SupplierArticleImportSession };
