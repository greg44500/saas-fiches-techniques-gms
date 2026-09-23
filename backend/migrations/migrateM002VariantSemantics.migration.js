import mongoose from 'mongoose';

import {
    buildVariantSignature,
    normalizeProductText,
} from '../modules/productCatalog/productCatalog.normalization.js';
import {
    ProductVariant,
} from '../modules/productCatalog/productVariant.model.js';
import {
    resolveProductProcessingState,
} from '../modules/productCatalog/productVariantSemantics.js';

const migrateM002VariantSemantics = async () => {
    const documents = await ProductVariant.collection.find({}).toArray();

    const prepared = documents.map((document) => {
        const presentation = document.presentation ?? document.form ?? null;
        const processingState = document.foodRange
            ? resolveProductProcessingState({
                foodRange: document.foodRange,
                processingState: null,
            }).value
            : document.processingState ?? null;

        const normalized = {
            presentation,
            normalizedPresentation: normalizeProductText(presentation),
            processingState,
            normalizedProcessingState: normalizeProductText(processingState),
            foodRange: document.foodRange ?? null,
        };

        return {
            id: document._id,
            canonicalProduct: document.canonicalProduct,
            identityActive: document.identityActive !== false,
            ...normalized,
            normalizedSignature: buildVariantSignature(normalized),
        };
    });

    const activeSignatures = new Map();
    for (const variant of prepared.filter(({ identityActive }) => identityActive)) {
        const key = [
            variant.canonicalProduct.toString(),
            variant.normalizedSignature,
        ].join(':');
        const previous = activeSignatures.get(key);

        if (previous) {
            throw new Error(
                'Migration M-002 impossible : deux déclinaisons actives '
                + 'deviennent identiques avec Présentation/Gamme/État. '
                + `Variantes : ${previous.id.toString()} et ${variant.id.toString()}.`,
            );
        }

        activeSignatures.set(key, variant);
    }

    if (prepared.length === 0) {
        return { matchedCount: 0, modifiedCount: 0 };
    }

    return mongoose.connection.transaction(async (session) => {
        const result = await ProductVariant.collection.bulkWrite(
            prepared.map((variant) => ({
                updateOne: {
                    filter: { _id: variant.id },
                    update: {
                        $set: {
                            presentation: variant.presentation,
                            normalizedPresentation: variant.normalizedPresentation,
                            processingState: variant.processingState,
                            normalizedProcessingState:
                                variant.normalizedProcessingState,
                            normalizedSignature: variant.normalizedSignature,
                        },
                        $unset: {
                            form: '',
                            normalizedForm: '',
                            preservation: '',
                            normalizedPreservation: '',
                        },
                    },
                },
            })),
            { session },
        );

        return {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
        };
    });
};

export { migrateM002VariantSemantics };
