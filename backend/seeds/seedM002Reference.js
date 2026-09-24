import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import mongoose from 'mongoose';
import { z } from 'zod';

import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { PLATFORM_ROLE } from '../constants/platformRoles.constants.js';
import {
    PLATFORM_TEAM_MEMBER_STATUS,
} from '../constants/platformTeam.constants.js';
import { USER_STATUS } from '../constants/userStatus.constants.js';
import { CanonicalProduct } from '../modules/productCatalog/canonicalProduct.model.js';
import { ProductCategory } from '../modules/productCatalog/productCategory.model.js';
import { ProductCharacteristic } from '../modules/productCatalog/productCharacteristic.model.js';
import {
    buildSearchGrams,
    buildSearchKeys,
    buildVariantSignature,
    normalizeProductText,
} from '../modules/productCatalog/productCatalog.normalization.js';
import {
    PRODUCT_CHARACTERISTIC_KIND,
    PRODUCT_CONSERVATION_TYPE,
    PRODUCT_FOOD_RANGES,
    PRODUCT_REFERENCE_UNIT,
    PRODUCT_STATUS,
} from '../modules/productCatalog/productCatalog.registry.js';
import {
    ProductReferenceBootstrapRun,
} from '../modules/productCatalog/productReferenceBootstrapRun.model.js';
import { ProductVariant } from '../modules/productCatalog/productVariant.model.js';
import { ProductVariety } from '../modules/productCatalog/productVariety.model.js';
import {
    PlatformTeamMember,
} from '../modules/platformTeam/platformTeamMember.model.js';
import { User } from '../modules/users/user.model.js';

const nullableText = (max) => z.string().trim().min(1).max(max).nullable();

const seedVariantSchema = z.strictObject({
    name: z.string().trim().min(1).max(160),
    varietyKey: z.string().trim().min(1).max(120).nullable().optional().default(null),
    characteristicKeys: z.array(z.string().trim().min(1).max(120))
        .max(5)
        .optional()
        .default([]),
    processingState: nullableText(80).optional().default(null),
    conservationType: z.enum(Object.values(PRODUCT_CONSERVATION_TYPE)),
    foodRange: z.number().int().refine(
        (value) => PRODUCT_FOOD_RANGES.includes(value),
        { message: 'Gamme bootstrap invalide.' },
    ).nullable().optional().default(null),
    referenceUnit: z.enum(Object.values(PRODUCT_REFERENCE_UNIT)),
    yieldPercent: z.number().positive().max(100).nullable().optional().default(null),
})

const seedCategorySchema = z.strictObject({
    key: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(120),
});

const seedDimensionSchema = z.strictObject({
    key: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(120),
    aliases: z.array(z.string().trim().min(1).max(120))
        .max(20)
        .optional()
        .default([]),
});

const seedCharacteristicSchema = seedDimensionSchema.extend({
    kind: z.enum(Object.values(PRODUCT_CHARACTERISTIC_KIND)),
});

const seedProductSchema = z.strictObject({
    name: z.string().trim().min(1).max(120),
    aliases: z.array(z.string().trim().min(1).max(120))
        .max(20)
        .optional()
        .default([]),
    categoryKey: z.string().trim().min(1).max(120),
    varieties: z.array(seedDimensionSchema).optional().default([]),
    characteristics: z.array(seedCharacteristicSchema).optional().default([]),
    variants: z.array(seedVariantSchema).optional().default([]),
}).superRefine((product, context) => {
    const varietyKeys = product.varieties.map(({ key }) => normalizeProductText(key));
    if (new Set(varietyKeys).size !== varietyKeys.length) {
        context.addIssue({
            code: 'custom',
            path: ['varieties'],
            message: 'Les clés de Variétés doivent être uniques dans un Produit.',
        });
    }

    const characteristicByKey = new Map();
    product.characteristics.forEach((characteristic, index) => {
        const key = normalizeProductText(characteristic.key);
        if (characteristicByKey.has(key)) {
            context.addIssue({
                code: 'custom',
                path: ['characteristics', index, 'key'],
                message: 'Les clés de Caractéristiques doivent être uniques dans un Produit.',
            });
        }
        characteristicByKey.set(key, characteristic);
    });

    product.variants.forEach((variant, index) => {
        if (
            variant.varietyKey
            && !varietyKeys.includes(normalizeProductText(variant.varietyKey))
        ) {
            context.addIssue({
                code: 'custom',
                path: ['variants', index, 'varietyKey'],
                message: 'La Variété de la référence est inconnue.',
            });
        }

        const resolved = variant.characteristicKeys.map(
            (key) => characteristicByKey.get(normalizeProductText(key)),
        );
        if (resolved.some((value) => !value)) {
            context.addIssue({
                code: 'custom',
                path: ['variants', index, 'characteristicKeys'],
                message: 'Une Caractéristique de la référence est inconnue.',
            });
            return;
        }

        const kinds = resolved.map(({ kind }) => kind);
        if (new Set(kinds).size !== kinds.length) {
            context.addIssue({
                code: 'custom',
                path: ['variants', index, 'characteristicKeys'],
                message: 'Une référence ne peut avoir deux Caractéristiques du même type.',
            });
        }
    });
});

