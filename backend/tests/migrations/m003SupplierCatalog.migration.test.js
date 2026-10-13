import '../setup.js';

import {
    describe,
    expect,
    it,
} from 'vitest';

import { auditM003SupplierNames } from '../../migrations/auditM003SupplierNames.migration.js';
import { Supplier } from '../../modules/supplierCatalog/supplier.model.js';
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
    });
});
