import mongoose from 'mongoose';

import {
    BUSINESS_ACTIVITY_ACTION,
    BUSINESS_ACTIVITY_ENTITY_TYPE,
} from '../businessActivity/businessActivity.registry.js';
import {
    createBusinessActivityEvent,
} from '../businessActivity/businessActivity.service.js';
import { AppError } from '../../utils/appError.js';
import { CanonicalProduct } from './canonicalProduct.model.js';
import { ProductCategory } from './productCategory.model.js';
import {
    assertProductCreationReviewed,
    findProductDuplicateCandidates,
} from './productCatalogDedup.service.js';
import {
    buildSearchGrams,
    buildSearchKeys,
    buildVariantSignature,
    normalizeProductText,
} from './productCatalog.normalization.js';
import {
    PRODUCT_CATEGORY_STATUS,
    PRODUCT_FOOD_RANGES,
    PRODUCT_REFERENCE_UNIT_REGISTRY,
    PRODUCT_REJECTION_REASON_REGISTRY,
    PRODUCT_STATUS,
    PRODUCT_STATUS_REGISTRY,
    WORKSPACE_PRODUCT_STATUS,
    WORKSPACE_PRODUCT_STATUS_REGISTRY,
} from './productCatalog.registry.js';
import {
    serializeProduct,
    serializeSearchResult,
    serializeVariant,
} from './productCatalog.serializer.js';
import { ProductVariant } from './productVariant.model.js';
import { WorkspaceProduct } from './workspaceProduct.model.js';

const asObjectId = (value) => new mongoose.Types.ObjectId(value.toString());

const normalizeVariantInput = (variant) => ({
    form: variant.form ?? null,
    normalizedForm: normalizeProductText(variant.form),
    processingState: variant.processingState ?? null,
    normalizedProcessingState: normalizeProductText(variant.processingState),
    preservation: variant.preservation ?? null,
    normalizedPreservation: normalizeProductText(variant.preservation),
    normalizedSignature: buildVariantSignature(variant),
    foodRange: variant.foodRange ?? null,
    referenceUnit: variant.referenceUnit,
    yieldPercent: variant.yieldPercent ?? null,
});

const assertActiveCategory = async ({ categoryId, session = null }) => {
    if (!categoryId) {
        return null;
    }

    const query = ProductCategory.findOne({
        _id: categoryId,
        status: PRODUCT_CATEGORY_STATUS.ACTIVE,
    });

    if (session) query.session(session);

    const category = await query;

    if (!category) {
        throw new AppError('Catégorie Produit indisponible.', 409);
    }

    return category;
};

const createProductVariantInSession = async ({
    canonicalProductId,
    workspaceId,
    actorId,
    variant,
    status = PRODUCT_STATUS.PENDING_REVIEW,
    session,
}) => {
    const normalized = normalizeVariantInput(variant);

    const existing = await ProductVariant.findOne({
        canonicalProduct: canonicalProductId,
        normalizedSignature: normalized.normalizedSignature,
        identityActive: true,
    }).session(session);

    if (existing) {
        throw new AppError('Cette déclinaison existe déjà.', 409);
    }

    const [created] = await ProductVariant.create([
        {
            canonicalProduct: canonicalProductId,
            ...normalized,
            status,
            contributedFromWorkspace: workspaceId,
            createdBy: actorId,
            updatedBy: actorId,
        },
    ], { session });

    return created;
};

