import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    buildSupplierCatalogEditionIdentityKey,
    normalizeSupplierReference,
    normalizeSupplierText,
} from '../../../modules/supplierCatalog/supplierCatalog.normalization.js';

describe('M-003 supplier catalog normalization', () => {
    it('normalise les noms pour la recherche', () => {
        expect(normalizeSupplierText('  Sycàl / Ouest  '))
            .toBe('sycal ouest');
    });

    it('neutralise casse et espaces sans supprimer la ponctuation métier d une référence', () => {
        expect(normalizeSupplierReference(' sys - 123 '))
            .toBe('SYS-123');
        expect(normalizeSupplierReference('SYS/123'))
            .toBe('SYS/123');
    });

    it('construit une identité d édition déterministe', () => {
        expect(buildSupplierCatalogEditionIdentityKey({
            name: 'Catalogue Septembre',
            editionDate: '2026-09-01',
            validFrom: '2026-09-01',
            validTo: '2026-09-30',
        })).toBe(
            'catalogue septembre|2026-09-01|2026-09-01|2026-09-30',
        );
    });
});
