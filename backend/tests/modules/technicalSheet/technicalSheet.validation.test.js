import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    createTechnicalSheetSchema,
    dossierTechnicalSheetSettingsSchema,
    saveTechnicalSheetDraftSchema,
} from '../../../modules/technicalSheet/technicalSheet.validation.js';

describe('M-004 validation Fiches techniques', () => {
    it('exige les paramètres de production à la création', () => {
        expect(
            createTechnicalSheetSchema.parse({
                name: 'Purée de carottes',
                productionQuantity: '10',
                productionUnit: 'KG',
                vatRateBasisPoints: 1000,
            }),
        ).toEqual({
            name: 'Purée de carottes',
            productionQuantity: '10',
            productionUnit: 'KG',
            vatRateBasisPoints: 1000,
        });

        expect(
            createTechnicalSheetSchema.safeParse({
                name: 'Purée de carottes',
            }).success,
        ).toBe(false);
    });

    it('refuse le champ portions supprimé du contrat', () => {
        expect(
            createTechnicalSheetSchema.safeParse({
                name: 'Purée de carottes',
                productionQuantity: '10',
                productionUnit: 'KG',
                vatRateBasisPoints: 1000,
                portions: '10',
            }).success,
        ).toBe(false);

        expect(
            saveTechnicalSheetDraftSchema.safeParse({
                expectedRevision: 0,
                portions: '10',
            }).success,
        ).toBe(false);
    });

    it('interdit de supprimer la marge cible par défaut du Dossier', () => {
        expect(
            dossierTechnicalSheetSettingsSchema.safeParse({
                defaultTargetMarginBasisPoints: null,
            }).success,
        ).toBe(false);

        expect(
            dossierTechnicalSheetSettingsSchema.parse({
                defaultTargetMarginBasisPoints: 3000,
            }),
        ).toEqual({
            defaultTargetMarginBasisPoints: 3000,
        });
    });
});
