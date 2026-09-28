import '../setup.js';

import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    ensureM003SupplierCatalogIndexes,
    M003_INDEX_NAMES,
} from '../../migrations/ensureM003SupplierCatalogIndexes.migration.js';

describe('M-003 supplier catalog migration', () => {
    it('crée et vérifie tous les indexes structurants', async () => {
        const result = await ensureM003SupplierCatalogIndexes();

        expect(result.totalExpected).toBe(M003_INDEX_NAMES.length);
        expect(result.ensuredCount).toBe(M003_INDEX_NAMES.length);
        expect(result.ensured.map(({ name }) => name))
            .toEqual(expect.arrayContaining(M003_INDEX_NAMES));
    });
});
