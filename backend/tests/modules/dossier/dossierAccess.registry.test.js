import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    DOSSIER_ACCESS_GRANT_STATUS,
    DOSSIER_ACCESS_GRANT_STATUS_REGISTRY,
    DOSSIER_ACCESS_REVOCATION_REASON,
    DOSSIER_ACCESS_REVOCATION_REASON_REGISTRY,
} from '../../../modules/dossier/dossierAccess.registry.js';


describe('dossier access registries', () => {
    it('expose les statuts de grant M-001', () => {
        expect(Object.values(DOSSIER_ACCESS_GRANT_STATUS)).toEqual([
            'ACTIVE',
            'REVOKED',
        ]);

        expect(
            Object.values(DOSSIER_ACCESS_GRANT_STATUS_REGISTRY),
        ).toHaveLength(2);
    });

    it('expose les raisons de révocation M-001', () => {
        expect(
            Object.values(DOSSIER_ACCESS_REVOCATION_REASON),
        ).toEqual([
            'MANUAL',
            'WORKSPACE_MEMBER_REMOVED',
            'DOSSIER_DELETED',
        ]);

        expect(
            Object.values(DOSSIER_ACCESS_REVOCATION_REASON_REGISTRY),
        ).toHaveLength(3);
    });
});
