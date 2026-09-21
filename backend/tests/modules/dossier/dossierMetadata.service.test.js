import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    getDossierMetadata,
} from '../../../modules/dossier/dossierMetadata.service.js';


describe('dossier metadata service', () => {
    it('dérive les vocabulaires M-001 des registries backend', () => {
        const metadata = getDossierMetadata();

        expect(
            metadata.dossierStatuses.map(
                ({ value }) => value,
            ),
        ).toEqual([
            'ACTIVE',
            'PAUSED',
            'ARCHIVED',
            'DELETED',
        ]);

        expect(metadata.statusTransitions).toEqual({
            ACTIVE: [
                'PAUSED',
                'ARCHIVED',
                'DELETED',
            ],
            PAUSED: [
                'ACTIVE',
                'ARCHIVED',
                'DELETED',
            ],
            ARCHIVED: [
                'PAUSED',
                'DELETED',
            ],
            DELETED: [
                'PAUSED',
            ],
        });

        expect(
            metadata.accessRevocationReasons.map(
                ({ value }) => value,
            ),
        ).toEqual([
            'MANUAL',
            'WORKSPACE_MEMBER_REMOVED',
            'DOSSIER_DELETED',
        ]);

        expect(
            metadata.businessActivityActions,
        ).toHaveLength(5);
    });
});