const attachVariantToWorkspaceInSession = async ({
    workspaceId,
    variantId,
    actorId,
    session,
    allowPendingOwnContribution = false,
}) => {
    const variant = await ProductVariant.findOne({
        _id: variantId,
        identityActive: true,
    }).session(session);

    if (!variant) {
        throw new AppError('Déclinaison Produit introuvable.', 404);
    }

    const product = await CanonicalProduct.findOne({
        _id: variant.canonicalProduct,
        identityActive: true,
    }).session(session);

    if (!product) {
        throw new AppError('Produit introuvable.', 404);
    }

    const isActive = (
        variant.status === PRODUCT_STATUS.ACTIVE
        && product.status === PRODUCT_STATUS.ACTIVE
    );

    const isOwnPending = allowPendingOwnContribution
        && variant.status === PRODUCT_STATUS.PENDING_REVIEW
        && variant.contributedFromWorkspace?.toString() === workspaceId.toString()
        && (
            product.status === PRODUCT_STATUS.ACTIVE
            || (
                product.status === PRODUCT_STATUS.PENDING_REVIEW
                && product.contributedFromWorkspace?.toString() === workspaceId.toString()
            )
        );

    if (!isActive && !isOwnPending) {
        throw new AppError(
            'Cette référence Produit ne peut pas être ajoutée au catalogue.',
            409,
        );
    }

    const existing = await WorkspaceProduct.findOne({
        workspace: workspaceId,
        productVariant: variantId,
    }).session(session);

    if (existing) {
        if (existing.status === WORKSPACE_PRODUCT_STATUS.ACTIVE) {
            return { entry: existing, changed: false };
        }

        existing.status = WORKSPACE_PRODUCT_STATUS.ACTIVE;
        existing.updatedBy = actorId;
        await existing.save({ session });

        await createBusinessActivityEvent({
            workspaceId,
            actorId,
            action: BUSINESS_ACTIVITY_ACTION.PRODUCT_CATALOG_REACTIVATED,
            entityType: BUSINESS_ACTIVITY_ENTITY_TYPE.WORKSPACE_PRODUCT,
            entityId: existing._id,
            metadata: { productVariantId: variantId.toString() },
        }, { session });

        return { entry: existing, changed: true };
    }

    const [entry] = await WorkspaceProduct.create([
        {
            workspace: workspaceId,
            productVariant: variantId,
            createdBy: actorId,
            updatedBy: actorId,
        },
    ], { session });

    await createBusinessActivityEvent({
        workspaceId,
        actorId,
        action: BUSINESS_ACTIVITY_ACTION.PRODUCT_CATALOG_ATTACHED,
        entityType: BUSINESS_ACTIVITY_ENTITY_TYPE.WORKSPACE_PRODUCT,
        entityId: entry._id,
        metadata: { productVariantId: variantId.toString() },
    }, { session });

    return { entry, changed: true };
};

const getProductMetadata = async () => {
    const categories = await ProductCategory.find({
        status: PRODUCT_CATEGORY_STATUS.ACTIVE,
    })
        .sort({ name: 1, _id: 1 })
        .lean();

    return {
        productStatuses: Object.values(PRODUCT_STATUS_REGISTRY),
        workspaceProductStatuses: Object.values(WORKSPACE_PRODUCT_STATUS_REGISTRY),
        referenceUnits: Object.values(PRODUCT_REFERENCE_UNIT_REGISTRY),
        foodRanges: [...PRODUCT_FOOD_RANGES],
        rejectionReasons: Object.values(PRODUCT_REJECTION_REASON_REGISTRY),
        categories: categories.map((category) => ({
            id: category._id.toString(),
            name: category.name,
        })),
    };
};

const buildProductSearchFilter = ({
    workspaceId,
    categoryId,
    q,
}) => {
    const visibility = {
        $or: [
            { status: PRODUCT_STATUS.ACTIVE },
            {
                status: PRODUCT_STATUS.PENDING_REVIEW,
                contributedFromWorkspace: asObjectId(workspaceId),
            },
        ],
    };

    const filter = {
        identityActive: true,
        ...visibility,
    };

    if (categoryId) {
        filter.category = asObjectId(categoryId);
    }

    if (q) {
        const normalized = normalizeProductText(q);
        const grams = buildSearchGrams([normalized]);

        if (grams.length > 0) {
            filter.searchGrams = mongoose.trusted({ $in: grams });
        }
    }

    return filter;
};

