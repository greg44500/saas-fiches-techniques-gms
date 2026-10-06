import '../setup.js';

import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    loadBootstrapReconciliationContract,
    reconcileM002BootstrapToV9,
} from '../../migrations/reconcileM002BootstrapToV9.migration.js';
import {
    normalizeProductText,
} from '../../modules/productCatalog/productCatalog.normalization.js';
import {
    createActiveProductReference,
} from '../helpers/productCatalogTest.fixtures.js';

describe('M-002 bootstrap v9 reconciliation', () => {
    it('conserve les Références v8 puisque le v9 enrichit uniquement leur sémantique UNIT', async () => {
        const contract = await loadBootstrapReconciliationContract();

        expect(
            contract.targetReferenceToProduct.get(
                normalizeProductText('Pain bruschetta surgelé'),
            ),
        ).toBe(normalizeProductText('Pain bruschetta'));
        expect(
            contract.targetReferenceToProduct.get(
                normalizeProductText('Œuf coquille calibre L'),
            ),
        ).toBe(normalizeProductText('Œuf de poule'));
    });

    it('n’archive pas une Référence v8 toujours présente dans le v9', async () => {
        const kept = await createActiveProductReference({
            name: 'Pain bruschetta',
            referenceName: 'Pain bruschetta surgelé',
            conservationType: 'SURGELE',
            referenceUnit: 'UNIT',
        });

        const result = await reconcileM002BootstrapToV9();
        const variant = await kept.variant.constructor
            .findById(kept.variant._id)
            .lean();

        expect(result.archivedVariants).toBe(0);
        expect(variant.identityActive).toBe(true);
        expect(variant.status).toBe('ACTIVE');
    });
});
