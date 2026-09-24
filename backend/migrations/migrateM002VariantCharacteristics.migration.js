import mongoose from 'mongoose';

import {
    buildSearchGrams,
    buildSearchKeys,
    buildVariantSignature,
    normalizeProductText,
} from '../modules/productCatalog/productCatalog.normalization.js';
import {
    PRODUCT_CHARACTERISTIC_KIND,
    PRODUCT_STATUS,
} from '../modules/productCatalog/productCatalog.registry.js';
import {
    ProductCharacteristic,
} from '../modules/productCatalog/productCharacteristic.model.js';
import {
    ProductVariant,
} from '../modules/productCatalog/productVariant.model.js';

const migrateM002VariantCharacteristics = async () => (
    mongoose.connection.transaction(async (session) => {
        const documents = await ProductVariant.collection
            .find({}, { session })
            .toArray();

        if (documents.length === 0) {
            return {
                matchedCount: 0,
                modifiedCount: 0,
                createdCharacteristics: 0,
            };
        }

        const referencedIds = [
            ...new Set(
                documents.flatMap((document) => (
                    document.characteristics ?? []
                ).map((value) => value.toString())),
            ),
        ];
        const referencedCharacteristics = referencedIds.length > 0
            ? await ProductCharacteristic.find({
                _id: mongoose.trusted({
                    $in: referencedIds.map(
                        (value) => new mongoose.Types.ObjectId(value),
                    ),
                }),
            }).session(session)
            : [];
        const characteristicById = new Map(
            referencedCharacteristics.map((characteristic) => [
                characteristic._id.toString(),
                characteristic,
            ]),
        );
        const presentationCache = new Map();
        let createdCharacteristics = 0;

        const resolvePresentation = async (document) => {
            const presentation = document.presentation ?? document.form ?? null;
            const normalizedName = normalizeProductText(presentation);
            if (!normalizedName) return null;

            const cacheKey = [
                document.canonicalProduct.toString(),
                normalizedName,
            ].join(':');
            if (presentationCache.has(cacheKey)) {
                return presentationCache.get(cacheKey);
            }

            let characteristic = await ProductCharacteristic.findOne({
                canonicalProduct: document.canonicalProduct,
                kind: PRODUCT_CHARACTERISTIC_KIND.PRESENTATION,
                normalizedName,
                identityActive: true,
            }).session(session);

            if (!characteristic) {
                const actorId = document.createdBy ?? document.updatedBy;
                if (!actorId) {
                    throw new Error(
                        'Migration M-002 impossible : une déclinaison historique '
                        + `${document._id.toString()} ne possède aucun auteur pour créer sa Présentation.`,
                    );
                }
                const searchKeys = buildSearchKeys(presentation, []);
                [characteristic] = await ProductCharacteristic.create([
                    {
                        canonicalProduct: document.canonicalProduct,
                        kind: PRODUCT_CHARACTERISTIC_KIND.PRESENTATION,
                        name: presentation,
                        normalizedName,
                        aliases: [],
                        searchKeys,
                        searchGrams: buildSearchGrams(searchKeys),
                        status: PRODUCT_STATUS.ACTIVE,
                        contributedFromWorkspace:
                            document.contributedFromWorkspace ?? null,
                        createdBy: actorId,
                        updatedBy: document.updatedBy ?? actorId,
                    },
                ], { session });
                createdCharacteristics += 1;
            }

            presentationCache.set(cacheKey, characteristic);
            characteristicById.set(characteristic._id.toString(), characteristic);
            return characteristic;
        };

        const prepared = [];
        for (const document of documents) {
            const characteristics = (document.characteristics ?? [])
                .map((value) => characteristicById.get(value.toString()))
                .filter(Boolean);
            const existingKinds = new Map(
                characteristics.map((characteristic) => [
                    characteristic.kind,
                    characteristic,
                ]),
            );
            const presentation = await resolvePresentation(document);

            if (presentation) {
                const previous = existingKinds.get(
                    PRODUCT_CHARACTERISTIC_KIND.PRESENTATION,
                );
                if (
                    previous
                    && previous._id.toString() !== presentation._id.toString()
                ) {
                    throw new Error(
                        'Migration M-002 impossible : une déclinaison possède '
                        + 'deux Présentations différentes. Variante : '
                        + document._id.toString(),
                    );
                }
                existingKinds.set(
                    PRODUCT_CHARACTERISTIC_KIND.PRESENTATION,
                    presentation,
                );
            }

            const orderedCharacteristics = [...existingKinds.values()].sort(
                (left, right) => (
                    left.kind.localeCompare(right.kind)
                    || left._id.toString().localeCompare(right._id.toString())
                ),
            );
            const normalizedSignature = buildVariantSignature({
                varietyId: document.variety ?? null,
                characteristics: orderedCharacteristics,
                foodRange: document.foodRange ?? null,
                processingState: document.processingState ?? null,
            });

            prepared.push({
                id: document._id,
                canonicalProduct: document.canonicalProduct,
                identityActive: document.identityActive !== false,
                variety: document.variety ?? null,
                characteristics: orderedCharacteristics.map(
                    ({ _id }) => _id,
                ),
                normalizedSignature,
                original: document,
            });
        }

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
                    + 'deviennent identiques avec Variété/Caractéristiques/Gamme/État. '
                    + `Variantes : ${previous.id.toString()} et ${variant.id.toString()}.`,
                );
            }
            activeSignatures.set(key, variant);
        }

        const variantsToMigrate = prepared.filter((variant) => {
            const currentIds = (variant.original.characteristics ?? [])
                .map((value) => value.toString());
            const targetIds = variant.characteristics.map((value) => value.toString());

            return (
                !Object.prototype.hasOwnProperty.call(variant.original, 'variety')
                || currentIds.join('|') !== targetIds.join('|')
                || variant.original.normalizedSignature
                    !== variant.normalizedSignature
                || Object.prototype.hasOwnProperty.call(
                    variant.original,
                    'presentation',
                )
                || Object.prototype.hasOwnProperty.call(
                    variant.original,
                    'normalizedPresentation',
                )
                || Object.prototype.hasOwnProperty.call(variant.original, 'form')
                || Object.prototype.hasOwnProperty.call(
                    variant.original,
                    'normalizedForm',
                )
            );
        });

        if (variantsToMigrate.length === 0) {
            return {
                matchedCount: 0,
                modifiedCount: 0,
                createdCharacteristics,
            };
        }

        await ProductVariant.collection.bulkWrite(
            variantsToMigrate.map((variant) => ({
                updateOne: {
                    filter: { _id: variant.id },
                    update: {
                        $set: {
                            normalizedSignature:
                                '__m002_variant_characteristics__'
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
                    update: {
                        $set: {
                            variety: variant.variety,
                            characteristics: variant.characteristics,
                            normalizedSignature: variant.normalizedSignature,
                        },
                        $unset: {
                            presentation: '',
                            normalizedPresentation: '',
                            form: '',
                            normalizedForm: '',
                        },
                    },
                },
            })),
            { session },
        );

        return {
            matchedCount: variantsToMigrate.length,
            modifiedCount: result.modifiedCount,
            createdCharacteristics,
        };
    })
);

export { migrateM002VariantCharacteristics };
