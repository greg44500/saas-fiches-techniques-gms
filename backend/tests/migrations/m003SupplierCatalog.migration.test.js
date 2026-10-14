import '../setup.js';

import {
    describe,
    expect,
    it,
} from 'vitest';

import { auditM003SupplierNames } from '../../migrations/auditM003SupplierNames.migration.js';
import { Supplier } from '../../modules/supplierCatalog/supplier.model.js';
import { SupplierTariff } from '../../modules/supplierCatalog/supplierCatalog.model.js';
import {
    ensureM003SupplierCatalogIndexes,
    M003_INDEX_NAMES,
} from '../../migrations/ensureM003SupplierCatalogIndexes.migration.js';

describe('M-003 supplier catalog migration', () => {
    it('audite les fournisseurs sans modifier les données', async () => {
        const before = await Supplier.countDocuments();
        const audit = await auditM003SupplierNames();
        expect(audit.total).toBe(before);
        expect(Array.isArray(audit.duplicates)).toBe(true);
        expect(Array.isArray(audit.invalid)).toBe(true);
    });

    it('crée et vérifie tous les indexes structurants', async () => {
        const result = await ensureM003SupplierCatalogIndexes();

        expect(result.totalExpected).toBe(M003_INDEX_NAMES.length);
        expect(result.ensuredCount).toBe(M003_INDEX_NAMES.length);
        expect(result.ensured.map(({ name }) => name))
            .toEqual(expect.arrayContaining(M003_INDEX_NAMES));

        const indexes = await SupplierTariff.collection.indexes();
        const priceListRevisionIndex = indexes.find(({ name }) =>
            name === 'supplier_price_list_import_article_revision_unique');
        expect(priceListRevisionIndex).toMatchObject({
            key: { sourceImportId: 1, supplierArticle: 1, revision: 1 },
            unique: true,
            partialFilterExpression: { sourceKind: 'PRICE_LIST' },
        });
        expect(indexes.some(({ name }) =>
            name === 'supplier_price_list_import_article_unique')).toBe(false);
    });
});
