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
    CanonicalProduct,
} from '../../modules/productCatalog/canonicalProduct.model.js';
import {
    ProductVariant,
} from '../../modules/productCatalog/productVariant.model.js';
import {
    loadDefaultDataset,
    loadV7ReferenceDataset,
    m002ReferenceDatasetSchema,
    seedM002Reference,
} from '../../seeds/seedM002Reference.js';
import {
    createTestUser,
} from '../helpers/dossierTest.fixtures.js';

const referenceNames = (dataset) => (
    dataset.products.flatMap((product) =>
        product.variants.map((variant) => variant.name))
);

describe('M-002 professional reference corpus v8', () => {
    it('versionne un enrichissement de 126 nouvelles Références avec 6 retraits explicites', async () => {
        const [v7, candidate] = await Promise.all([
            loadV7ReferenceDataset(),
            loadDefaultDataset(),
        ]);

        const parsed = m002ReferenceDatasetSchema.parse(candidate);

        expect(parsed.ready).toBe(true);
        expect(parsed.version).toBe('m002-reference-v8');
        expect(parsed.categories).toHaveLength(16);
        expect(parsed.products).toHaveLength(381);
        expect(referenceNames(parsed)).toHaveLength(488);

        const v7References = new Set(referenceNames(v7));
        const v8References = new Set(referenceNames(parsed));

        const additions = [...v8References].filter(
            (name) => !v7References.has(name),
        );
        const removals = [...v7References].filter(
            (name) => !v8References.has(name),
        );

        expect(additions).toHaveLength(126);
        expect(removals).toEqual(expect.arrayContaining([
            'Fond de tarte sucré cru surgelé',
            'Fond de tarte sucré cuit',
            'Fond de tarte sablé cru surgelé',
            'Fond de tarte sablé cuit',
            'Fond de tarte salé cru surgelé',
            'Fond de tarte salé cuit',
        ]));
        expect(removals).toHaveLength(6);
    });

    it('couvre les ingrédients structurants de pâtisserie, glacerie et snacking', async () => {
        const dataset = m002ReferenceDatasetSchema.parse(
            await loadDefaultDataset(),
        );
        const names = new Set(referenceNames(dataset));

        expect([
            'Œuf entier liquide pasteurisé',
            "Jaune d'œuf liquide pasteurisé",
            "Blanc d'œuf liquide pasteurisé",
            'Sucre semoule',
            'Sucre glace',
            'Sucre inverti',
            'Gélatine en feuilles 200 Bloom',
            'Gousse de vanille',
            'Arôme vanille liquide',
            'Cacao en poudre maigre',
            'Purée de fraise surgelée',
            'Purée de framboise surgelée',
            'Purée de mangue surgelée',
            'Purée de fruit de la passion surgelée',
            'Coulis de fruits rouges surgelé',
            'Sauce barbecue',
            'Sauce burger',
            'Sauce cheddar',
            'Sauce sriracha',
        ].every((name) => names.has(name))).toBe(true);
    });

    it('préserve les poudres et complète les fruits secs génériques demandés', async () => {
        const dataset = m002ReferenceDatasetSchema.parse(
            await loadDefaultDataset(),
        );
        const productByName = new Map(
            dataset.products.map((product) => [product.name, product]),
        );

        expect(productByName.get('Amande').variants
            .map(({ name }) => name))
            .toEqual(expect.arrayContaining([
                'Amande en poudre blanche',
                'Amande en poudre brute',
                'Amande entière avec peau',
                'Amande concassée',
            ]));

        expect(productByName.get('Noisette').variants
            .map(({ name }) => name))
            .toEqual(expect.arrayContaining([
                'Noisette en poudre',
                'Noisette entière',
                'Noisette grillée',
                'Noisette hachée',
            ]));

        expect(productByName.get('Pistache').variants
            .map(({ name }) => name))
            .toEqual(expect.arrayContaining([
                'Pistache en poudre',
                'Pistache entière non salée',
                'Pistache concassée',
            ]));

        expect(productByName.get('Noix').variants
            .map(({ name }) => name))
            .toEqual(expect.arrayContaining([
                'Cerneau de noix',
                'Noix hachée',
                'Noix en poudre',
            ]));

        expect(productByName.get('Cacahuète').variants
            .map(({ name }) => name))
            .toEqual(expect.arrayContaining([
                'Cacahuète grillée non salée',
                'Cacahuète hachée',
                'Cacahuète en poudre',
            ]));
    });

    it('porte le diamètre ou format des fonds de tarte dans la Référence et la dimension', async () => {
        const dataset = m002ReferenceDatasetSchema.parse(
            await loadDefaultDataset(),
        );
        const productByName = new Map(
            dataset.products.map((product) => [product.name, product]),
        );

        const sweet = productByName.get('Fond de tarte sucré');
        expect(sweet.variants.map(({ name }) => name))
            .toEqual(expect.arrayContaining([
                'Fond de tarte sucré cru surgelé Ø 10 cm',
                'Fond de tarte sucré cru surgelé Ø 24,7 cm',
                'Fond de tarte sucré cru surgelé Ø 27 cm',
                'Fond de tartelette sucré cru surgelé carré 7 × 7 cm',
                'Fond de tartelette sucré cru surgelé format stick',
                'Fond de tartelette sucré prêt à garnir Ø 10,3 cm',
            ]));
        expect(sweet.characteristics.map(({ kind, name }) => ({
            kind,
            name,
        }))).toEqual(expect.arrayContaining([
            { kind: 'SIZE_FORMAT', name: 'Ø 10 cm' },
            { kind: 'SIZE_FORMAT', name: 'Ø 24,7 cm' },
            { kind: 'SIZE_FORMAT', name: 'Ø 27 cm' },
            { kind: 'SIZE_FORMAT', name: '7 × 7 cm' },
        ]));

        const savory = productByName.get('Fond de tarte salé');
        expect(savory.variants.map(({ name }) => name))
            .toEqual(expect.arrayContaining([
                'Fond de tartelette brisé salé cru surgelé Ø 10 cm',
                'Fond de tartelette brisé salé cru surgelé Ø 12 cm',
                'Fond de tarte brisé salé cru surgelé Ø 27 cm',
            ]));
    });

    it('reste sans doublon normalisé et sans données commerciales M-003', async () => {
        const dataset = m002ReferenceDatasetSchema.parse(
            await loadDefaultDataset(),
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

    it('installe un v8 frais puis rejoue le même dataset sans doublon', async () => {
        const actor = await createTestUser({
            email: 'seed-m002-v8@example.test',
        });
        const dataset = await loadDefaultDataset();

        const first = await seedM002Reference({
            dataset,
            actorId: actor._id,
        });
        const replay = await seedM002Reference({
            dataset,
            actorId: actor._id,
        });

        expect(first).toMatchObject({
            version: 'm002-reference-v8',
            productCount: 381,
            variantCount: 488,
            skipped: false,
        });
        expect(replay.skipped).toBe(true);

        expect(await CanonicalProduct.countDocuments({
            status: 'ACTIVE',
            identityActive: true,
        })).toBe(381);
        expect(await ProductVariant.countDocuments({
            status: 'ACTIVE',
            identityActive: true,
        })).toBe(488);
    });
});