const m002ReferenceDatasetSchema = z.strictObject({
    version: z.string().trim().regex(
        /^m002-reference-v[1-9][0-9]*$/,
        'Version de bootstrap M-002 invalide.',
    ),
    ready: z.boolean(),
    categories: z.array(seedCategorySchema),
    products: z.array(seedProductSchema),
}).superRefine((dataset, context) => {
    const categoryKeys = dataset.categories.map(({ key }) =>
        normalizeProductText(key));
    if (new Set(categoryKeys).size !== categoryKeys.length) {
        context.addIssue({
            code: 'custom',
            path: ['categories'],
            message: 'Les clés de catégories doivent être uniques.',
        });
    }

    const productKeys = dataset.products.map(({ name }) =>
        normalizeProductText(name));
    if (new Set(productKeys).size !== productKeys.length) {
        context.addIssue({
            code: 'custom',
            path: ['products'],
            message: 'Les noms de Produits bootstrap doivent être uniques.',
        });
    }
});

const stableStringify = (value) => {
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }

    if (value && typeof value === 'object') {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
            .join(',')}}`;
    }

    return JSON.stringify(value);
};

const hashDataset = (dataset) => createHash('sha256')
    .update(stableStringify(dataset))
    .digest('hex');

const resolveBootstrapActorId = async () => {
    const founder = await PlatformTeamMember.findOne({
        isFounder: true,
        status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
    })
        .populate({
            path: 'user',
            match: { status: USER_STATUS.ACTIVE },
            select: '_id',
        })
        .lean();

    if (founder?.user?._id) return founder.user._id;

    const legacySuperAdmin = await User.findOne({
        platformRole: PLATFORM_ROLE.SUPER_ADMIN,
        status: USER_STATUS.ACTIVE,
    })
        .select('_id')
        .lean();

    if (legacySuperAdmin?._id) return legacySuperAdmin._id;

    throw new Error(
        'Aucun Fondateur ou Super administrateur actif ne peut tracer le bootstrap M-002.',
    );
};

const upsertSeedCategory = async ({ definition, actorId, session }) => {
    const normalizedKey = normalizeProductText(definition.name);
    const category = await ProductCategory.findOne({ normalizedKey }).session(session);

    if (category) {
        category.name = definition.name;
        category.status = 'ACTIVE';
        category.updatedBy = actorId;
        await category.save({ session });
        return category;
    }

    const [created] = await ProductCategory.create([{
        name: definition.name,
        normalizedKey,
        status: 'ACTIVE',
        createdBy: actorId,
        updatedBy: actorId,
    }], { session });

    return created;
};

const upsertSeedVariety = async ({
    productId,
    definition,
    actorId,
    session,
}) => {
    const normalizedName = normalizeProductText(definition.name);
    const searchKeys = buildSearchKeys(definition.name, definition.aliases);
    let variety = await ProductVariety.findOne({
        canonicalProduct: productId,
        normalizedName,
        identityActive: true,
    }).session(session);

    const data = {
        name: definition.name,
        normalizedName,
        aliases: definition.aliases,
        searchKeys,
        searchGrams: buildSearchGrams(searchKeys),
        status: PRODUCT_STATUS.ACTIVE,
        identityActive: true,
        updatedBy: actorId,
    };

    if (!variety) {
        [variety] = await ProductVariety.create([{
            canonicalProduct: productId,
            ...data,
            createdBy: actorId,
        }], { session });
    } else {
        Object.assign(variety, data);
        await variety.save({ session });
    }

    return variety;
};

const upsertSeedCharacteristic = async ({
    productId,
    definition,
    actorId,
    session,
}) => {
    const normalizedName = normalizeProductText(definition.name);
    const searchKeys = buildSearchKeys(definition.name, definition.aliases);
    let characteristic = await ProductCharacteristic.findOne({
        canonicalProduct: productId,
        kind: definition.kind,
        normalizedName,
        identityActive: true,
    }).session(session);

    const data = {
        name: definition.name,
        normalizedName,
        aliases: definition.aliases,
        searchKeys,
        searchGrams: buildSearchGrams(searchKeys),
        status: PRODUCT_STATUS.ACTIVE,
        identityActive: true,
        updatedBy: actorId,
    };

    if (!characteristic) {
        [characteristic] = await ProductCharacteristic.create([{
            canonicalProduct: productId,
            kind: definition.kind,
            ...data,
            createdBy: actorId,
        }], { session });
    } else {
        Object.assign(characteristic, data);
        await characteristic.save({ session });
    }

    return characteristic;
};

const upsertSeedProduct = async ({
    definition,
    categoryId,
    actorId,
    session,
}) => {
    const searchKeys = buildSearchKeys(definition.name, definition.aliases);

    let product = await CanonicalProduct.findOne({
        identityActive: true,
        searchKeys: mongoose.trusted({ $in: searchKeys }),
    }).session(session);

    if (!product) {
        [product] = await CanonicalProduct.create([{
            name: definition.name,
            normalizedName: normalizeProductText(definition.name),
            aliases: definition.aliases,
            searchKeys,
            searchGrams: buildSearchGrams(searchKeys),
            category: categoryId,
            status: PRODUCT_STATUS.ACTIVE,
            identityActive: true,
            createdBy: actorId,
            updatedBy: actorId,
        }], { session });
    } else {
        product.name = definition.name;
        product.normalizedName = normalizeProductText(definition.name);
        product.aliases = definition.aliases;
        product.searchKeys = searchKeys;
        product.searchGrams = buildSearchGrams(searchKeys);
        product.category = categoryId;
        product.status = PRODUCT_STATUS.ACTIVE;
        product.identityActive = true;
        product.rejectionReason = null;
        product.rejectionComment = null;
        product.replacementProduct = null;
        product.replacementVariant = null;
        product.updatedBy = actorId;
        await product.save({ session });
    }

    const varietyByKey = new Map();
    for (const varietyDefinition of definition.varieties) {
        const variety = await upsertSeedVariety({
            productId: product._id,
            definition: varietyDefinition,
            actorId,
            session,
        });
        varietyByKey.set(
            normalizeProductText(varietyDefinition.key),
            variety,
        );
    }

    const characteristicByKey = new Map();
    for (const characteristicDefinition of definition.characteristics) {
        const characteristic = await upsertSeedCharacteristic({
            productId: product._id,
            definition: characteristicDefinition,
            actorId,
            session,
        });
        characteristicByKey.set(
            normalizeProductText(characteristicDefinition.key),
            characteristic,
        );
    }

    let variantCount = 0;
    for (const variantDefinition of definition.variants) {
        const variety = variantDefinition.varietyKey
            ? varietyByKey.get(normalizeProductText(variantDefinition.varietyKey))
            : null;
        const characteristics = variantDefinition.characteristicKeys
            .map((key) => characteristicByKey.get(normalizeProductText(key)))
            .sort((left, right) => (
                left.kind.localeCompare(right.kind)
                || left._id.toString().localeCompare(right._id.toString())
            ));

        const normalizedName = normalizeProductText(variantDefinition.name);
        const normalizedSignature = buildVariantSignature({
            name: variantDefinition.name,
            varietyId: variety?._id ?? null,
            characteristics,
        });

        let variant = await ProductVariant.findOne({
            normalizedName,
            identityActive: true,
        }).session(session);

        const data = {
            name: variantDefinition.name,
            normalizedName,
            variety: variety?._id ?? null,
            characteristics: characteristics.map(({ _id }) => _id),
            processingState: variantDefinition.processingState,
            normalizedProcessingState: normalizeProductText(
                variantDefinition.processingState,
            ),
            conservationType: variantDefinition.conservationType,
            normalizedSignature,
            foodRange: variantDefinition.foodRange,
            referenceUnit: variantDefinition.referenceUnit,
            yieldPercent: variantDefinition.yieldPercent,
            status: PRODUCT_STATUS.ACTIVE,
            identityActive: true,
            rejectionReason: null,
            rejectionComment: null,
            replacementVariant: null,
            updatedBy: actorId,
        };

        if (!variant) {
            await ProductVariant.create([{
                canonicalProduct: product._id,
                ...data,
                createdBy: actorId,
            }], { session });
        } else {
            if (variant.canonicalProduct.toString() !== product._id.toString()) {
                throw new Error(
                    `La référence ${variantDefinition.name} appartient déjà à un autre Produit.`,
                );
            }
            Object.assign(variant, data);
            await variant.save({ session });
        }

        variantCount += 1;
    }

    return {
        product,
        varietyCount: definition.varieties.length,
        characteristicCount: definition.characteristics.length,
        variantCount,
    };
};

const seedM002Reference = async ({ dataset, actorId }) => {
    if (!actorId) {
        throw new TypeError('actorId is required to seed the M-002 reference.');
    }

    const parsed = m002ReferenceDatasetSchema.parse(dataset);
    if (!parsed.ready) {
        throw new Error(
            'Le dataset bootstrap M-002 n’est pas encore validé pour installation.',
        );
    }

    const datasetHash = hashDataset(parsed);

    return mongoose.connection.transaction(async (session) => {
        const previousRun = await ProductReferenceBootstrapRun.findOne({
            version: parsed.version,
        }).session(session);

        if (previousRun) {
            if (previousRun.datasetHash !== datasetHash) {
                throw new Error(
                    `La version ${parsed.version} existe déjà avec un contenu différent. Créez une nouvelle version de dataset.`,
                );
            }

            return {
                version: previousRun.version,
                datasetHash: previousRun.datasetHash,
                categoryCount: previousRun.categoryCount,
                productCount: previousRun.productCount,
                varietyCount: previousRun.varietyCount ?? 0,
                characteristicCount: previousRun.characteristicCount ?? 0,
                variantCount: previousRun.variantCount,
                installedAt: previousRun.installedAt,
                skipped: true,
            };
        }

        const categoryBySeedKey = new Map();
        for (const definition of parsed.categories) {
            const category = await upsertSeedCategory({
                definition,
                actorId,
                session,
            });
            categoryBySeedKey.set(normalizeProductText(definition.key), category);
        }

        let varietyCount = 0;
        let characteristicCount = 0;
        let variantCount = 0;

        for (const definition of parsed.products) {
            const category = categoryBySeedKey.get(
                normalizeProductText(definition.categoryKey),
            );
            if (!category) {
                throw new Error(
                    `Catégorie bootstrap inconnue pour "${definition.name}" : ${definition.categoryKey}`,
                );
            }

            const result = await upsertSeedProduct({
                definition,
                categoryId: category._id,
                actorId,
                session,
            });
            varietyCount += result.varietyCount;
            characteristicCount += result.characteristicCount;
            variantCount += result.variantCount;
        }

        const [run] = await ProductReferenceBootstrapRun.create([{
            version: parsed.version,
            datasetHash,
            actor: actorId,
            categoryCount: parsed.categories.length,
            productCount: parsed.products.length,
            varietyCount,
            characteristicCount,
            variantCount,
        }], { session });

        return {
            version: run.version,
            datasetHash: run.datasetHash,
            categoryCount: run.categoryCount,
            productCount: run.productCount,
            varietyCount: run.varietyCount,
            characteristicCount: run.characteristicCount,
            variantCount: run.variantCount,
            installedAt: run.installedAt,
            skipped: false,
        };
    });
};

const loadDefaultDataset = async () => {
    const datasetUrl = new URL('./data/m002-reference.v4.json', import.meta.url);
    return JSON.parse(await readFile(datasetUrl, 'utf8'));
};

const runSeedM002Reference = async () => {
    await connectDB(env.MONGODB_URI);

    try {
        const [dataset, actorId] = await Promise.all([
            loadDefaultDataset(),
            resolveBootstrapActorId(),
        ]);
        const result = await seedM002Reference({ dataset, actorId });
        console.log('Bootstrap M-002 Produit :', result);
    } finally {
        await mongoose.disconnect();
    }
};

const isExecutedDirectly =
    process.argv[1]
    && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isExecutedDirectly) {
    runSeedM002Reference().catch((error) => {
        console.error(
            'Échec du bootstrap M-002 Produit :',
            { message: error.message },
        );
        process.exitCode = 1;
    });
}

export {
    hashDataset,
    loadDefaultDataset,
    m002ReferenceDatasetSchema,
    resolveBootstrapActorId,
    runSeedM002Reference,
    seedM002Reference,
};
