import '../setup.js';

import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    CanonicalProduct,
} from '../../modules/productCatalog/canonicalProduct.model.js';
import {
    ProductCategory,
} from '../../modules/productCatalog/productCategory.model.js';
import {
    normalizeProductText,
} from '../../modules/productCatalog/productCatalog.normalization.js';
import {
    ProductReferenceBootstrapRun,
} from '../../modules/productCatalog/productReferenceBootstrapRun.model.js';
import {
    ProductCharacteristic,
} from '../../modules/productCatalog/productCharacteristic.model.js';
import {
    ProductVariant,
} from '../../modules/productCatalog/productVariant.model.js';
import {
    ProductVariety,
} from '../../modules/productCatalog/productVariety.model.js';
import {
    createTestUser,
} from '../helpers/dossierTest.fixtures.js';
import {
    loadDefaultDataset,
    m002ReferenceDatasetSchema,
    seedM002Reference,
} from '../../seeds/seedM002Reference.js';

let actor;

const buildDataset = ({
    version = 'm002-reference-v1',
    ready = true,
    name = 'Carotte',
} = {}) => ({
    version,
    ready,
    categories: [
        {
            key: 'legumes',
            name: 'Légumes',
        },
    ],
    products: [
        {
            name,
            aliases: [],
            categoryKey: 'legumes',
            varieties: [
                {
                    key: 'nantaise',
                    name: 'Nantaise',
                    aliases: [],
                },
            ],
            characteristics: [
                {
                    key: 'entiere',
                    kind: 'PRESENTATION',
                    name: 'Entière',
                    aliases: [],
                },
            ],
            variants: [
                {
                    name: `${name} nantaise entière`,
                    varietyKey: 'nantaise',
                    characteristicKeys: ['entiere'],
                    processingState: null,
                    conservationType: 'FRAIS',
                    foodRange: 1,
                    referenceUnit: 'KG',
                    yieldPercent: null,
                },
            ],
        },
    ],
});

beforeEach(async () => {
    actor = await createTestUser({
        email: 'seed-m002@example.test',
    });
});

