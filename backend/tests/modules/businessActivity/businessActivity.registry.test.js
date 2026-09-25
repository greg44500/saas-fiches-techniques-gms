import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    BUSINESS_ACTIVITY_ACTION,
    BUSINESS_ACTIVITY_ACTION_REGISTRY,
} from '../../../modules/businessActivity/businessActivity.registry.js';

describe('business activity action registry', () => {
    it('compose les actions métier M-001 et M-002', () => {
        expect(Object.values(BUSINESS_ACTIVITY_ACTION)).toEqual(
            expect.arrayContaining([
                'DOSSIER_CREATED',
                'DOSSIER_UPDATED',
                'DOSSIER_STATUS_CHANGED',
                'DOSSIER_ACCESS_GRANTED',
                'DOSSIER_ACCESS_REVOKED',
                'PRODUCT_CATALOG_ATTACHED',
                'PRODUCT_CATALOG_ARCHIVED',
                'PRODUCT_CATALOG_REACTIVATED',
                'PRODUCT_REFERENCE_CREATED',
                'PRODUCT_VARIANT_CREATED',
            ]),
        );
    });

    it('associe chaque action à un libellé backend', () => {
        expect(
            Object.values(BUSINESS_ACTIVITY_ACTION_REGISTRY)
                .every(({ value, label }) =>
                    typeof value === 'string'
                    && typeof label === 'string'
                    && label.length > 0),
        ).toBe(true);
    });
});
