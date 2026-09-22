import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    DOSSIER_STATUS,
    DOSSIER_STATUS_REGISTRY,
    DOSSIER_STATUS_TRANSITIONS,
} from '../../../modules/dossier/dossier.registry.js';


describe('dossier lifecycle registry', () => {
    it('expose les quatre statuts M-001 attendus', () => {
        expect(Object.values(DOSSIER_STATUS)).toEqual([
            'ACTIVE',
            'PAUSED',
            'ARCHIVED',
            'DELETED',
        ]);

        expect(
            Object.values(DOSSIER_STATUS_REGISTRY).map(
                ({ value, label }) => ({ value, label }),
            ),
        ).toEqual([
            { value: 'ACTIVE', label: 'Actif' },
            { value: 'PAUSED', label: 'En pause' },
            { value: 'ARCHIVED', label: 'Archivé' },
            { value: 'DELETED', label: 'Supprimé' },
        ]);
    });

    it('expose exactement la matrice de transitions validée', () => {
        expect(DOSSIER_STATUS_TRANSITIONS).toEqual({
            ACTIVE: ['PAUSED', 'ARCHIVED', 'DELETED'],
            PAUSED: ['ACTIVE', 'ARCHIVED', 'DELETED'],
            ARCHIVED: ['PAUSED', 'DELETED'],
            DELETED: ['PAUSED'],
        });
    });
});
