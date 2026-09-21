import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    DossierAccessGrant,
} from '../../../modules/dossier/dossierAccess.model.js';


describe('DossierAccessGrant model', () => {
    it('conserve les références de tenancy comme données immuables', () => {
        for (const path of [
            'workspace',
            'dossier',
            'workspaceMember',
        ]) {
            expect(
                DossierAccessGrant.schema.path(path).options.immutable,
            ).toBe(true);
        }
    });

    it('possède un index unique partiel pour le grant ACTIVE courant', () => {
        const index = DossierAccessGrant.schema.indexes().find(
            ([fields, options]) =>
                fields.workspace === 1
                && fields.dossier === 1
                && fields.workspaceMember === 1
                && options.unique === true,
        );

        expect(index).toBeDefined();
        expect(index[1].partialFilterExpression).toEqual({
            status: 'ACTIVE',
        });
    });
});
