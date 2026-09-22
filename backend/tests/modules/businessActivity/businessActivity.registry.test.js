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
    it('expose exactement les actions M-001', () => {
        expect(Object.values(BUSINESS_ACTIVITY_ACTION)).toEqual([
            'DOSSIER_CREATED',
            'DOSSIER_UPDATED',
            'DOSSIER_STATUS_CHANGED',
            'DOSSIER_ACCESS_GRANTED',
            'DOSSIER_ACCESS_REVOKED',
        ]);
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
