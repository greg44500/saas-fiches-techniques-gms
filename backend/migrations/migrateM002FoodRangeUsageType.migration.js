import { readFile } from 'node:fs/promises';

import mongoose from 'mongoose';

import {
    buildVariantSignature,
    normalizeProductText,
} from '../modules/productCatalog/productCatalog.normalization.js';
import {
    PRODUCT_STATUS,
    PRODUCT_USAGE_TYPE,
} from '../modules/productCatalog/productCatalog.registry.js';
import {
    CanonicalProduct,
} from '../modules/productCatalog/canonicalProduct.model.js';
import {
    ProductCharacteristic,
} from '../modules/productCatalog/productCharacteristic.model.js';
import {
    ProductReferenceBootstrapRun,
} from '../modules/productCatalog/productReferenceBootstrapRun.model.js';
import {
    ProductVariant,
} from '../modules/productCatalog/productVariant.model.js';
import {
    ProductVariety,
} from '../modules/productCatalog/productVariety.model.js';
import {
    WorkspaceProduct,
} from '../modules/productCatalog/workspaceProduct.model.js';

const RETIRED_RANGE6_SIGNATURE_PREFIX = '__m002_retired_range6__';

const legacyRange6Fingerprint = ({
    productName,
    varietyName = null,
    characteristics = [],
    referenceUnit,
    yieldPercent = null,
}) => [
    normalizeProductText(productName),
    normalizeProductText(varietyName) || '_',
    [...characteristics]
        .map(({ kind, name }) => (
            `${kind}:${normalizeProductText(name)}`
        ))
        .sort()
        .join(',') || '_',
    referenceUnit ?? '_',
    yieldPercent ?? '_',
].join('|');

const loadV2Range6Fingerprints = async () => {
    const datasetUrl = new URL(
        '../seeds/data/m002-reference.v2.json',
        import.meta.url,
    );
    const dataset = JSON.parse(await readFile(datasetUrl, 'utf8'));
    const fingerprints = new Set();

    for (const product of dataset.products ?? []) {
        const varietyByKey = new Map(
            (product.varieties ?? []).map((definition) => [
                normalizeProductText(definition.key),
                definition,
            ]),
        );
        const characteristicByKey = new Map(
            (product.characteristics ?? []).map((definition) => [
                normalizeProductText(definition.key),
                definition,
            ]),
        );

        for (const variant of product.variants ?? []) {
            if (variant.foodRange !== 6) continue;

            fingerprints.add(legacyRange6Fingerprint({
                productName: product.name,
                varietyName: variant.varietyKey
                    ? varietyByKey.get(
                        normalizeProductText(variant.varietyKey),
                    )?.name ?? null
                    : null,
                characteristics: (variant.characteristicKeys ?? [])
                    .map((key) => characteristicByKey.get(
                        normalizeProductText(key),
                    ))
                    .filter(Boolean),
                referenceUnit: variant.referenceUnit,
                yieldPercent: variant.yieldPercent ?? null,
            }));
        }
    }

    return fingerprints;
};

const isRetiredLegacyRange6 = (document) => (
    document.identityActive === false
    && document.status === PRODUCT_STATUS.ARCHIVED
    && document.foodRange == null
    && document.usageType == null
    && String(document.normalizedSignature ?? '')
        .startsWith(RETIRED_RANGE6_SIGNATURE_PREFIX)
);