const listProductSearch = async ({
    workspaceId,
    scope = 'WORKSPACE',
    q = null,
    categoryId = null,
    status = null,
    page = 1,
    limit = 20,
}) => {
    const productFilter = buildProductSearchFilter({
        workspaceId,
        categoryId,
        q,
    });

    const products = await CanonicalProduct.find(productFilter)
        .select('_id name aliases category status searchKeys createdAt updatedAt')
        .populate('category')
        .sort({ name: 1, _id: 1 })
        .limit(5000)
        .lean();

    const normalizedQuery = q ? normalizeProductText(q) : null;
    const filteredProducts = normalizedQuery
        ? products.filter((product) => (
            product.searchKeys ?? []
        ).some((key) => key.includes(normalizedQuery)))
        : products;

    const productById = new Map(
        filteredProducts.map((product) => [product._id.toString(), product]),
    );
    const productIds = filteredProducts.map(({ _id }) => _id);

    if (productIds.length === 0) {
        return {
            results: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
        };
    }

    const variantVisibility = {
        canonicalProduct: mongoose.trusted({ $in: productIds }),
        identityActive: true,
        $or: [
            { status: PRODUCT_STATUS.ACTIVE },
            {
                status: PRODUCT_STATUS.PENDING_REVIEW,
                contributedFromWorkspace: asObjectId(workspaceId),
            },
        ],
    };

    if (scope === 'WORKSPACE') {
        const variantIds = await ProductVariant.find(variantVisibility)
            .distinct('_id');

        const entryFilter = {
            workspace: workspaceId,
            productVariant: mongoose.trusted({ $in: variantIds }),
            ...(status ? { status } : { status: WORKSPACE_PRODUCT_STATUS.ACTIVE }),
        };
        const total = await WorkspaceProduct.countDocuments(entryFilter);
        const entries = await WorkspaceProduct.find(entryFilter)
            .sort({ updatedAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const variants = await ProductVariant.find({
            _id: mongoose.trusted({ $in: entries.map(({ productVariant }) => productVariant) }),
        }).lean();
        const variantById = new Map(
            variants.map((variant) => [variant._id.toString(), variant]),
        );

        return {
            results: entries.flatMap((entry) => {
                const variant = variantById.get(entry.productVariant.toString());
                const product = variant
                    ? productById.get(variant.canonicalProduct.toString())
                    : null;

                return product && variant
                    ? [serializeSearchResult({ product, variant, workspaceEntry: entry })]
                    : [];
            }),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    const total = await ProductVariant.countDocuments(variantVisibility);
    const variants = await ProductVariant.find(variantVisibility)
        .sort({ updatedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    const entries = await WorkspaceProduct.find({
        workspace: workspaceId,
        productVariant: mongoose.trusted({ $in: variants.map(({ _id }) => _id) }),
    }).lean();
    const entryByVariantId = new Map(
        entries.map((entry) => [entry.productVariant.toString(), entry]),
    );

    return {
        results: variants.flatMap((variant) => {
            const product = productById.get(variant.canonicalProduct.toString());
            return product
                ? [serializeSearchResult({
                    product,
                    variant,
                    workspaceEntry: entryByVariantId.get(variant._id.toString()) ?? null,
                })]
                : [];
        }),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const getWorkspaceProductDetail = async ({
    workspaceId,
    productId,
}) => {
    const product = await CanonicalProduct.findOne({
        _id: productId,
        identityActive: true,
        $or: [
            { status: PRODUCT_STATUS.ACTIVE },
            {
                status: PRODUCT_STATUS.PENDING_REVIEW,
                contributedFromWorkspace: workspaceId,
            },
        ],
    })
        .populate('category')
        .lean();

    if (!product) {
        throw new AppError('Produit introuvable.', 404);
    }

    const variants = await ProductVariant.find({
        canonicalProduct: product._id,
        identityActive: true,
        $or: [
            { status: PRODUCT_STATUS.ACTIVE },
            {
                status: PRODUCT_STATUS.PENDING_REVIEW,
                contributedFromWorkspace: workspaceId,
            },
        ],
    }).sort({ createdAt: 1, _id: 1 }).lean();

    const entries = await WorkspaceProduct.find({
        workspace: workspaceId,
        productVariant: { $in: variants.map(({ _id }) => _id) },
    }).lean();
    const entryByVariantId = new Map(
        entries.map((entry) => [entry.productVariant.toString(), entry]),
    );

    return {
        product: serializeProduct(product),
        variants: variants.map((variant) => ({
            ...serializeVariant(variant),
            workspaceEntry: entryByVariantId.get(variant._id.toString())
                ? {
                    id: entryByVariantId.get(variant._id.toString())._id.toString(),
                    status: entryByVariantId.get(variant._id.toString()).status,
                }
                : null,
        })),
    };
};

const createProductContribution = async ({
    workspaceId,
    actorId,
    name,
    aliases = [],
    categoryId = null,
    reviewedCandidateIds = [],
    variant,
}) => mongoose.connection.transaction(async (session) => {
    await assertProductCreationReviewed({
        name,
        aliases,
        workspaceId,
        reviewedCandidateIds,
        session,
    });

    await assertActiveCategory({ categoryId, session });

    const searchKeys = buildSearchKeys(name, aliases);
    const normalizedName = normalizeProductText(name);

    let product;
    try {
        [product] = await CanonicalProduct.create([
            {
                name,
                normalizedName,
                aliases,
                searchKeys,
                searchGrams: buildSearchGrams(searchKeys),
                category: categoryId,
                status: PRODUCT_STATUS.PENDING_REVIEW,
                contributedFromWorkspace: workspaceId,
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
        workspaceId,
        actorId,
        variant,
        session,
    });

    const { entry } = await attachVariantToWorkspaceInSession({
        workspaceId,
        variantId: createdVariant._id,
        actorId,
        session,
        allowPendingOwnContribution: true,
    });

    await createBusinessActivityEvent({
        workspaceId,
        actorId,
        action: BUSINESS_ACTIVITY_ACTION.PRODUCT_CONTRIBUTION_SUBMITTED,
        entityType: BUSINESS_ACTIVITY_ENTITY_TYPE.CANONICAL_PRODUCT,
        entityId: product._id,
        metadata: {
            variantId: createdVariant._id.toString(),
            workspaceProductId: entry._id.toString(),
        },
    }, { session });

    return {
        product: serializeProduct(product),
        variant: serializeVariant(createdVariant),
        workspaceEntry: {
            id: entry._id.toString(),
            status: entry.status,
        },
    };
});

const createVariantContribution = async ({
    workspaceId,
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
        workspaceId,
        actorId,
        variant,
        session,
    });

    const { entry } = await attachVariantToWorkspaceInSession({
        workspaceId,
        variantId: createdVariant._id,
        actorId,
        session,
        allowPendingOwnContribution: true,
    });

    await createBusinessActivityEvent({
        workspaceId,
        actorId,
        action: BUSINESS_ACTIVITY_ACTION.PRODUCT_CONTRIBUTION_SUBMITTED,
        entityType: BUSINESS_ACTIVITY_ENTITY_TYPE.PRODUCT_VARIANT,
        entityId: createdVariant._id,
        metadata: {
            productId: product._id.toString(),
            workspaceProductId: entry._id.toString(),
        },
    }, { session });

    return {
        product: serializeProduct(product),
        variant: serializeVariant(createdVariant),
        workspaceEntry: {
            id: entry._id.toString(),
            status: entry.status,
        },
    };
});

const attachVariantToWorkspace = async ({
    workspaceId,
    variantId,
    actorId,
}) => mongoose.connection.transaction(async (session) => {
    const { entry } = await attachVariantToWorkspaceInSession({
        workspaceId,
        variantId,
        actorId,
        session,
    });

    return {
        id: entry._id.toString(),
        status: entry.status,
    };
});

const archiveVariantFromWorkspace = async ({
    workspaceId,
    variantId,
    actorId,
}) => mongoose.connection.transaction(async (session) => {
    const entry = await WorkspaceProduct.findOne({
        workspace: workspaceId,
        productVariant: variantId,
    }).session(session);

    if (!entry) {
        throw new AppError('Référence absente du catalogue.', 404);
    }

    if (entry.status === WORKSPACE_PRODUCT_STATUS.ARCHIVED) {
        return { id: entry._id.toString(), status: entry.status };
    }

    entry.status = WORKSPACE_PRODUCT_STATUS.ARCHIVED;
    entry.updatedBy = actorId;
    await entry.save({ session });

    await createBusinessActivityEvent({
        workspaceId,
        actorId,
        action: BUSINESS_ACTIVITY_ACTION.PRODUCT_CATALOG_ARCHIVED,
        entityType: BUSINESS_ACTIVITY_ENTITY_TYPE.WORKSPACE_PRODUCT,
        entityId: entry._id,
        metadata: { productVariantId: variantId.toString() },
    }, { session });

    return { id: entry._id.toString(), status: entry.status };
});

export {
    archiveVariantFromWorkspace,
    attachVariantToWorkspace,
    attachVariantToWorkspaceInSession,
    createProductContribution,
    createProductVariantInSession,
    createVariantContribution,
    findProductDuplicateCandidates,
    getProductMetadata,
    getWorkspaceProductDetail,
    listProductSearch,
    normalizeVariantInput,
};
