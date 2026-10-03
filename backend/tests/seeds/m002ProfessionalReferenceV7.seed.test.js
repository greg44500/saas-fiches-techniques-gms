import '../setup.js';

import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    normalizeProductText,
} from '../../modules/productCatalog/productCatalog.normalization.js';
import {
    loadDefaultDataset,
    loadProfessionalReferenceDataset,
    m002ReferenceDatasetSchema,
} from '../../seeds/seedM002Reference.js';

const referenceNames = (dataset) => (
    dataset.products.flatMap((product) =>
        product.variants.map((variant) => variant.name))
);

describe('M-002 professional reference corpus v7', () => {
    it('conserve intégralement le corpus v6 et ajoute le référentiel professionnel', async () => {
        const [legacy, candidate] = await Promise.all([
            loadDefaultDataset(),
            loadProfessionalReferenceDataset(),
        ]);

        const parsed =
            m002ReferenceDatasetSchema.parse(candidate);

        expect(parsed.ready).toBe(true);
        expect(parsed.version).toBe('m002-reference-v7');
        expect(parsed.categories).toHaveLength(16);
        expect(parsed.products).toHaveLength(320);
        expect(referenceNames(parsed)).toHaveLength(368);

        const legacyReferences = new Set(referenceNames(legacy));
        const candidateReferences = new Set(referenceNames(parsed));

        expect(candidateReferences.size - legacyReferences.size)
            .toBe(104);

        for (const name of legacyReferences) {
            expect(candidateReferences.has(name)).toBe(true);
        }
    });

    it('couvre les trois domaines professionnels attendus', async () => {
        const dataset =
            m002ReferenceDatasetSchema.parse(
                await loadProfessionalReferenceDataset(),
            );

        const categories = new Map(
            dataset.categories.map(({ key, name }) => [key, name]),
        );

        expect(categories.get(
            'matieres-premieres-patisserie-boulangerie',
        )).toBe(
            'Matières premières de pâtisserie et boulangerie',
        );
        expect(categories.get('pains-snacking'))
            .toBe('Pains et snacking');

        const names = new Set(referenceNames(dataset));

        expect([
            'Farine de blé T45 pâtissière',
            'Farine de gruau T00',
            'Sucre semoule',
            'Fondant pâtissier blanc',
            'Couverture noire 70 % cacao',
            'Pâte pure de pistache',
            'Praliné amande-noisette',
            'Beurre doux 82 % MG',
            'Beurre de tourage 82 % MG',
            'Crème liquide UHT 35 % MG',
            'Mascarpone',
            'Cream cheese',
            'Cheddar en tranches',
            'Mozzarella râpée',
            'Bun classique surgelé',
            'Bun brioché surgelé',
            'Potato bun surgelé',
            'Pain pita surgelé',
            'Pain panini surgelé',
            'Pain bruschetta surgelé',
        ].every((name) => names.has(name))).toBe(true);
    });

    it('utilise les racines Produit pour regrouper les Références techniquement distinctes', async () => {
        const dataset =
            m002ReferenceDatasetSchema.parse(
                await loadProfessionalReferenceDataset(),
            );

        const productByName = new Map(
            dataset.products.map((product) => [product.name, product]),
        );

        expect(productByName.get('Farine de blé').variants
            .map(({ name }) => name))
            .toEqual([
                'Farine de blé T45 pâtissière',
                'Farine de gruau T00',
                'Farine de blé T55',
                'Farine de blé T65 panifiable',
            ]);

        expect(productByName.get('Beurre').variants)
            .toHaveLength(4);
        expect(productByName.get('Pain burger').variants)
            .toHaveLength(4);

        expect(productByName.get('Emmental').variants
            .map(({ name }) => name))
            .toEqual(expect.arrayContaining([
                'Emmental',
                'Emmental râpé',
                'Emmental en tranches',
            ]));
    });

    it('reste non commercial et sans doublon de Référence normalisée', async () => {
        const dataset =
            m002ReferenceDatasetSchema.parse(
                await loadProfessionalReferenceDataset(),
            );
        const names = referenceNames(dataset);
        const normalized = names.map(normalizeProductText);

        expect(new Set(normalized).size).toBe(normalized.length);

        for (const product of dataset.products) {
            expect(product).not.toHaveProperty('supplier');
            expect(product).not.toHaveProperty('price');
            expect(product).not.toHaveProperty('packaging');

            for (const variant of product.variants) {
                expect(variant).not.toHaveProperty('supplier');
                expect(variant).not.toHaveProperty('price');
                expect(variant).not.toHaveProperty('packaging');
            }
        }
    });

    it('trace les sources professionnelles sans les transformer en marques Produit', async () => {
        const dataset =
            m002ReferenceDatasetSchema.parse(
                await loadProfessionalReferenceDataset(),
            );

        const professionalSources = dataset.sources.filter(
            ({ type }) => type === 'professional-web-catalog',
        );

        expect(professionalSources).toHaveLength(4);
        expect(professionalSources.map(({ name }) => name))
            .toEqual(expect.arrayContaining([
                expect.stringMatching(/Transgourmet France/),
                expect.stringMatching(/METRO France/),
                expect.stringMatching(/Valrhona Selection/),
                expect.stringMatching(/Sysco France/),
            ]));

        for (const { name } of dataset.products) {
            expect(name).not.toMatch(
                /^(?:METRO|Sysco|Valrhona|Transgourmet)\\b/i,
            );
        }
    });
});
