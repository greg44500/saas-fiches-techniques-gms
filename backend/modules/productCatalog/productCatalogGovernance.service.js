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
    PRODUCT_REJECTION_REASON,
    PRODUCT_STATUS,
    WORKSPACE_PRODUCT_STATUS,
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
import { WorkspaceProduct } from './workspaceProduct.model.js';

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

const listPlatformProducts = async ({
    status = null,
    categoryId = null,
    q = null,
    page = 1,
    limit = 20,
}) => {
    const filter = {};

    if (status) filter.status = status;
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
            .sort({ updatedAt: -1, _id: -1 })
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

const getPlatformProductDetail = async ({ productId }) => {
    const product = await CanonicalProduct.findById(productId)
        .populate('category')
        .lean();

    if (!product) {
        throw new AppError('Produit introuvable.', 404);
    }

    const [variants, events] = await Promise.all([
        ProductVariant.find({
            canonicalProduct: product._id,
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
        status: mongoose.trusted({ $ne: PRODUCT_STATUS.REJECTED }),
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

const approveProduct = async ({
    actorId,
    productId,
}) => mongoose.connection.transaction(async (session) => {
    const product = await CanonicalProduct.findOne({
        _id: productId,
        status: PRODUCT_STATUS.PENDING_REVIEW,
        identityActive: true,
    }).session(session);

    if (!product) {
        throw new AppError('Contribution Produit non validable.', 409);
    }

    const category = await ProductCategory.findOne({
        _id: product.category,
        status: PRODUCT_CATEGORY_STATUS.ACTIVE,
    }).session(session);

    if (!category) {
        throw new AppError(
            'Une catégorie active est obligatoire avant validation.',
            409,
        );
    }

    const variantExists = await ProductVariant.exists({
        canonicalProduct: product._id,
        identityActive: true,
        status: mongoose.trusted({ $in: [PRODUCT_STATUS.PENDING_REVIEW, PRODUCT_STATUS.ACTIVE] }),
    }).session(session);

    if (!variantExists) {
        throw new AppError(
            'Le Produit doit posséder au moins une déclinaison valide.',
            409,
        );
    }

    product.status = PRODUCT_STATUS.ACTIVE;
    product.updatedBy = actorId;
    await product.save({ session });

    await createProductReferenceEvent({
        actorId,
        workspaceId: product.contributedFromWorkspace,
        action: PRODUCT_REFERENCE_EVENT_ACTION.PRODUCT_APPROVED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT,
        entityId: product._id,
        session,
    });

    await product.populate('category');
    return serializeProduct(product);
});

const repointWorkspaceEntries = async ({
    sourceVariantIds,
    replacementVariantId,
    actorId,
    session,
}) => {
    const sourceEntries = await WorkspaceProduct.find({
        productVariant: mongoose.trusted({ $in: sourceVariantIds }),
        status: WORKSPACE_PRODUCT_STATUS.ACTIVE,
    }).session(session);

    for (const sourceEntry of sourceEntries) {
        const existing = await WorkspaceProduct.findOne({
            workspace: sourceEntry.workspace,
            productVariant: replacementVariantId,
        }).session(session);

        if (existing) {
            if (existing.status !== WORKSPACE_PRODUCT_STATUS.ACTIVE) {
                existing.status = WORKSPACE_PRODUCT_STATUS.ACTIVE;
                existing.updatedBy = actorId;
                await existing.save({ session });
            }
        } else {
            await WorkspaceProduct.create([
                {
                    workspace: sourceEntry.workspace,
                    productVariant: replacementVariantId,
                    createdBy: sourceEntry.createdBy,
                    updatedBy: actorId,
                },
            ], { session });
        }

        sourceEntry.status = WORKSPACE_PRODUCT_STATUS.ARCHIVED;
        sourceEntry.updatedBy = actorId;
        await sourceEntry.save({ session });
    }
};

const rejectProduct = async ({
    actorId,
    productId,
    reason,
    replacementProductId = null,
    replacementVariantId = null,
    comment = null,
}) => mongoose.connection.transaction(async (session) => {
    const product = await CanonicalProduct.findOne({
        _id: productId,
        status: PRODUCT_STATUS.PENDING_REVIEW,
        identityActive: true,
    }).session(session);

    if (!product) {
        throw new AppError('Contribution Produit non rejetable.', 409);
    }

    if (reason === PRODUCT_REJECTION_REASON.DUPLICATE && !replacementVariantId) {
        throw new AppError(
            'Une déclinaison de remplacement est requise pour un doublon.',
            400,
        );
    }

    if (replacementVariantId) {
        const replacement = await ProductVariant.findOne({
            _id: replacementVariantId,
            status: PRODUCT_STATUS.ACTIVE,
            identityActive: true,
        }).session(session);

        if (!replacement) {
            throw new AppError('Déclinaison de remplacement indisponible.', 409);
        }

        replacementProductId = replacement.canonicalProduct;
    }

    const variants = await ProductVariant.find({
        canonicalProduct: product._id,
        identityActive: true,
    }).session(session);

    if (replacementVariantId) {
        await repointWorkspaceEntries({
            sourceVariantIds: variants.map(({ _id }) => _id),
            replacementVariantId,
            actorId,
            session,
        });
    }

    for (const variant of variants) {
        variant.status = PRODUCT_STATUS.REJECTED;
        variant.identityActive = false;
        variant.rejectionReason = reason;
        variant.rejectionComment = comment;
        variant.replacementVariant = replacementVariantId;
        variant.updatedBy = actorId;
        await variant.save({ session });
    }

    product.status = PRODUCT_STATUS.REJECTED;
    product.identityActive = false;
    product.rejectionReason = reason;
    product.rejectionComment = comment;
    product.replacementProduct = replacementProductId;
    product.replacementVariant = replacementVariantId;
    product.updatedBy = actorId;
    await product.save({ session });

    await createProductReferenceEvent({
        actorId,
        workspaceId: product.contributedFromWorkspace,
        action: PRODUCT_REFERENCE_EVENT_ACTION.PRODUCT_REJECTED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT,
        entityId: product._id,
        metadata: {
            reason,
            replacementProductId: replacementProductId?.toString() ?? null,
            replacementVariantId: replacementVariantId?.toString() ?? null,
        },
        session,
    });

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
        status: mongoose.trusted({ $ne: PRODUCT_STATUS.REJECTED }),
    }).session(session);

    if (!variant) {
        throw new AppError('Déclinaison modifiable introuvable.', 404);
    }

    for (const field of [
        'form',
        'processingState',
        'preservation',
        'foodRange',
        'referenceUnit',
        'yieldPercent',
    ]) {
        if (Object.prototype.hasOwnProperty.call(changes, field)) {
            variant[field] = changes[field];
        }
    }

    variant.normalizedForm = normalizeProductText(variant.form);
    variant.normalizedProcessingState = normalizeProductText(
        variant.processingState,
    );
    variant.normalizedPreservation = normalizeProductText(variant.preservation);
    variant.normalizedSignature = buildVariantSignature(variant);
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

const approveVariant = async ({
    actorId,
    productId,
    variantId,
}) => mongoose.connection.transaction(async (session) => {
    const product = await CanonicalProduct.findOne({
        _id: productId,
        status: PRODUCT_STATUS.ACTIVE,
        identityActive: true,
    }).session(session);

    if (!product) {
        throw new AppError(
            'Le Produit doit être actif avant de valider une déclinaison.',
            409,
        );
    }

    const variant = await ProductVariant.findOne({
        _id: variantId,
        canonicalProduct: productId,
        status: PRODUCT_STATUS.PENDING_REVIEW,
        identityActive: true,
    }).session(session);

    if (!variant) {
        throw new AppError('Déclinaison non validable.', 409);
    }

    variant.status = PRODUCT_STATUS.ACTIVE;
    variant.updatedBy = actorId;
    await variant.save({ session });

    await createProductReferenceEvent({
        actorId,
        workspaceId: variant.contributedFromWorkspace,
        action: PRODUCT_REFERENCE_EVENT_ACTION.VARIANT_APPROVED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIANT,
        entityId: variant._id,
        session,
    });

    return serializeVariant(variant);
});

const rejectVariant = async ({
    actorId,
    productId,
    variantId,
    reason,
    replacementVariantId = null,
    comment = null,
}) => mongoose.connection.transaction(async (session) => {
    const variant = await ProductVariant.findOne({
        _id: variantId,
        canonicalProduct: productId,
        status: PRODUCT_STATUS.PENDING_REVIEW,
        identityActive: true,
    }).session(session);

    if (!variant) {
        throw new AppError('Déclinaison non rejetable.', 409);
    }

    if (reason === PRODUCT_REJECTION_REASON.DUPLICATE && !replacementVariantId) {
        throw new AppError(
            'Une déclinaison de remplacement est requise pour un doublon.',
            400,
        );
    }

    if (replacementVariantId) {
        const replacement = await ProductVariant.findOne({
            _id: replacementVariantId,
            status: PRODUCT_STATUS.ACTIVE,
            identityActive: true,
        }).session(session);

        if (!replacement) {
            throw new AppError('Déclinaison de remplacement indisponible.', 409);
        }

        await repointWorkspaceEntries({
            sourceVariantIds: [variant._id],
            replacementVariantId,
            actorId,
            session,
        });
    }

    variant.status = PRODUCT_STATUS.REJECTED;
    variant.identityActive = false;
    variant.rejectionReason = reason;
    variant.rejectionComment = comment;
    variant.replacementVariant = replacementVariantId;
    variant.updatedBy = actorId;
    await variant.save({ session });

    await createProductReferenceEvent({
        actorId,
        workspaceId: variant.contributedFromWorkspace,
        action: PRODUCT_REFERENCE_EVENT_ACTION.VARIANT_REJECTED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIANT,
        entityId: variant._id,
        metadata: {
            reason,
            replacementVariantId: replacementVariantId?.toString() ?? null,
        },
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
    approveProduct,
    approveVariant,
    createCategory,
    getPlatformProductDetail,
    listCategories,
    listPlatformProducts,
    rejectProduct,
    rejectVariant,
    updateCategory,
    updateCategoryStatus,
    updateProduct,
    updateProductStatus,
    updateVariant,
    updateVariantStatus,
};