const migrateM002FoodRangeUsageType = async () => (
    mongoose.connection.transaction(async (session) => {
        const documents = await ProductVariant.collection
            .find({
                $or: [
                    { usageType: { $exists: true } },
                    {
                        foodRange: 6,
                        $or: [
                            { name: { $exists: false } },
                            { name: null },
                            { name: '' },
                            { conservationType: { $exists: false } },
                            { conservationType: null },
                            { conservationType: '' },
                        ],
                    },
                ],
            }, { session })
            .toArray();

        if (documents.length === 0) {
            return {
                matchedCount: 0,
                modifiedCount: 0,
                retiredLegacyRange6: 0,
                archivedWorkspaceFavorites: 0,
            };
        }

        const activeDocuments = documents.filter(
            (document) => !isRetiredLegacyRange6(document),
        );
        const productIds = [
            ...new Set(activeDocuments.map(
                ({ canonicalProduct }) => canonicalProduct.toString(),
            )),
        ];
        const varietyIds = [
            ...new Set(activeDocuments
                .map(({ variety }) => variety?.toString())
                .filter(Boolean)),
        ];
        const characteristicIds = [
            ...new Set(activeDocuments.flatMap(
                ({ characteristics = [] }) => characteristics.map(String),
            )),
        ];

        const [products, varieties, characteristics] = await Promise.all([
            productIds.length > 0
                ? CanonicalProduct.find({
                    _id: mongoose.trusted({
                        $in: productIds.map(
                            (id) => new mongoose.Types.ObjectId(id),
                        ),
                    }),
                }).session(session)
                : [],
            varietyIds.length > 0
                ? ProductVariety.find({
                    _id: mongoose.trusted({
                        $in: varietyIds.map(
                            (id) => new mongoose.Types.ObjectId(id),
                        ),
                    }),
                }).session(session)
                : [],
            characteristicIds.length > 0
                ? ProductCharacteristic.find({
                    _id: mongoose.trusted({
                        $in: characteristicIds.map(
                            (id) => new mongoose.Types.ObjectId(id),
                        ),
                    }),
                }).session(session)
                : [],
        ]);

        const productById = new Map(products.map(
            (product) => [product._id.toString(), product],
        ));
        const varietyById = new Map(varieties.map(
            (variety) => [variety._id.toString(), variety],
        ));
        const characteristicById = new Map(characteristics.map(
            (characteristic) => [
                characteristic._id.toString(),
                characteristic,
            ],
        ));

        const range6Documents = activeDocuments.filter(
            ({ foodRange, name, conservationType }) => (
                foodRange === 6
                && (
                    !String(name ?? '').trim()
                    || !String(conservationType ?? '').trim()
                )
            ),
        );
        const legacyRange6Ids = new Set(
            range6Documents.map(({ _id }) => _id.toString()),
        );
        let v2Fingerprints = null;

        if (range6Documents.length > 0) {
            const v2Run = await ProductReferenceBootstrapRun.exists({
                version: 'm002-reference-v2',
            }).session(session);

            if (!v2Run) {
                throw new Error(
                    'Migration M-002 bloquée : une ancienne Gamme 6 existe '
                    + 'sans preuve du bootstrap v2. Revue explicite requise.',
                );
            }

            v2Fingerprints = await loadV2Range6Fingerprints();
        }

        const prepared = [];
        let retiredLegacyRange6 = 0;
        let archivedWorkspaceFavorites = 0;

        for (const document of activeDocuments) {
            const product = productById.get(
                document.canonicalProduct.toString(),
            );
            if (!product) {
                throw new Error(
                    'Migration M-002 impossible : Produit parent introuvable '
                    + `pour ${document._id.toString()}.`,
                );
            }

            const resolvedCharacteristics = (
                document.characteristics ?? []
            )
                .map((id) => characteristicById.get(id.toString()))
                .filter(Boolean);
            if (
                resolvedCharacteristics.length
                !== (document.characteristics ?? []).length
            ) {
                throw new Error(
                    'Migration M-002 impossible : Caractéristique introuvable '
                    + `pour ${document._id.toString()}.`,
                );
            }

            if (legacyRange6Ids.has(document._id.toString())) {
                const fingerprint = legacyRange6Fingerprint({
                    productName: product.name,
                    varietyName: document.variety
                        ? varietyById.get(
                            document.variety.toString(),
                        )?.name ?? null
                        : null,
                    characteristics: resolvedCharacteristics,
                    referenceUnit: document.referenceUnit,
                    yieldPercent: document.yieldPercent ?? null,
                });

                if (!v2Fingerprints.has(fingerprint)) {
                    throw new Error(
                        'Migration M-002 bloquée : une déclinaison Gamme 6 '
                        + 'ne correspond pas exactement au bootstrap v2. '
                        + `Revue explicite requise pour ${document._id.toString()}.`,
                    );
                }

                const favoriteResult = await WorkspaceProduct.updateMany(
                    {
                        productVariant: document._id,
                        status: 'ACTIVE',
                    },
                    {
                        $set: {
                            status: 'ARCHIVED',
                        },
                    },
                    { session },
                );
                archivedWorkspaceFavorites += favoriteResult.modifiedCount;

                prepared.push({
                    id: document._id,
                    retire: true,
                    normalizedSignature:
                        RETIRED_RANGE6_SIGNATURE_PREFIX
                        + document._id.toString(),
                    original: document,
                });
                retiredLegacyRange6 += 1;
                continue;
            }

            const usageType = document.usageType ?? null;
            if (
                usageType !== null
                && !Object.values(PRODUCT_USAGE_TYPE).includes(usageType)
            ) {
                throw new Error(
                    'Migration M-002 bloquée : classification PAI / PAE '
                    + `invalide pour ${document._id.toString()}.`,
                );
            }

            const orderedCharacteristics = [
                ...resolvedCharacteristics,
            ].sort(
                (left, right) => (
                    left.kind.localeCompare(right.kind)
                    || left._id.toString().localeCompare(
                        right._id.toString(),
                    )
                ),
            );
            const normalizedSignature = buildVariantSignature({
                varietyId: document.variety ?? null,
                characteristics: orderedCharacteristics,
                foodRange: document.foodRange ?? null,
                processingState: document.processingState ?? null,
                usageType,
            });

            prepared.push({
                id: document._id,
                retire: false,
                canonicalProduct: document.canonicalProduct,
                identityActive: document.identityActive !== false,
                usageType,
                normalizedSignature,
                original: document,
            });
        }

        const activeSignatures = new Map();
        for (const variant of prepared.filter(
            ({ retire, identityActive }) => !retire && identityActive,
        )) {
            const key = [
                variant.canonicalProduct.toString(),
                variant.normalizedSignature,
            ].join(':');
            const previous = activeSignatures.get(key);
            if (previous) {
                throw new Error(
                    'Migration M-002 impossible : deux déclinaisons actives '
                    + 'deviennent identiques après ajout de usageType. '
                    + `Variantes : ${previous.id.toString()} et `
                    + `${variant.id.toString()}.`,
                );
            }
            activeSignatures.set(key, variant);
        }

        const variantsToMigrate = prepared.filter((variant) => (
            variant.retire
            || !Object.prototype.hasOwnProperty.call(
                variant.original,
                'usageType',
            )
            || variant.original.normalizedSignature
                !== variant.normalizedSignature
        ));

        if (variantsToMigrate.length === 0) {
            return {
                matchedCount: 0,
                modifiedCount: 0,
                retiredLegacyRange6: 0,
                archivedWorkspaceFavorites: 0,
            };
        }

        await ProductVariant.collection.bulkWrite(
            variantsToMigrate.map((variant) => ({
                updateOne: {
                    filter: { _id: variant.id },
                    update: {
                        $set: {
                            normalizedSignature:
                                '__m002_usage_type__'
                                + variant.id.toString(),
                        },
                    },
                },
            })),
            { session },
        );

        const result = await ProductVariant.collection.bulkWrite(
            variantsToMigrate.map((variant) => ({
                updateOne: {
                    filter: { _id: variant.id },
                    update: variant.retire
                        ? {
                            $set: {
                                status: PRODUCT_STATUS.ARCHIVED,
                                identityActive: false,
                                foodRange: null,
                                processingState: null,
                                normalizedProcessingState: '',
                                usageType: null,
                                normalizedSignature:
                                    variant.normalizedSignature,
                            },
                        }
                        : {
                            $set: {
                                usageType: variant.usageType,
                                normalizedSignature:
                                    variant.normalizedSignature,
                            },
                        },
                },
            })),
            { session },
        );

        return {
            matchedCount: variantsToMigrate.length,
            modifiedCount: result.modifiedCount,
            retiredLegacyRange6,
            archivedWorkspaceFavorites,
        };
    })
);

export {
    legacyRange6Fingerprint,
    migrateM002FoodRangeUsageType,
};
