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
                productionUnit: 'UNIT',
                vatRateBasisPoints: 1000,
            }),
        ).toEqual({
            name: 'Purée de carottes',
            productionQuantity: '10',
            productionUnit: 'UNIT',
            portionsPerProductionUnit: '1',
            saleBasis: 'PIECE',
            vatRateBasisPoints: 1000,
        });

        expect(
            createTechnicalSheetSchema.safeParse({
                name: 'Purée de carottes',
            }).success,
        ).toBe(false);
    });

    it('accepte une marge propre à la Fiche lors de la création', () => {
        expect(
            createTechnicalSheetSchema.parse({
                name: 'Purée de carottes',
                productionQuantity: '10',
                productionUnit: 'UNIT',
                vatRateBasisPoints: 1000,
                targetMarginBasisPoints: 3000,
            }),
        ).toMatchObject({
            targetMarginBasisPoints: 3000,
        });
    });

    it('refuse une unité de production autre que Pièce', () => {
        expect(
            createTechnicalSheetSchema.safeParse({
                name: 'Purée de carottes',
                productionQuantity: '10',
                productionUnit: 'KG',
                vatRateBasisPoints: 1000,
            }).success,
        ).toBe(false);

        expect(
            saveTechnicalSheetDraftSchema.safeParse({
                expectedRevision: 0,
                productionUnit: 'KG',
            }).success,
        ).toBe(false);
    });

    it('accepte les portions par pièce et la base de vente contrôlée par le backend', () => {
        expect(
            saveTechnicalSheetDraftSchema.parse({
                expectedRevision: 0,
                portionsPerProductionUnit: '8',
                saleBasis: 'PORTION',
            }),
        ).toMatchObject({
            portionsPerProductionUnit: '8',
            saleBasis: 'PORTION',
        });
    });

    it('autorise une ligne sans unité saisie car elle est dérivée du Produit', () => {
        const parsed =
            saveTechnicalSheetDraftSchema.parse({
                expectedRevision: 0,
                lines: [{
                    kind: 'INGREDIENT',
                    productVariantId:
                        '507f1f77bcf86cd799439011',
                    netQuantity: '1',
                    order: 0,
                }],
            });

        expect(
            parsed.lines[0].inputUnit,
        ).toBeUndefined();
    });

    it('refuse encore l’ancien champ ambigu portions', () => {
        expect(
            createTechnicalSheetSchema.safeParse({
                name: 'Purée de carottes',
                productionQuantity: '10',
                productionUnit: 'UNIT',
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
