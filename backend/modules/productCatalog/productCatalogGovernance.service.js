import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import { CanonicalProduct } from './canonicalProduct.model.js';
import { ProductCategory } from './productCategory.model.js';
import {
    assertProductCreationReviewed,
} from './productCatalogDedup.service.js';
import {
    buildSearchGrams,
    buildSearchKeys,
    buildVariantSignature,
    normalizeProductText,
} from './productCatalog.normalization.js';
import {
    PRODUCT_CATEGORY_STATUS,
    PRODUCT_REFERENCE_EVENT_ACTION,
    PRODUCT_REFERENCE_EVENT_ENTITY_TYPE,
    PRODUCT_STATUS,
} from './productCatalog.registry.js';
import {
    serializeCategory,
    serializeProduct,
    serializeVariant,
} from './productCatalog.serializer.js';
import {
    createProductReferenceEvent,
    listProductReferenceEvents,
} from './productReferenceEvent.service.js';
import { ProductVariant } from './productVariant.model.js';
import {
    createProductVariantInSession,
    normalizeVariantInput,
} from './productCatalog.service.js';

const createCategory = async ({
    actorId,
    name,
}) => mongoose.connection.transaction(async (session) => {
    const normalizedKey = normalizeProductText(name);

    let category;
    try {
        [category] = await ProductCategory.create([
            {
                name,
                normalizedKey,
                createdBy: actorId,
                updatedBy: actorId,
            },
        ], { session });
    } catch (error) {
        if (error?.code === 11000) {
            throw new AppError('Cette catégorie existe déjà.', 409);
        }
        throw error;
    }

    await createProductReferenceEvent({
        actorId,
        action: PRODUCT_REFERENCE_EVENT_ACTION.CATEGORY_CREATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CATEGORY,
        entityId: category._id,
        session,
    });

    return serializeCategory(category);
});

const listCategories = async ({ includeArchived = true } = {}) => {
    const filter = includeArchived
        ? {}
        : { status: PRODUCT_CATEGORY_STATUS.ACTIVE };

    const categories = await ProductCategory.find(filter)
        .sort({ name: 1, _id: 1 })
        .lean();

    return categories.map(serializeCategory);
};

const updateCategory = async ({
    actorId,
    categoryId,
    name,
}) => mongoose.connection.transaction(async (session) => {
    const category = await ProductCategory.findById(categoryId).session(session);

    if (!category) {
        throw new AppError('Catégorie introuvable.', 404);
    }

    const normalizedKey = normalizeProductText(name);

    const duplicate = await ProductCategory.findOne({
        _id: mongoose.trusted({ $ne: category._id }),
        normalizedKey,
    }).session(session);

    if (duplicate) {
        throw new AppError('Cette catégorie existe déjà.', 409);
    }

    category.name = name;
    category.normalizedKey = normalizedKey;
    category.updatedBy = actorId;
    await category.save({ session });

    await createProductReferenceEvent({
        actorId,
        action: PRODUCT_REFERENCE_EVENT_ACTION.CATEGORY_UPDATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CATEGORY,
        entityId: category._id,
        metadata: { changedFields: ['name'] },
        session,
    });

    return serializeCategory(category);
});

const updateCategoryStatus = async ({
    actorId,
    categoryId,
    status,
}) => mongoose.connection.transaction(async (session) => {
    const category = await ProductCategory.findById(categoryId).session(session);

    if (!category) {
        throw new AppError('Catégorie introuvable.', 404);
    }

    if (category.status === status) {
        return serializeCategory(category);
    }

    if (status === PRODUCT_CATEGORY_STATUS.ARCHIVED) {
        const activeProduct = await CanonicalProduct.exists({
            category: category._id,
            status: PRODUCT_STATUS.ACTIVE,
            identityActive: true,
        }).session(session);

        if (activeProduct) {
            throw new AppError(
                'Cette catégorie est encore utilisée par un Produit actif.',
                409,
            );
        }
    }

    category.status = status;
    category.updatedBy = actorId;
    await category.save({ session });

    await createProductReferenceEvent({
        actorId,
        action: status === PRODUCT_CATEGORY_STATUS.ARCHIVED
            ? PRODUCT_REFERENCE_EVENT_ACTION.CATEGORY_ARCHIVED
            : PRODUCT_REFERENCE_EVENT_ACTION.CATEGORY_REACTIVATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CATEGORY,
        entityId: category._id,
        session,
    });

    return serializeCategory(category);
});

