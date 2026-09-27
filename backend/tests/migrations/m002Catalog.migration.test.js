import '../setup.js';

import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    M002_INDEX_NAMES,
    ensureM002CatalogIndexes,
} from '../../migrations/ensureM002CatalogIndexes.migration.js';

describe('M-002 catalog index migration', () => {
    it('est idempotente et provisionne tous les indexes attendus', async () => {
        const first = await ensureM002CatalogIndexes();
        const second = await ensureM002CatalogIndexes();

        expect(first.totalExpected).toBe(M002_INDEX_NAMES.length);
        expect(second.totalExpected).toBe(M002_INDEX_NAMES.length);
        expect(first.ensuredCount).toBe(M002_INDEX_NAMES.length);
        expect(second.ensuredCount).toBe(M002_INDEX_NAMES.length);
    });
});
