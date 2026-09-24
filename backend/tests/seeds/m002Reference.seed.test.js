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
                    varietyKey: 'nantaise',
                    characteristicKeys: ['entiere'],
                    processingState: null,
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
    it('valide le dataset bêta réel et ses frontières M-002', async () => {
        const dataset = await loadDefaultDataset();
        const parsed = m002ReferenceDatasetSchema.parse(dataset);

        expect(parsed.ready).toBe(true);
        expect(parsed.categories).toEqual([
            { key: 'fruits-legumes', name: 'Fruits et légumes' },
        ]);
        expect(parsed.products.length).toBeGreaterThanOrEqual(30);

        const carotte = parsed.products.find(({ name }) => name === 'Carotte');
        const pomme = parsed.products.find(({ name }) => name === 'Pomme');

        expect(carotte.characteristics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    kind: 'COMMERCIAL_TYPE',
                    name: 'Nantaise',
                }),
                expect.objectContaining({
                    kind: 'PRESENTATION',
                    name: 'En botte avec fanes',
                }),
                expect.objectContaining({
                    kind: 'SIZE_FORMAT',
                    name: 'Mini',
                }),
                expect.objectContaining({
                    kind: 'QUALITY_DESIGNATION',
                    name: 'Carottes des sables',
                }),
            ]),
        );
        expect(pomme.varieties.map(({ name }) => name)).toEqual(
            expect.arrayContaining(['Golden', 'Gala', 'Granny Smith']),
        );

        for (const product of parsed.products) {
            expect(product).not.toHaveProperty('supplier');
            expect(product).not.toHaveProperty('price');
            expect(product).not.toHaveProperty('packaging');
            for (const variant of product.variants) {
                expect(variant.yieldPercent).toBeNull();
            }
        }
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
        expect(variant.processingState).toBe('Produit frais');
        expect(variant.foodRange).toBe(1);
        expect(variant.yieldPercent).toBeNull();
        expect(first.varietyCount).toBe(1);
        expect(first.characteristicCount).toBe(1);
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
