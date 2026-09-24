import mongoose from 'mongoose';

import {
    buildSearchGrams,
    buildSearchKeys,
    buildVariantSignature,
    normalizeProductText,
} from '../../modules/productCatalog/productCatalog.normalization.js';
import {
    PRODUCT_CHARACTERISTIC_KIND,
    PRODUCT_REFERENCE_UNIT,
    PRODUCT_STATUS,
} from '../../modules/productCatalog/productCatalog.registry.js';
import {
    resolveProductProcessingState,
} from '../../modules/productCatalog/productVariantSemantics.js';
import { CanonicalProduct } from '../../modules/productCatalog/canonicalProduct.model.js';
import { ProductCategory } from '../../modules/productCatalog/productCategory.model.js';
import { ProductCharacteristic } from '../../modules/productCatalog/productCharacteristic.model.js';
import { ProductVariant } from '../../modules/productCatalog/productVariant.model.js';

const createActiveProductReference = async ({
    actorId = new mongoose.Types.ObjectId(),
    name = 'Carotte',
    aliases = [],
    presentation = null,
    processingState = null,
    foodRange = 1,
    usageType = null,
    referenceUnit = PRODUCT_REFERENCE_UNIT.KG,
    yieldPercent = null,
    categoryName = 'Légumes',
} = {}) => {
    const normalizedKey = normalizeProductText(categoryName);
    const category = await ProductCategory.findOneAndUpdate(
        { normalizedKey },
        {
            $setOnInsert: {
                name: categoryName,
                normalizedKey,
                status: 'ACTIVE',
                createdBy: actorId,
            },
            $set: { updatedBy: actorId },
        },
        {
            upsert: true,
            returnDocument: 'after',
            runValidators: true,
        },
    );

    const searchKeys = buildSearchKeys(name, aliases);
    const product = await CanonicalProduct.create({
        name,
        normalizedName: normalizeProductText(name),
        aliases,
        searchKeys,
        searchGrams: buildSearchGrams(searchKeys),
        category: category._id,
        status: PRODUCT_STATUS.ACTIVE,
        createdBy: actorId,
        updatedBy: actorId,
    });

    const resolvedProcessingState = resolveProductProcessingState({
        foodRange,
        processingState,
    });
    if (!resolvedProcessingState.valid) {
        throw new Error('Fixture Produit invalide : gamme/état incompatibles.');
    }

    const characteristics = [];
    if (presentation) {
        const characteristicSearchKeys = buildSearchKeys(presentation, []);
        const characteristic = await ProductCharacteristic.create({
            canonicalProduct: product._id,
            kind: PRODUCT_CHARACTERISTIC_KIND.PRESENTATION,
            name: presentation,
            normalizedName: normalizeProductText(presentation),
            aliases: [],
            searchKeys: characteristicSearchKeys,
            searchGrams: buildSearchGrams(characteristicSearchKeys),
            status: PRODUCT_STATUS.ACTIVE,
            createdBy: actorId,
            updatedBy: actorId,
        });
        characteristics.push(characteristic);
    }

    const variantInput = {
        varietyId: null,
        characteristics,
        processingState: resolvedProcessingState.value,
        foodRange,
        usageType,
    };
    const variant = await ProductVariant.create({
        canonicalProduct: product._id,
        variety: null,
        characteristics: characteristics.map(({ _id }) => _id),
        processingState: resolvedProcessingState.value,
        normalizedProcessingState: normalizeProductText(
            resolvedProcessingState.value,
        ),
        normalizedSignature: buildVariantSignature(variantInput),
        foodRange,
        usageType,
        referenceUnit,
        yieldPercent,
        status: PRODUCT_STATUS.ACTIVE,
        createdBy: actorId,
        updatedBy: actorId,
    });

    return { category, product, variant };
};

export { createActiveProductReference };
