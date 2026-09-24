import mongoose from 'mongoose';

import {
    buildSearchGrams,
    buildSearchKeys,
    buildVariantSignature,
    normalizeProductText,
} from '../../modules/productCatalog/productCatalog.normalization.js';
import {
    PRODUCT_CHARACTERISTIC_KIND,
    PRODUCT_CONSERVATION_TYPE,
    PRODUCT_REFERENCE_UNIT,
    PRODUCT_STATUS,
} from '../../modules/productCatalog/productCatalog.registry.js';
import { CanonicalProduct } from '../../modules/productCatalog/canonicalProduct.model.js';
import { ProductCategory } from '../../modules/productCatalog/productCategory.model.js';
import { ProductCharacteristic } from '../../modules/productCatalog/productCharacteristic.model.js';
import { ProductVariant } from '../../modules/productCatalog/productVariant.model.js';

const createActiveProductReference = async ({
    actorId = new mongoose.Types.ObjectId(),
    name = 'Carotte',
    referenceName = name,
    aliases = [],
    presentation = null,
    processingState = null,
    conservationType = PRODUCT_CONSERVATION_TYPE.FRAIS,
    foodRange = 1,
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

    const normalizedReferenceName = normalizeProductText(referenceName);
    const variant = await ProductVariant.create({
        canonicalProduct: product._id,
        name: referenceName,
        normalizedName: normalizedReferenceName,
        variety: null,
        characteristics: characteristics.map(({ _id }) => _id),
        processingState,
        normalizedProcessingState: normalizeProductText(processingState),
        normalizedSignature: buildVariantSignature({
            name: referenceName,
            varietyId: null,
            characteristics,
        }),
        conservationType,
        foodRange,
        referenceUnit,
        yieldPercent,
        status: PRODUCT_STATUS.ACTIVE,
        createdBy: actorId,
        updatedBy: actorId,
    });

    return { category, product, variant };
};

export { createActiveProductReference };
