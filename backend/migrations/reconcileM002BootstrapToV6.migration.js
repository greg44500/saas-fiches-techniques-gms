import { readFile } from 'node:fs/promises';

import mongoose from 'mongoose';

import { CanonicalProduct } from '../modules/productCatalog/canonicalProduct.model.js';
import { ProductCategory } from '../modules/productCatalog/productCategory.model.js';
import {
    normalizeProductText,
} from '../modules/productCatalog/productCatalog.normalization.js';
import {
    PRODUCT_CATEGORY_STATUS,
    PRODUCT_STATUS,
    WORKSPACE_PRODUCT_STATUS,
} from '../modules/productCatalog/productCatalog.registry.js';
import { ProductVariant } from '../modules/productCatalog/productVariant.model.js';
import { WorkspaceProduct } from '../modules/productCatalog/workspaceProduct.model.js';

const HISTORICAL_DATASET_URLS = Object.freeze([
    new URL('../seeds/data/m002-reference.v1.json', import.meta.url),
    new URL('../seeds/data/m002-reference.v2.json', import.meta.url),
    new URL('../seeds/data/m002-reference.v3.json', import.meta.url),
    new URL('../seeds/data/m002-reference.v4.json', import.meta.url),
    new URL('../seeds/data/m002-reference.v5.json', import.meta.url),
]);

const TARGET_DATASET_URL = new URL(
    '../seeds/data/m002-reference.v6.json',
    import.meta.url,
);

const readDataset = async (url) => JSON.parse(await readFile(url, 'utf8'));

const loadBootstrapReconciliationContract = async () => {
    const [historicalDatasets, targetDataset] = await Promise.all([
        Promise.all(HISTORICAL_DATASET_URLS.map(readDataset)),
        readDataset(TARGET_DATASET_URL),
    ]);

    const historicalProductNames = new Set();
    const historicalReferenceNames = new Set();
    const historicalCategoryNames = new Set();

    for (const dataset of historicalDatasets) {
        for (const category of dataset.categories ?? []) {
            historicalCategoryNames.add(normalizeProductText(category.name));
        }
        for (const product of dataset.products ?? []) {
            historicalProductNames.add(normalizeProductText(product.name));
            for (const variant of product.variants ?? []) {
                historicalReferenceNames.add(
                    normalizeProductText(variant.name ?? product.name),
                );
            }
        }
    }

    const targetReferenceToProduct = new Map();
    const targetProductNames = new Set();
    const targetCategoryNames = new Set();

    for (const category of targetDataset.categories ?? []) {
        targetCategoryNames.add(normalizeProductText(category.name));
    }

    for (const product of targetDataset.products ?? []) {
        const normalizedProductName = normalizeProductText(product.name);
        targetProductNames.add(normalizedProductName);

        for (const variant of product.variants ?? []) {
            targetReferenceToProduct.set(
                normalizeProductText(variant.name),
                normalizedProductName,
            );
        }
    }

    return {
        historicalProductNames,
        historicalReferenceNames,
        historicalCategoryNames,
        targetReferenceToProduct,
        targetProductNames,
        targetCategoryNames,
    };
};

const archiveWorkspaceFavorites = async ({
    variantId,
    session,
}) => {
    const result = await WorkspaceProduct.updateMany(
        {
            productVariant: variantId,
            status: WORKSPACE_PRODUCT_STATUS.ACTIVE,
        },
        {
            $set: {
                status: WORKSPACE_PRODUCT_STATUS.ARCHIVED,
            },
        },
        { session },
    );

    return result.modifiedCount;
};

const reconcileM002BootstrapToV6 = async () => {
    const contract = await loadBootstrapReconciliationContract();

    return mongoose.connection.transaction(async (session) => {
        const variants = await ProductVariant.find({
            identityActive: true,
            status: mongoose.trusted({
                $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
            }),
        })
            .populate('canonicalProduct')
            .session(session)
            .lean();

        let archivedVariants = 0;
        let archivedFavorites = 0;

        for (const variant of variants) {
            const product = variant.canonicalProduct;
            if (!product?._id) continue;

            const normalizedProductName = normalizeProductText(product.name);
            const normalizedReferenceName = normalizeProductText(
                variant.name ?? '',
            );

            const incompleteReference = (
                !String(variant.name ?? '').trim()
                || !String(variant.normalizedName ?? '').trim()
                || !String(variant.conservationType ?? '').trim()
            );
            const bootstrapOwned = (
                contract.historicalReferenceNames.has(
                    normalizedReferenceName,
                )
                || (
                    incompleteReference
                    && !variant.contributedFromWorkspace
                    && contract.historicalProductNames.has(
                        normalizedProductName,
                    )
                )
            );

            if (!bootstrapOwned) continue;

            const expectedProductName = contract.targetReferenceToProduct.get(
                normalizedReferenceName,
            );
            const keep = (
                expectedProductName
                && expectedProductName === normalizedProductName
            );

            if (keep) continue;

            archivedFavorites += await archiveWorkspaceFavorites({
                variantId: variant._id,
                session,
            });

            await ProductVariant.collection.updateOne(
                { _id: variant._id },
                {
                    $set: {
                        status: PRODUCT_STATUS.ARCHIVED,
                        identityActive: false,
                    },
                },
                { session },
            );
            archivedVariants += 1;
        }

        const products = await CanonicalProduct.find({
            identityActive: true,
        }).session(session).lean();

        let archivedProducts = 0;
        for (const product of products) {
            const normalizedProductName = normalizeProductText(product.name);
            if (!contract.historicalProductNames.has(normalizedProductName)) {
                continue;
            }
            if (contract.targetProductNames.has(normalizedProductName)) {
                continue;
            }

            const activeVariantExists = await ProductVariant.exists({
                canonicalProduct: product._id,
                identityActive: true,
                status: PRODUCT_STATUS.ACTIVE,
            }).session(session);

            if (activeVariantExists) continue;

            await CanonicalProduct.collection.updateOne(
                { _id: product._id },
                {
                    $set: {
                        status: PRODUCT_STATUS.ARCHIVED,
                        identityActive: false,
                    },
                },
                { session },
            );
            archivedProducts += 1;
        }

        const categories = await ProductCategory.find({
            status: PRODUCT_CATEGORY_STATUS.ACTIVE,
        }).session(session).lean();

        let archivedCategories = 0;
        for (const category of categories) {
            const normalizedCategoryName = normalizeProductText(category.name);
            if (
                !contract.historicalCategoryNames.has(normalizedCategoryName)
                || contract.targetCategoryNames.has(normalizedCategoryName)
            ) {
                continue;
            }

            const activeProductExists = await CanonicalProduct.exists({
                category: category._id,
                identityActive: true,
                status: PRODUCT_STATUS.ACTIVE,
            }).session(session);

            if (activeProductExists) continue;

            await ProductCategory.updateOne(
                { _id: category._id },
                {
                    $set: {
                        status: PRODUCT_CATEGORY_STATUS.ARCHIVED,
                    },
                },
                { session },
            );
            archivedCategories += 1;
        }

        return {
            archivedVariants,
            archivedProducts,
            archivedCategories,
            archivedFavorites,
        };
    });
};

export {
    loadBootstrapReconciliationContract,
    reconcileM002BootstrapToV6,
};
