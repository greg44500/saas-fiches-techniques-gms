import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    BusinessActivityEvent,
} from '../../../modules/businessActivity/businessActivity.model.js';


describe('BusinessActivityEvent model', () => {
    it('rend immuables les faits métier persistés', () => {
        for (const path of [
            'workspace',
            'dossier',
            'actor',
            'action',
            'entityType',
            'entityId',
            'metadata',
        ]) {
            expect(
                BusinessActivityEvent.schema.path(path).options.immutable,
            ).toBe(true);
        }
    });

    it('ne maintient pas de updatedAt pour un événement immuable', () => {
        expect(
            BusinessActivityEvent.schema.path('createdAt'),
        ).toBeDefined();
        expect(
            BusinessActivityEvent.schema.path('updatedAt'),
        ).toBeUndefined();
    });
});
