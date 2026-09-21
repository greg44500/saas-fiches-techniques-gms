import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    createDossierSchema,
    dossierListQuerySchema,
    updateDossierSchema,
    updateDossierStatusSchema,
} from '../../../modules/dossier/dossier.validation.js';
import {
    dossierAccessListQuerySchema,
    dossierAccessParamsSchema,
    emptyBodySchema,
} from '../../../modules/dossier/dossierAccess.validation.js';


describe('dossier request validation', () => {
    it('accepte une création avec le seul nom métier obligatoire', () => {
        expect(
            createDossierSchema.parse({
                name: 'Magasin Nantes',
            }),
        ).toEqual({
            name: 'Magasin Nantes',
        });
    });

    it('refuse les champs système fournis par le client', () => {
        const result = createDossierSchema.safeParse({
            name: 'Magasin Nantes',
            status: 'ACTIVE',
        });

        expect(result.success).toBe(false);
    });

    it('applique les valeurs de pagination par défaut', () => {
        expect(dossierListQuerySchema.parse({})).toEqual({
            page: 1,
            limit: 20,
        });
    });

    it('refuse une limite supérieure à 100', () => {
        expect(
            dossierListQuerySchema.safeParse({
                limit: '101',
            }).success,
        ).toBe(false);
    });

    it('refuse un PATCH vide et accepte null pour effacer un champ facultatif', () => {
        expect(updateDossierSchema.safeParse({}).success).toBe(false);
        expect(
            updateDossierSchema.parse({
                brand: null,
            }),
        ).toEqual({
            brand: null,
        });
    });

    it('valide la forme du lifecycle sans imposer la raison métier', () => {
        expect(
            updateDossierStatusSchema.parse({
                status: 'DELETED',
            }),
        ).toEqual({
            status: 'DELETED',
        });

        expect(
            updateDossierStatusSchema.safeParse({
                status: 'UNKNOWN',
            }).success,
        ).toBe(false);
    });
});

describe('dossier access request validation', () => {
    it('valide les trois ObjectIds de la route de grant', () => {
        const id = '0123456789abcdef01234567';

        expect(
            dossierAccessParamsSchema.parse({
                workspaceId: id,
                dossierId: id,
                membershipId: id,
            }),
        ).toEqual({
            workspaceId: id,
            dossierId: id,
            membershipId: id,
        });
    });

    it('applique ACTIVE comme filtre de grant par défaut', () => {
        expect(dossierAccessListQuerySchema.parse({})).toEqual({
            page: 1,
            limit: 20,
            status: 'ACTIVE',
        });
    });

    it('accepte un body omis ou vide et refuse les champs de grant client', () => {
        expect(emptyBodySchema.parse(undefined)).toEqual({});
        expect(emptyBodySchema.parse({})).toEqual({});
        expect(
            emptyBodySchema.safeParse({
                status: 'ACTIVE',
            }).success,
        ).toBe(false);
    });
});
