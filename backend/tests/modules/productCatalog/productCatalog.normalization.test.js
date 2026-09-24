import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    buildSearchGrams,
    buildSearchKeys,
    buildVariantSignature,
    isNearDuplicateKey,
    matchesProductSearchValues,
    levenshteinDistance,
    normalizeProductText,
    productSearchValueContainedInQuery,
    tokenizeProductSearch,
} from '../../../modules/productCatalog/productCatalog.normalization.js';

describe('M-002 product normalization', () => {
    it('normalise casse, accents, ponctuation et espaces', () => {
        expect(normalizeProductText('  Crème-fraîche  ')).toBe(
            'creme fraiche',
        );
        expect(normalizeProductText("L’oignon / ROUGE")).toBe(
            'l oignon rouge',
        );
    });

    it('déduplique le nom et les alias dans searchKeys', () => {
        expect(
            buildSearchKeys('Carotte', ['carotte', 'Carottes']),
        ).toEqual(['carotte', 'carottes']);
    });

    it('génère des trigrammes déterministes', () => {
        expect(buildSearchGrams(['carotte'])).toEqual([
            'aro',
            'car',
            'ott',
            'rot',
            'tte',
        ]);
    });

    it('détecte une faute proche sans fusion automatique', () => {
        expect(levenshteinDistance('carotte', 'carote')).toBe(1);
        expect(isNearDuplicateKey('carotte', 'carote')).toBe(true);
        expect(isNearDuplicateKey('carotte', 'farine')).toBe(false);
    });

    it('conserve la signature legacy uniquement pour la migration historique', () => {
        expect(buildVariantSignature({
            presentation: 'Râpée',
            foodRange: 6,
            processingState: 'PAI / PAE',
        })).toBe('rapee|6|pai pae');
    });

    it('gère pluriel simple, mots composés et faute mineure dans la recherche', () => {
        expect(tokenizeProductSearch('Carottes')).toEqual(['carotte']);
        expect(
            productSearchValueContainedInQuery(
                'mini carotte',
                'Carotte',
            ),
        ).toBe(true);
        expect(
            productSearchValueContainedInQuery(
                'pommes de terre grenaille',
                'Pomme de terre',
            ),
        ).toBe(true);
        expect(
            matchesProductSearchValues(
                'carote botte',
                ['Carotte', 'En botte avec fanes'],
            ),
        ).toBe(true);
        expect(
            matchesProductSearchValues(
                'carotte surgelée',
                ['Carotte', 'Surgelé'],
            ),
        ).toBe(true);
    });

    it('construit la signature cible avec des identifiants stables', () => {
        expect(buildVariantSignature({
            varietyId: '507f1f77bcf86cd799439011',
            characteristics: [
                {
                    id: '507f191e810c19729de860ea',
                    kind: 'PRESENTATION',
                },
                {
                    id: '507f191e810c19729de860eb',
                    kind: 'SIZE_FORMAT',
                },
            ],
            foodRange: 1,
            processingState: 'Produit frais',
        })).toBe(
            'v:507f1f77bcf86cd799439011'
            + '|c:PRESENTATION:507f191e810c19729de860ea,'
            + 'SIZE_FORMAT:507f191e810c19729de860eb'
            + '|r:1|s:produit frais',
        );
    });
});