describe('M-002 reference bootstrap', () => {
    it('valide le dataset v7 professionnel sans données commerciales', async () => {
        const dataset = await loadDefaultDataset();
        const parsed = m002ReferenceDatasetSchema.parse(dataset);

        expect(parsed.ready).toBe(true);
        expect(parsed.version).toBe('m002-reference-v7');
        expect(parsed.categories).toHaveLength(16);
        expect(parsed.products).toHaveLength(320);
        expect(
            parsed.products.reduce(
                (total, product) => total + product.variants.length,
                0,
            ),
        ).toBe(368);

        expect(parsed.sources).toEqual(expect.arrayContaining([
            expect.objectContaining({
                name: 'SANS PRIX-IPCOLL-SEC-SEPT 2026.pdf',
            }),
            expect.objectContaining({
                type: 'professional-web-catalog',
            }),
        ]));

        const referenceNames = parsed.products.flatMap(
            (product) => product.variants.map((variant) => variant.name),
        );

        expect(referenceNames).toEqual(expect.arrayContaining([
            'Cumin moulu',
            'Carottes râpées',
            'Crème dessert chocolat',
            'Farine de blé T45 pâtissière',
            'Beurre de tourage 82 % MG',
            'Crème liquide UHT 35 % MG',
            'Pâte pure de pistache',
            'Bun brioché surgelé',
            'Pain pita surgelé',
        ]));

        expect(referenceNames).not.toContain('Moule');
        expect(referenceNames).not.toContain('Banane');

        for (const product of parsed.products) {
            expect(product.variants.length).toBeGreaterThan(0);
            expect(product.varieties).toEqual([]);
            expect(product.characteristics).toEqual([]);
            expect(product).not.toHaveProperty('supplier');
            expect(product).not.toHaveProperty('price');
            expect(product).not.toHaveProperty('packaging');

            for (const variant of product.variants) {
                expect(variant.conservationType)
                    .toEqual(expect.any(String));
                expect(variant.foodRange).toBeNull();
                expect(variant.yieldPercent).toBeNull();
                expect(variant).not.toHaveProperty('usageType');
            }
        }

        const representedCategoryKeys = new Set(
            parsed.products.map(({ categoryKey }) => categoryKey),
        );
        for (const category of parsed.categories) {
            expect(representedCategoryKeys.has(category.key)).toBe(true);
        }

        expect(
            new Set(
                referenceNames.map((name) => normalizeProductText(name)),
            ).size,
        ).toBe(referenceNames.length);
    });

    it('refuse explicitement un dataset non validé', async () => {
        await expect(seedM002Reference({
            dataset: buildDataset({ ready: false }),
            actorId: actor._id,
        })).rejects.toThrow(
            /pas encore validé pour installation/,
        );

        expect(
            await ProductReferenceBootstrapRun.countDocuments(),
        ).toBe(0);
    });

    it('refuse les données commerciales hors périmètre du schéma', () => {
        const dataset = buildDataset();
        dataset.products[0].supplier = 'Sysco';

        expect(
            m002ReferenceDatasetSchema.safeParse(dataset).success,
        ).toBe(false);
    });

    it('installe un dataset versionné puis rejoue la même version sans doublon', async () => {
        const dataset = buildDataset();

        const first = await seedM002Reference({
            dataset,
            actorId: actor._id,
        });
        const second = await seedM002Reference({
            dataset,
            actorId: actor._id,
        });

        expect(first.skipped).toBe(false);
        expect(second.skipped).toBe(true);
        expect(second.datasetHash).toBe(first.datasetHash);

        expect(await ProductCategory.countDocuments()).toBe(1);
        expect(await CanonicalProduct.countDocuments()).toBe(1);
        expect(await ProductVariety.countDocuments()).toBe(1);
        expect(await ProductCharacteristic.countDocuments()).toBe(1);
        expect(await ProductVariant.countDocuments()).toBe(1);
        expect(
            await ProductReferenceBootstrapRun.countDocuments(),
        ).toBe(1);

        const product = await CanonicalProduct.findOne({
            name: 'Carotte',
        }).lean();

        expect(product.status).toBe('ACTIVE');
        expect(product.contributedFromWorkspace).toBeNull();

        const variety = await ProductVariety.findOne({
            canonicalProduct: product._id,
        }).lean();
        const characteristic = await ProductCharacteristic.findOne({
            canonicalProduct: product._id,
        }).lean();
        const variant = await ProductVariant.findOne({
            canonicalProduct: product._id,
        }).lean();

        expect(variety.name).toBe('Nantaise');
        expect(characteristic).toMatchObject({
            kind: 'PRESENTATION',
            name: 'Entière',
        });
        expect(variant.presentation).toBeUndefined();
        expect(variant.variety.toString()).toBe(variety._id.toString());
        expect(variant.characteristics.map(String))
            .toEqual([characteristic._id.toString()]);
        expect(variant.name).toBe('Carotte nantaise entière');
        expect(variant.processingState).toBeNull();
        expect(variant.conservationType).toBe('FRAIS');
        expect(variant.foodRange).toBe(1);
        expect(variant.yieldPercent).toBeNull();
        expect(first.varietyCount).toBe(1);
        expect(first.characteristicCount).toBe(1);
    });

    it('permet à une v2 d enrichir une base ayant déjà reçu la v1', async () => {
        const v1 = buildDataset({ version: 'm002-reference-v1' });
        const v2 = {
            version: 'm002-reference-v2',
            ready: true,
            categories: [
                ...v1.categories,
                {
                    key: 'epicerie',
                    name: 'Épicerie',
                },
            ],
            products: [
                ...v1.products,
                {
                    name: 'Riz',
                    aliases: [],
                    categoryKey: 'epicerie',
                    varieties: [],
                    characteristics: [],
                    variants: [
                        {
                            name: 'Riz',
                            characteristicKeys: [],
                            processingState: null,
                            conservationType: 'CONSERVE',
                            foodRange: 2,
                            referenceUnit: 'KG',
                            yieldPercent: null,
                        },
                    ],
                },
            ],
        };

        const first = await seedM002Reference({
            dataset: v1,
            actorId: actor._id,
        });
        const second = await seedM002Reference({
            dataset: v2,
            actorId: actor._id,
        });
        const replay = await seedM002Reference({
            dataset: v2,
            actorId: actor._id,
        });

        expect(first.skipped).toBe(false);
        expect(second.skipped).toBe(false);
        expect(replay.skipped).toBe(true);
        expect(await ProductReferenceBootstrapRun.countDocuments()).toBe(2);
        expect(await ProductCategory.countDocuments()).toBe(2);
        expect(await CanonicalProduct.countDocuments()).toBe(2);
        expect(await CanonicalProduct.countDocuments({ name: 'Carotte' })).toBe(1);
        expect(await CanonicalProduct.countDocuments({ name: 'Riz' })).toBe(1);
    });

    it('autorise un Produit canonique bootstrap sans variante artificielle', async () => {
        const dataset = buildDataset({ version: 'm002-reference-v3' });
        dataset.products[0].variants = [];

        const result = await seedM002Reference({
            dataset,
            actorId: actor._id,
        });

        expect(result.variantCount).toBe(0);
        expect(await CanonicalProduct.countDocuments()).toBe(1);
        expect(await ProductVariant.countDocuments()).toBe(0);
    });

    it('interdit de modifier silencieusement une version déjà installée', async () => {
        await seedM002Reference({
            dataset: buildDataset(),
            actorId: actor._id,
        });

        await expect(seedM002Reference({
            dataset: buildDataset({ name: 'Panais' }),
            actorId: actor._id,
        })).rejects.toThrow(
            /Créez une nouvelle version de dataset/,
        );

        expect(await CanonicalProduct.countDocuments()).toBe(1);
        expect(
            await CanonicalProduct.exists({ name: 'Panais' }),
        ).toBeNull();
    });
});
