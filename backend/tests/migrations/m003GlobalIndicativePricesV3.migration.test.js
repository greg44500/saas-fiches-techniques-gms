import '../setup.js';

import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    reconcileM003GlobalIndicativePricesToV3,
} from '../../migrations/reconcileM003GlobalIndicativePricesToV3.migration.js';
import {
    IndicativePrice,
} from '../../modules/supplierCatalog/supplierPricing.model.js';
import {
    setIndicativePrice,
} from '../../modules/supplierCatalog/supplierPricing.service.js';
import {
    createActiveProductReference,
} from '../helpers/productCatalogTest.fixtures.js';
import {
    createTestUser,
} from '../helpers/dossierTest.fixtures.js';

describe('M-003 global indicative prices v3 reconciliation', () => {
    it('archive uniquement les Prix bootstrap v2 des Références retirées et préserve les corrections gestionnaire', async () => {
        const actor = await createTestUser({
            email: 'm003-v3-reconcile@example.test',
        });

        const bootstrapReference = await createActiveProductReference({
            actorId: actor._id,
            name: 'Fond de tarte sucré',
            referenceName: 'Fond de tarte sucré cru surgelé',
            conservationType: 'SURGELE',
            referenceUnit: 'UNIT',
        });
        const managedReference = await createActiveProductReference({
            actorId: actor._id,
            name: 'Fond de tarte sablé',
            referenceName: 'Fond de tarte sablé cuit',
            conservationType: 'SEC',
            referenceUnit: 'UNIT',
        });

        await setIndicativePrice({
            productVariantId: bootstrapReference.variant._id,
            actorId: actor._id,
            sourceAmount: '1.00',
            sourceBasis: 'UNIT',
            source:
                'Référentiel de démonstration — prix repère global · m003-global-indicative-v2',
        });
        await setIndicativePrice({
            productVariantId: managedReference.variant._id,
            actorId: actor._id,
            sourceAmount: '2.00',
            sourceBasis: 'UNIT',
            source: 'Correction gestionnaire métier',
        });

        const result =
            await reconcileM003GlobalIndicativePricesToV3({
                actorId: actor._id,
            });

        expect(result).toMatchObject({
            matchedCount: 1,
            archivedCount: 1,
        });

        const bootstrapPrice = await IndicativePrice.findOne({
            productVariant: bootstrapReference.variant._id,
        }).lean();
        expect(bootstrapPrice.status).toBe('ARCHIVED');

        const managedPrice = await IndicativePrice.findOne({
            productVariant: managedReference.variant._id,
            status: 'ACTIVE',
        }).lean();
        expect(managedPrice).not.toBeNull();
        expect(managedPrice.source).toBe(
            'Correction gestionnaire métier',
        );
    });

    it('est rejouable lorsque les anciens Prix bootstrap sont déjà archivés', async () => {
        const actor = await createTestUser({
            email: 'm003-v3-reconcile-replay@example.test',
        });

        const result =
            await reconcileM003GlobalIndicativePricesToV3({
                actorId: actor._id,
            });

        expect(result).toEqual({
            matchedCount: 0,
            archivedCount: 0,
        });
    });
});
