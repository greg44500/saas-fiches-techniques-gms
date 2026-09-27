import mongoose from 'mongoose';

import { CanonicalProduct } from '../modules/productCatalog/canonicalProduct.model.js';
import {
    buildVariantSignature,
    normalizeProductText,
} from '../modules/productCatalog/productCatalog.normalization.js';
import {
    PRODUCT_CONSERVATION_TYPE,
    PRODUCT_STATUS,
} from '../modules/productCatalog/productCatalog.registry.js';
import { ProductVariant } from '../modules/productCatalog/productVariant.model.js';

const lowerFirst = (value) => {
    const text = String(value ?? '').trim();
    if (!text) return '';
    return text.charAt(0).toLocaleLowerCase('fr') + text.slice(1);
};

const resolveLegacyConservationType = (variant) => {
    if (
        variant.conservationType
        && Object.values(PRODUCT_CONSERVATION_TYPE).includes(
            variant.conservationType,
        )
    ) {
        return variant.conservationType;
    }

    if (variant.foodRange === 1) return PRODUCT_CONSERVATION_TYPE.FRAIS;
    if (variant.foodRange === 2) return PRODUCT_CONSERVATION_TYPE.CONSERVE;
    if (variant.foodRange === 3) return PRODUCT_CONSERVATION_TYPE.SURGELE;

    throw new Error(
        'Migration M-002 impossible : conservation non déterministe pour '
        + `ProductVariant ${variant._id} (ancienne Gamme ${variant.foodRange ?? 'null'}).`,
    );
};

const resolveLegacyReferenceName = (variant) => {
    const existingName = String(variant.name ?? '').trim();
    if (existingName) return existingName;

    const product = variant.canonicalProduct;
    if (!product?._id || !product.name) {
        throw new Error(
            `Migration M-002 impossible : Produit racine absent pour ProductVariant ${variant._id}.`,
        );
    }

    const dimensions = [
        ...(variant.variety ? [{
            kind: 'VARIETY',
            name: variant.variety.name,
        }] : []),
        ...(variant.characteristics ?? []).map((characteristic) => ({
            kind: characteristic.kind,
            name: characteristic.name,
        })),
    ].filter(({ name }) => Boolean(String(name ?? '').trim()));

    if (dimensions.length > 1) {
        throw new Error(
            'Migration M-002 impossible : nom de référence ambigu pour '
            + `ProductVariant ${variant._id}. Une revue métier est requise.`,
        );
    }

    if (dimensions.length === 0) {
        if (variant.foodRange === 1 || variant.foodRange == null) {
            return product.name;
        }

        if (
            variant.foodRange === 3
            && normalizeProductText(product.name) === 'carotte'
        ) {
            return 'Carotte surgelée';
        }

        throw new Error(
            'Migration M-002 impossible : nom de référence non déterministe pour '
            + `ProductVariant ${variant._id}.`,
        );
    }

    const [dimension] = dimensions;
    if (dimension.kind === 'CUT') {
        return `${dimension.name} de ${lowerFirst(product.name)}`;
    }

    const normalizedProduct = normalizeProductText(product.name);
    const normalizedDimension = normalizeProductText(dimension.name);
    if (
        normalizedDimension.startsWith(normalizedProduct)
        || normalizedDimension.startsWith(`${normalizedProduct}s`)
    ) {
        return dimension.name;
    }

    return `${product.name} ${lowerFirst(dimension.name)}`;
};

const migrateM002ProductReferenceContract = async () => (
    mongoose.connection.transaction(async (session) => {
        const variants = await ProductVariant.find({
            identityActive: true,
            status: mongoose.trusted({
                $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
            }),
        })
            .populate('canonicalProduct')
            .populate('variety')
            .populate('characteristics')
            .session(session)
            .lean();

        const seenNames = new Map();
        const operations = [];
        let convertedToRange6 = 0;

        for (const variant of variants) {
            const name = resolveLegacyReferenceName(variant);
            const normalizedName = normalizeProductText(name);
            if (!normalizedName) {
                throw new Error(
                    `Migration M-002 impossible : nom vide pour ProductVariant ${variant._id}.`,
                );
            }

            const previous = seenNames.get(normalizedName);
            if (previous && previous !== variant._id.toString()) {
                throw new Error(
                    'Migration M-002 impossible : collision de noms de références '
                    + `« ${name} » entre ${previous} et ${variant._id}.`,
                );
            }
            seenNames.set(normalizedName, variant._id.toString());

            const conservationType = resolveLegacyConservationType(variant);
            const foodRange = variant.usageType ? 6 : (variant.foodRange ?? null);
            if (variant.usageType) convertedToRange6 += 1;

            const normalizedSignature = buildVariantSignature({
                name,
                varietyId: variant.variety?._id ?? null,
                characteristics: variant.characteristics ?? [],
            });

            operations.push({
                updateOne: {
                    filter: { _id: variant._id },
                    update: {
                        $set: {
                            name,
                            normalizedName,
                            conservationType,
                            foodRange,
                            normalizedSignature,
                        },
                        $unset: {
                            usageType: '',
                        },
                    },
                },
            });
        }

        if (operations.length > 0) {
            await ProductVariant.collection.bulkWrite(
                operations,
                { session, ordered: true },
            );
        }

        // Force le chargement du modèle racine dans la transaction afin de
        // détecter immédiatement un schéma incohérent avant création d'index.
        await CanonicalProduct.exists({}).session(session);

        return {
            scanned: variants.length,
            updated: operations.length,
            convertedToRange6,
        };
    })
);

export {
    migrateM002ProductReferenceContract,
    resolveLegacyConservationType,
    resolveLegacyReferenceName,
};
