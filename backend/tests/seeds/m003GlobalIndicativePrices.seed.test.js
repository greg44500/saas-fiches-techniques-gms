import '../setup.js';

import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    IndicativePrice,
} from '../../modules/supplierCatalog/supplierPricing.model.js';
import {
    setIndicativePrice,
} from '../../modules/supplierCatalog/supplierPricing.service.js';
import {
    createActiveProductReference,
} from '../helpers/productCatalogTest.fixtures.js';
import {
    createTestUser,
} from '../helpers/dossierTest.fixtures.js';
import {
    loadDefaultGlobalIndicativePriceDataset,
    m003GlobalIndicativePriceDatasetSchema,
    seedM003GlobalIndicativePrices,
} from '../../seeds/seedM003GlobalIndicativePrices.js';
import {
    loadDefaultDataset,
} from '../../seeds/seedM002Reference.js';

let actor;

const buildDataset = ({
    amount = '2.50',
} = {}) => ({
    version: 'm003-global-indicative-v1',
    ready: true,
    source:
        'Référentiel de démonstration — prix repère global',
    currency: 'EUR',
    note:
        'Valeurs fictives destinées aux tests.',
    prices: [{
        reference: 'Carotte Prix repère seed',
        amount,
        unit: 'KG',
    }],
});

beforeEach(async () => {
    actor = await createTestUser({
        email: 'seed-m003-global-price@example.test',
    });

    await createActiveProductReference({
        actorId: actor._id,
        name: 'Carotte Prix repère seed',
        referenceName: 'Carotte Prix repère seed',
        referenceUnit: 'KG',
    });
});

describe('M-003 global indicative price bootstrap', () => {
    it('valide le dataset par défaut sans Fournisseur fictif', async () => {
        const dataset =
            await loadDefaultGlobalIndicativePriceDataset();
        const parsed =
            m003GlobalIndicativePriceDatasetSchema.parse(dataset);

        expect(parsed.ready).toBe(true);
        expect(parsed.version)
            .toBe('m003-global-indicative-v3');
        expect(parsed.currency).toBe('EUR');
        expect(parsed.prices).toHaveLength(362);
        expect(parsed.note).toMatch(/fictives et indicatives/i);
        expect(parsed.note).toMatch(/aucun montant n'est inventé/i);

        for (const price of parsed.prices) {
            expect(Number(price.amount)).toBeGreaterThan(0);
            expect(['KG', 'L', 'UNIT']).toContain(price.unit);
            expect(price).not.toHaveProperty('supplier');
            expect(price).not.toHaveProperty('supplierId');
        }
    });

    it('reste compatible avec le bootstrap M-002 v8 sans inventer de Prix repère pour les nouvelles Références', async () => {
        const [prices, products] = await Promise.all([
            loadDefaultGlobalIndicativePriceDataset(),
            loadDefaultDataset(),
        ]);

        const expected = new Map(
            products.products.flatMap((product) =>
                product.variants.map((variant) => [
                    variant.name,
                    variant.referenceUnit,
                ])),
        );
        const actual = new Map(
            prices.prices.map(({ reference, unit }) => [
                reference,
                unit,
            ]),
        );

        expect(expected.size).toBe(488);
        expect(actual.size).toBe(362);

        for (const [reference, unit] of actual) {
            expect(expected.get(reference)).toBe(unit);
        }

        const unpriced = [...expected.keys()].filter(
            (reference) => !actual.has(reference),
        );

        expect(unpriced).toHaveLength(126);
        expect(unpriced).toEqual(expect.arrayContaining([
            'Œuf entier liquide pasteurisé',
            'Purée de mangue surgelée',
            'Sauce barbecue',
            'Cerneau de noix',
            'Fond de tarte sucré cru surgelé Ø 10 cm',
        ]));
    });

    it('installe uniquement les Prix repères globaux absents', async () => {
        const dataset = buildDataset();

        const first = await seedM003GlobalIndicativePrices({
            dataset,
            actorId: actor._id,
        });
        const second = await seedM003GlobalIndicativePrices({
            dataset,
            actorId: actor._id,
        });

        expect(first).toMatchObject({
            created: 1,
            skippedExisting: 0,
            references: 1,
        });
        expect(second).toMatchObject({
            created: 0,
            skippedExisting: 1,
            references: 1,
        });

        const prices = await IndicativePrice.find({
            workspace: null,
            dossier: null,
            status: 'ACTIVE',
        }).lean();

        expect(prices).toHaveLength(1);
        expect(Number(prices[0].sourceAmount.toString())).toBe(2.5);
    });

    it('ne réécrase jamais une correction du gestionnaire', async () => {
        const dataset = buildDataset();

        await seedM003GlobalIndicativePrices({
            dataset,
            actorId: actor._id,
        });

        const initial = await IndicativePrice.findOne({
            workspace: null,
            dossier: null,
            status: 'ACTIVE',
        }).lean();

        await setIndicativePrice({
            workspaceId: null,
            dossierId: null,
            productVariantId: initial.productVariant,
            actorId: actor._id,
            sourceAmount: '9.99',
            sourceBasis: 'KG',
            source: 'Correction gestionnaire métier',
        });

        const replay = await seedM003GlobalIndicativePrices({
            dataset,
            actorId: actor._id,
        });

        expect(replay).toMatchObject({
            created: 0,
            skippedExisting: 1,
        });

        const active = await IndicativePrice.findOne({
            workspace: null,
            dossier: null,
            status: 'ACTIVE',
        }).lean();

        expect(active.sourceAmount.toString()).toBe('9.99');
        expect(active.source).toBe('Correction gestionnaire métier');

        expect(await IndicativePrice.countDocuments({
            workspace: null,
            dossier: null,
        })).toBe(2);
    });

    it('refuse une unité incohérente avec la Référence Produit', async () => {
        const dataset = buildDataset();
        dataset.prices[0].unit = 'L';

        await expect(
            seedM003GlobalIndicativePrices({
                dataset,
                actorId: actor._id,
            }),
        ).rejects.toThrow(/Unité incohérente/);

        expect(await IndicativePrice.countDocuments()).toBe(0);
    });
});