const listGlobalProducts = async ({
    status = null,
    categoryId = null,
    q = null,
    page = 1,
    limit = 20,
}) => {
    const filter = {
        identityActive: true,
        status: status ?? mongoose.trusted({
            $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
        }),
    };
    if (categoryId) filter.category = categoryId;

    if (q) {
        const normalized = normalizeProductText(q);
        const grams = buildSearchGrams([normalized]);
        if (grams.length > 0) {
        filter.searchGrams = mongoose.trusted({ $in: grams });
    }
    }

    const [products, total] = await Promise.all([
        CanonicalProduct.find(filter)
            .populate('category')
            .sort({ normalizedName: 1, _id: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        CanonicalProduct.countDocuments(filter),
    ]);

    return {
        products: products.map(serializeProduct),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const getGlobalProductDetail = async ({ productId }) => {
    const product = await CanonicalProduct.findOne({
        _id: productId,
        identityActive: true,
        status: mongoose.trusted({
            $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
        }),
    })
        .populate('category')
        .lean();

    if (!product) {
        throw new AppError('Produit introuvable.', 404);
    }

    const [variants, events] = await Promise.all([
        ProductVariant.find({
            canonicalProduct: product._id,
            identityActive: true,
            status: mongoose.trusted({
                $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
            }),
        }).sort({ createdAt: 1, _id: 1 }).lean(),
        listProductReferenceEvents({
            entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT,
            entityId: product._id,
        }),
    ]);

    return {
        product: serializeProduct(product),
        variants: variants.map(serializeVariant),
        events: events.map((event) => ({
            id: event._id.toString(),
            action: event.action,
            actor: event.actor
                ? {
                    id: event.actor._id.toString(),
                    firstName: event.actor.firstName,
                    lastName: event.actor.lastName,
                }
                : null,
            metadata: event.metadata ?? {},
            createdAt: event.createdAt,
        })),
    };
};

const createGlobalProduct = async ({
    actorId,
    name,
    aliases = [],
    categoryId,
    reviewedCandidateIds = [],
    variant,
}) => mongoose.connection.transaction(async (session) => {
    await assertProductCreationReviewed({
        name,
        aliases,
        workspaceId: null,
        reviewedCandidateIds,
        session,
    });

    const category = await ProductCategory.findOne({
        _id: categoryId,
        status: PRODUCT_CATEGORY_STATUS.ACTIVE,
    }).session(session);

    if (!category) {
        throw new AppError('Catégorie Produit indisponible.', 409);
    }

    const searchKeys = buildSearchKeys(name, aliases);

    let product;
    try {
        [product] = await CanonicalProduct.create([
            {
                name,
                normalizedName: normalizeProductText(name),
                aliases,
                searchKeys,
                searchGrams: buildSearchGrams(searchKeys),
                category: category._id,
                status: PRODUCT_STATUS.ACTIVE,
                contributedFromWorkspace: null,
                createdBy: actorId,
                updatedBy: actorId,
            },
        ], { session });
    } catch (error) {
        if (error?.code === 11000) {
            throw new AppError('Un Produit équivalent existe déjà.', 409);
        }
        throw error;
    }

    const createdVariant = await createProductVariantInSession({
        canonicalProductId: product._id,
        workspaceId: null,
        actorId,
        variant,
        status: PRODUCT_STATUS.ACTIVE,
        session,
    });

    await createProductReferenceEvent({
        actorId,
        action: PRODUCT_REFERENCE_EVENT_ACTION.PRODUCT_CREATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT,
        entityId: product._id,
        metadata: { variantId: createdVariant._id.toString(), source: 'GLOBAL' },
        session,
    });

    await createProductReferenceEvent({
        actorId,
        action: PRODUCT_REFERENCE_EVENT_ACTION.VARIANT_CREATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIANT,
        entityId: createdVariant._id,
        metadata: { productId: product._id.toString(), source: 'GLOBAL' },
        session,
    });

    await product.populate('category');

    return {
        product: serializeProduct(product),
        variant: serializeVariant(createdVariant),
    };
});

const createGlobalVariant = async ({
    actorId,
    productId,
    variant,
}) => mongoose.connection.transaction(async (session) => {
    const product = await CanonicalProduct.findOne({
        _id: productId,
        status: PRODUCT_STATUS.ACTIVE,
        identityActive: true,
    }).session(session);

    if (!product) {
        throw new AppError('Produit actif introuvable.', 404);
    }

    const createdVariant = await createProductVariantInSession({
        canonicalProductId: product._id,
        workspaceId: null,
        actorId,
        variant,
        status: PRODUCT_STATUS.ACTIVE,
        session,
    });

    await createProductReferenceEvent({
        actorId,
        action: PRODUCT_REFERENCE_EVENT_ACTION.VARIANT_CREATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIANT,
        entityId: createdVariant._id,
        metadata: { productId: product._id.toString(), source: 'GLOBAL' },
        session,
    });

    return serializeVariant(createdVariant);
});

const updateProduct = async ({
    actorId,
    productId,
    name,
    aliases,
    categoryId,
    reviewedCandidateIds = [],
}) => mongoose.connection.transaction(async (session) => {
    const product = await CanonicalProduct.findOne({
        _id: productId,
        status: mongoose.trusted({
            $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
        }),
        identityActive: true,
    }).session(session);

    if (!product) {
        throw new AppError('Produit modifiable introuvable.', 404);
    }

    const nextName = name ?? product.name;
    const nextAliases = aliases ?? product.aliases;

    if (name !== undefined || aliases !== undefined) {
        try {
            await assertProductCreationReviewed({
                name: nextName,
                aliases: nextAliases,
                workspaceId: product.contributedFromWorkspace,
                reviewedCandidateIds,
                excludeProductId: product._id,
                session,
            });
        } catch (error) {
            if (
                error?.code === 'PRODUCT_EXACT_DUPLICATE'
                || error?.code === 'PRODUCT_DUPLICATE_REVIEW_REQUIRED'
            ) {
                throw new AppError(
                    error.code === 'PRODUCT_EXACT_DUPLICATE'
                        ? 'Un Produit équivalent existe déjà.'
                        : 'Des Produits proches doivent être examinés avant la modification.',
                    409,
                );
            }
            throw error;
        }

        const searchKeys = buildSearchKeys(nextName, nextAliases);
        product.name = nextName;
        product.normalizedName = normalizeProductText(nextName);
        product.aliases = nextAliases;
        product.searchKeys = searchKeys;
        product.searchGrams = buildSearchGrams(searchKeys);
    }

    if (categoryId !== undefined) {
        if (categoryId === null) {
            if (product.status === PRODUCT_STATUS.ACTIVE) {
                throw new AppError(
                    'Un Produit actif doit conserver une catégorie.',
                    409,
                );
            }
            product.category = null;
        } else {
            const category = await ProductCategory.findOne({
                _id: categoryId,
                status: PRODUCT_CATEGORY_STATUS.ACTIVE,
            }).session(session);

            if (!category) {
                throw new AppError('Catégorie Produit indisponible.', 409);
            }

            product.category = category._id;
        }
    }

    product.updatedBy = actorId;

    try {
        await product.save({ session });
    } catch (error) {
        if (error?.code === 11000) {
            throw new AppError('Un Produit équivalent existe déjà.', 409);
        }
        throw error;
    }

    await createProductReferenceEvent({
        actorId,
        workspaceId: product.contributedFromWorkspace,
        action: PRODUCT_REFERENCE_EVENT_ACTION.PRODUCT_UPDATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT,
        entityId: product._id,
        session,
    });

    await product.populate('category');
    return serializeProduct(product);
});

const updateProductStatus = async ({
    actorId,
    productId,
    status,
}) => mongoose.connection.transaction(async (session) => {
    const product = await CanonicalProduct.findOne({
        _id: productId,
        status: mongoose.trusted({ $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED] }),
        identityActive: true,
    }).session(session);

    if (!product) {
        throw new AppError('Produit non administrable.', 409);
    }

    if (![PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED].includes(status)) {
        throw new AppError('Transition de statut Produit invalide.', 400);
    }

    if (product.status === status) {
        await product.populate('category');
        return serializeProduct(product);
    }

    if (status === PRODUCT_STATUS.ACTIVE) {
        const category = await ProductCategory.findOne({
            _id: product.category,
            status: PRODUCT_CATEGORY_STATUS.ACTIVE,
        }).session(session);

        if (!category) {
            throw new AppError(
                'Une catégorie active est obligatoire pour réactiver le Produit.',
                409,
            );
        }
    }

    product.status = status;
    product.updatedBy = actorId;
    await product.save({ session });

    await createProductReferenceEvent({
        actorId,
        action: status === PRODUCT_STATUS.ARCHIVED
            ? PRODUCT_REFERENCE_EVENT_ACTION.PRODUCT_ARCHIVED
            : PRODUCT_REFERENCE_EVENT_ACTION.PRODUCT_REACTIVATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT,
        entityId: product._id,
        session,
    });

    await product.populate('category');
    return serializeProduct(product);
});

const updateVariant = async ({
    actorId,
    productId,
    variantId,
    changes,
}) => mongoose.connection.transaction(async (session) => {
    const variant = await ProductVariant.findOne({
        _id: variantId,
        canonicalProduct: productId,
        identityActive: true,
        status: mongoose.trusted({
            $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
        }),
    }).session(session);

    if (!variant) {
        throw new AppError('Déclinaison modifiable introuvable.', 404);
    }

    const hasFoodRangeChange = Object.prototype.hasOwnProperty.call(
        changes,
        'foodRange',
    );
    const hasProcessingStateChange = Object.prototype.hasOwnProperty.call(
        changes,
        'processingState',
    );
    const normalized = normalizeVariantInput({
        presentation: Object.prototype.hasOwnProperty.call(changes, 'presentation')
            ? changes.presentation
            : variant.presentation,
        foodRange: hasFoodRangeChange ? changes.foodRange : variant.foodRange,
        processingState: hasProcessingStateChange
            ? changes.processingState
            : hasFoodRangeChange
                ? null
                : variant.processingState,
        referenceUnit: Object.prototype.hasOwnProperty.call(changes, 'referenceUnit')
            ? changes.referenceUnit
            : variant.referenceUnit,
        yieldPercent: Object.prototype.hasOwnProperty.call(changes, 'yieldPercent')
            ? changes.yieldPercent
            : variant.yieldPercent,
    });

    Object.assign(variant, normalized);
    variant.updatedBy = actorId;

    const duplicate = await ProductVariant.findOne({
        _id: mongoose.trusted({ $ne: variant._id }),
        canonicalProduct: productId,
        normalizedSignature: variant.normalizedSignature,
        identityActive: true,
    }).session(session);

    if (duplicate) {
        throw new AppError('Cette déclinaison existe déjà.', 409);
    }

    await variant.save({ session });

    await createProductReferenceEvent({
        actorId,
        workspaceId: variant.contributedFromWorkspace,
        action: PRODUCT_REFERENCE_EVENT_ACTION.VARIANT_UPDATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIANT,
        entityId: variant._id,
        session,
    });

    return serializeVariant(variant);
});

const updateVariantStatus = async ({
    actorId,
    productId,
    variantId,
    status,
}) => mongoose.connection.transaction(async (session) => {
    const variant = await ProductVariant.findOne({
        _id: variantId,
        canonicalProduct: productId,
        status: mongoose.trusted({ $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED] }),
        identityActive: true,
    }).session(session);

    if (!variant) {
        throw new AppError('Déclinaison non administrable.', 409);
    }

    if (![PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED].includes(status)) {
        throw new AppError('Transition de statut Déclinaison invalide.', 400);
    }

    if (variant.status === status) {
        return serializeVariant(variant);
    }

    if (status === PRODUCT_STATUS.ACTIVE) {
        const product = await CanonicalProduct.findOne({
            _id: productId,
            status: PRODUCT_STATUS.ACTIVE,
            identityActive: true,
        }).session(session);

        if (!product) {
            throw new AppError(
                'Le Produit parent doit être actif pour réactiver la déclinaison.',
                409,
            );
        }
    }

    variant.status = status;
    variant.updatedBy = actorId;
    await variant.save({ session });

    await createProductReferenceEvent({
        actorId,
        action: status === PRODUCT_STATUS.ARCHIVED
            ? PRODUCT_REFERENCE_EVENT_ACTION.VARIANT_ARCHIVED
            : PRODUCT_REFERENCE_EVENT_ACTION.VARIANT_REACTIVATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIANT,
        entityId: variant._id,
        session,
    });

    return serializeVariant(variant);
});

export {
    createCategory,
    createGlobalProduct,
    createGlobalVariant,
    getGlobalProductDetail,
    listCategories,
    listGlobalProducts,
    updateCategory,
    updateCategoryStatus,
    updateProduct,
    updateProductStatus,
    updateVariant,
    updateVariantStatus,
};
