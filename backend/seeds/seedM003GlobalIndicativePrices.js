import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import mongoose from 'mongoose';
import { z } from 'zod';

import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    PRODUCT_GOVERNANCE_STATUS,
    PRODUCT_REFERENCE_UNIT,
    PRODUCT_STATUS,
} from '../modules/productCatalog/productCatalog.registry.js';
import {
    normalizeProductText,
} from '../modules/productCatalog/productCatalog.normalization.js';
import {
    ProductVariant,
} from '../modules/productCatalog/productVariant.model.js';
import {
    INDICATIVE_PRICE_STATUS,
} from '../modules/supplierCatalog/supplierCatalog.registry.js';
import {
    IndicativePrice,
} from '../modules/supplierCatalog/supplierPricing.model.js';
import {
    setIndicativePrice,
} from '../modules/supplierCatalog/supplierPricing.service.js';
import {
    resolveBootstrapActorId,
} from './seedM002Reference.js';

const seedPriceSchema = z.strictObject({
    reference: z.string().trim().min(1).max(160),
    amount: z.string().trim().regex(
        /^(?:0*[1-9]\d*)(?:\.\d+)?$|^0*\.\d*[1-9]\d*$/,
        'Montant indicatif invalide.',
    ),
    unit: z.enum(Object.values(PRODUCT_REFERENCE_UNIT)),
});

const m003GlobalIndicativePriceDatasetSchema = z.strictObject({
    version: z.string().trim().regex(
        /^m003-global-indicative-v[1-9][0-9]*$/,
        'Version du bootstrap Prix repère invalide.',
    ),
    ready: z.boolean(),
    source: z.string().trim().min(1).max(300),
    currency: z.literal('EUR'),
    note: z.string().trim().min(1).max(500),
    prices: z.array(seedPriceSchema).min(1),
}).superRefine((dataset, context) => {
    const keys = dataset.prices.map(({ reference }) =>
        normalizeProductText(reference));

    if (new Set(keys).size !== keys.length) {
        context.addIssue({
            code: 'custom',
            path: ['prices'],
            message: 'Les Références Produit du bootstrap doivent être uniques.',
        });
    }
});

const loadDefaultGlobalIndicativePriceDataset = async () => {
    const datasetUrl = new URL(
        './data/m003-global-indicative-prices.v2.json',
        import.meta.url,
    );
    return JSON.parse(await readFile(datasetUrl, 'utf8'));
};

const seedM003GlobalIndicativePrices = async ({
    dataset,
    actorId,
}) => {
    if (!actorId) {
        throw new TypeError(
            'actorId is required to seed global indicative prices.',
        );
    }

    const parsed =
        m003GlobalIndicativePriceDatasetSchema.parse(dataset);

    if (!parsed.ready) {
        throw new Error(
            'Le dataset Prix repère global n’est pas validé pour installation.',
        );
    }

    const result = {
        version: parsed.version,
        created: 0,
        skippedExisting: 0,
        references: parsed.prices.length,
    };

    for (const definition of parsed.prices) {
        const normalizedName =
            normalizeProductText(definition.reference);

        const variant = await ProductVariant.findOne({
            normalizedName,
            identityActive: true,
            status: PRODUCT_STATUS.ACTIVE,
            governanceStatus:
                PRODUCT_GOVERNANCE_STATUS.APPROVED,
        }).lean();

        if (!variant) {
            throw new Error(
                'Référence Produit introuvable pour le Prix repère : '
                + definition.reference,
            );
        }

        if (variant.referenceUnit !== definition.unit) {
            throw new Error(
                'Unité incohérente pour '
                + definition.reference
                + ' : dataset=' + definition.unit
                + ', Produit=' + variant.referenceUnit,
            );
        }

        const existing = await IndicativePrice.exists({
            workspace: null,
            dossier: null,
            productVariant: variant._id,
            status: INDICATIVE_PRICE_STATUS.ACTIVE,
        });

        if (existing) {
            result.skippedExisting += 1;
            continue;
        }

        await setIndicativePrice({
            workspaceId: null,
            dossierId: null,
            productVariantId: variant._id,
            actorId,
            sourceAmount: definition.amount,
            sourceBasis: definition.unit,
            currency: parsed.currency,
            source:
                parsed.source
                + ' · ' + parsed.version,
        });

        result.created += 1;
    }

    return result;
};

const runSeedM003GlobalIndicativePrices = async () => {
    await connectDB(env.MONGODB_URI);

    try {
        const [dataset, actorId] = await Promise.all([
            loadDefaultGlobalIndicativePriceDataset(),
            resolveBootstrapActorId(),
        ]);

        const result =
            await seedM003GlobalIndicativePrices({
                dataset,
                actorId,
            });

        console.log(
            'Bootstrap M-003 Prix repères globaux :',
            result,
        );
    } finally {
        await mongoose.disconnect();
    }
};

const isExecutedDirectly =
    process.argv[1]
    && import.meta.url
        === pathToFileURL(process.argv[1]).href;

if (isExecutedDirectly) {
    runSeedM003GlobalIndicativePrices().catch(
        (error) => {
            console.error(
                'Échec du bootstrap M-003 Prix repères globaux :',
                { message: error.message },
            );
            process.exitCode = 1;
        },
    );
}

export {
    loadDefaultGlobalIndicativePriceDataset,
    m003GlobalIndicativePriceDatasetSchema,
    runSeedM003GlobalIndicativePrices,
    seedM003GlobalIndicativePrices,
};
