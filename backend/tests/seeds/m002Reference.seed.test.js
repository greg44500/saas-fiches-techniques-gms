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
    ProductVariant,
} from '../../modules/productCatalog/productVariant.model.js';
import {
    createTestUser,
} from '../helpers/dossierTest.fixtures.js';
import {
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
            aliases: ['Carottes'],
            categoryKey: 'legumes',
            variants: [
                {
                    presentation: 'Entière',
                    processingState: null,
                    foodRange: 1,
                    referenceUnit: 'KG',
                    yieldPercent: 85,
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
        expect(await ProductVariant.countDocuments()).toBe(1);
        expect(
            await ProductReferenceBootstrapRun.countDocuments(),
        ).toBe(1);

        const product = await CanonicalProduct.findOne({
            name: 'Carotte',
        }).lean();

        expect(product.status).toBe('ACTIVE');
        expect(product.contributedFromWorkspace).toBeNull();

        const variant = await ProductVariant.findOne({
            canonicalProduct: product._id,
        }).lean();
        expect(variant.presentation).toBe('Entière');
        expect(variant.processingState).toBe('Produit frais');
        expect(variant.foodRange).toBe(1);
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
