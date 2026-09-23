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
    levenshteinDistance,
    normalizeProductText,
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

    it('construit la signature de déclinaison structurée', () => {
        expect(buildVariantSignature({
            presentation: 'Râpée',
            foodRange: 6,
            processingState: 'PAI / PAE',
        })).toBe('rapee|6|pai pae');
    });
});
