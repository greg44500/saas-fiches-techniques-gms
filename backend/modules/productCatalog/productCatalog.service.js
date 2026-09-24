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
import { ProductCharacteristic } from './productCharacteristic.model.js';
import {
    assertProductCreationReviewed,
    findProductDuplicateCandidates,
} from './productCatalogDedup.service.js';
import {
    buildSearchGrams,
    buildSearchKeys,
    buildVariantSignature,
    matchesProductSearchValues,
    normalizeProductText,
    productSearchValueContainedInQuery,
} from './productCatalog.normalization.js';
import {
    PRODUCT_CATEGORY_STATUS,
    PRODUCT_CATEGORY_STATUS_REGISTRY,
    PRODUCT_CHARACTERISTIC_KIND,
    PRODUCT_CHARACTERISTIC_KIND_REGISTRY,
    PRODUCT_FOOD_RANGE_REGISTRY,
    PRODUCT_REFERENCE_EVENT_ACTION,
    PRODUCT_REFERENCE_EVENT_ENTITY_TYPE,
    PRODUCT_REFERENCE_UNIT_REGISTRY,
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
import {
    createProductReferenceEvent,
} from './productReferenceEvent.service.js';
import { ProductVariant } from './productVariant.model.js';
import { ProductVariety } from './productVariety.model.js';
import { WorkspaceProduct } from './workspaceProduct.model.js';
import {
    resolveProductProcessingState,
} from './productVariantSemantics.js';

const asObjectId = (value) => new mongoose.Types.ObjectId(value.toString());

const createOrResolvePresentationCharacteristic = async ({
    canonicalProductId,
    workspaceId,
    actorId,
    presentation,
    session,
}) => {
    const normalizedName = normalizeProductText(presentation);
    if (!normalizedName) return null;

    let characteristic = await ProductCharacteristic.findOne({
        canonicalProduct: canonicalProductId,
        kind: PRODUCT_CHARACTERISTIC_KIND.PRESENTATION,
        normalizedName,
        identityActive: true,
        status: PRODUCT_STATUS.ACTIVE,
    }).session(session);

    if (characteristic) return characteristic;

    const searchKeys = buildSearchKeys(presentation, []);

    try {
        [characteristic] = await ProductCharacteristic.create([
            {
                canonicalProduct: canonicalProductId,
                kind: PRODUCT_CHARACTERISTIC_KIND.PRESENTATION,
                name: presentation,
                normalizedName,
                aliases: [],
                searchKeys,
                searchGrams: buildSearchGrams(searchKeys),
                status: PRODUCT_STATUS.ACTIVE,
                contributedFromWorkspace: workspaceId,
                createdBy: actorId,
                updatedBy: actorId,
            },
        ], { session });
    } catch (error) {
        if (error?.code !== 11000) throw error;
        characteristic = await ProductCharacteristic.findOne({
            canonicalProduct: canonicalProductId,
            kind: PRODUCT_CHARACTERISTIC_KIND.PRESENTATION,
            normalizedName,
            identityActive: true,
            status: PRODUCT_STATUS.ACTIVE,
        }).session(session);
    }

    return characteristic;
};

const normalizeVariantInput = async ({
    canonicalProductId,
    workspaceId = null,
    actorId,
    variant,
    session,
}) => {
    const processingState = resolveProductProcessingState({
        foodRange: variant.foodRange,
        processingState: variant.processingState,
    });

    if (!processingState.valid) {
        throw new AppError(
            processingState.reason === 'INVALID_FOOD_RANGE'
                ? 'Une gamme valide est obligatoire.'
                : 'L’état / transformation n’est pas compatible avec la gamme sélectionnée.',
            409,
        );
    }

    let variety = null;
    if (variant.varietyId) {
        variety = await ProductVariety.findOne({
            _id: variant.varietyId,
            canonicalProduct: canonicalProductId,
            identityActive: true,
            status: PRODUCT_STATUS.ACTIVE,
        }).session(session);

        if (!variety) {
            throw new AppError('Variété Produit indisponible.', 409);
        }
    }

    const requestedCharacteristicIds = [
        ...new Set((variant.characteristicIds ?? []).map(String)),
    ];
    const characteristics = requestedCharacteristicIds.length > 0
        ? await ProductCharacteristic.find({
            _id: mongoose.trusted({
                $in: requestedCharacteristicIds.map(asObjectId),
            }),
            canonicalProduct: canonicalProductId,
            identityActive: true,
            status: PRODUCT_STATUS.ACTIVE,
        }).session(session)
        : [];

    if (characteristics.length !== requestedCharacteristicIds.length) {
        throw new AppError('Une Caractéristique Produit est indisponible.', 409);
    }

    if (variant.presentation) {
        const presentation = await createOrResolvePresentationCharacteristic({
            canonicalProductId,
            workspaceId,
            actorId,
            presentation: variant.presentation,
            session,
        });
        const existingPresentation = characteristics.find(
            ({ kind }) => kind === PRODUCT_CHARACTERISTIC_KIND.PRESENTATION,
        );

        if (
            existingPresentation
            && existingPresentation._id.toString() !== presentation._id.toString()
        ) {
            throw new AppError(
                'Une déclinaison ne peut contenir qu’une Présentation.',
                409,
            );
        }

        if (
            !characteristics.some(
                ({ _id }) => _id.toString() === presentation._id.toString(),
            )
        ) {
            characteristics.push(presentation);
        }
    }

    const characteristicByKind = new Map();
    for (const characteristic of characteristics) {
        const previous = characteristicByKind.get(characteristic.kind);
        if (
            previous
            && previous._id.toString() !== characteristic._id.toString()
        ) {
            throw new AppError(
                'Une déclinaison ne peut contenir plusieurs Caractéristiques du même type.',
                409,
            );
        }
        characteristicByKind.set(characteristic.kind, characteristic);
    }

    const orderedCharacteristics = [...characteristicByKind.values()].sort(
        (left, right) => (
            left.kind.localeCompare(right.kind)
            || left._id.toString().localeCompare(right._id.toString())
        ),
    );

    const normalized = {
        variety: variety?._id ?? null,
        characteristics: orderedCharacteristics.map(({ _id }) => _id),
        processingState: processingState.value,
        normalizedProcessingState: normalizeProductText(processingState.value),
        foodRange: variant.foodRange,
        referenceUnit: variant.referenceUnit,
        yieldPercent: variant.yieldPercent ?? null,
    };

    return {
        ...normalized,
        normalizedSignature: buildVariantSignature({
            varietyId: normalized.variety,
            characteristics: orderedCharacteristics,
            foodRange: normalized.foodRange,
            processingState: normalized.processingState,
        }),
    };
};

const assertActiveCategory = async ({ categoryId, session = null }) => {
    if (!categoryId) {
        throw new AppError('Une catégorie active est obligatoire.', 409);
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
    status = PRODUCT_STATUS.ACTIVE,
    session,
}) => {
    const normalized = await normalizeVariantInput({
        canonicalProductId,
        workspaceId,
        actorId,
        variant,
        session,
    });

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

    await created.populate(['variety', 'characteristics']);
    return created;
};

const attachVariantToWorkspaceInSession = async ({
    workspaceId,
    variantId,
    actorId,
    session,
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

    if (!isActive) {
        throw new AppError(
            'Cette référence Produit ne peut pas être ajoutée au référentiel Workspace.',
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

const getProductMetadata = async ({
    includeArchivedCategories = false,
} = {}) => {
    const categories = await ProductCategory.find(
        includeArchivedCategories
            ? {}
            : { status: PRODUCT_CATEGORY_STATUS.ACTIVE },
    )
        .sort({ name: 1, _id: 1 })
        .lean();

    return {
        productStatuses: Object.values(PRODUCT_STATUS_REGISTRY),
        workspaceProductStatuses: Object.values(WORKSPACE_PRODUCT_STATUS_REGISTRY),
        productCategoryStatuses: Object.values(PRODUCT_CATEGORY_STATUS_REGISTRY),
        productCharacteristicKinds: Object.values(PRODUCT_CHARACTERISTIC_KIND_REGISTRY),
        referenceUnits: Object.values(PRODUCT_REFERENCE_UNIT_REGISTRY),
        foodRanges: Object.values(PRODUCT_FOOD_RANGE_REGISTRY).map(
            (definition) => ({
                ...definition,
                processingStates: [...definition.processingStates],
            }),
        ),
        categories: categories.map((category) => ({
            id: category._id.toString(),
            name: category.name,
            status: category.status,
        })),
    };
};

const getWorkspaceProductSummary = async ({ workspaceId }) => {
    const activeProductIds = await CanonicalProduct.find({
        status: PRODUCT_STATUS.ACTIVE,
        identityActive: true,
    }).distinct('_id');

    const activeVariantIds = activeProductIds.length > 0
        ? await ProductVariant.find({
            canonicalProduct: mongoose.trusted({ $in: activeProductIds }),
            status: PRODUCT_STATUS.ACTIVE,
            identityActive: true,
        }).distinct('_id')
        : [];

    const activeCatalogEntries = activeVariantIds.length > 0
        ? await WorkspaceProduct.countDocuments({
            workspace: workspaceId,
            productVariant: mongoose.trusted({ $in: activeVariantIds }),
            status: WORKSPACE_PRODUCT_STATUS.ACTIVE,
        })
        : 0;

    return { activeCatalogEntries };
};

const buildProductSearchFilter = ({
    workspaceId,
    categoryId,
    q,
    includeArchived = false,
}) => {
    void workspaceId;

    const visibility = {
        status: mongoose.trusted({
            $in: [
                PRODUCT_STATUS.ACTIVE,
                ...(includeArchived ? [PRODUCT_STATUS.ARCHIVED] : []),
            ],
        }),
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

const compareProductVariants = (left, right, productOrder) => {
    const productDifference = (
        productOrder.get(left.canonicalProduct.toString())
        - productOrder.get(right.canonicalProduct.toString())
    );
    if (productDifference !== 0) return productDifference;

    const presentationOf = (variant) => (
        variant.characteristics?.find(
            ({ kind }) => kind === PRODUCT_CHARACTERISTIC_KIND.PRESENTATION,
        )?.name ?? ''
    );

    return (
        presentationOf(left).localeCompare(presentationOf(right), 'fr')
        || Number(left.foodRange ?? 0) - Number(right.foodRange ?? 0)
        || String(left.normalizedProcessingState ?? '').localeCompare(
            String(right.normalizedProcessingState ?? ''),
            'fr',
        )
        || left._id.toString().localeCompare(right._id.toString())
    );
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
        includeArchived: false,
    });

    const products = await CanonicalProduct.find(productFilter)
        .select(
            '_id name normalizedName aliases category status searchKeys createdAt updatedAt',
        )
        .populate('category')
        .sort({ normalizedName: 1, _id: 1 })
        .lean();

    const normalizedQuery = q ? normalizeProductText(q) : null;
    const filteredProducts = normalizedQuery
        ? products.filter((product) => (
            product.searchKeys ?? []
        ).some((key) => productSearchValueContainedInQuery(q, key)))
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

    const productOrder = new Map(
        productIds.map((productId, index) => [productId.toString(), index]),
    );
    const variantVisibility = {
        canonicalProduct: mongoose.trusted({ $in: productIds }),
        identityActive: true,
        status: PRODUCT_STATUS.ACTIVE,
    };
    const variants = await ProductVariant.find(variantVisibility)
        .populate('variety')
        .populate('characteristics')
        .lean();
    const orderedVariants = variants
        .filter((variant) => {
            if (!q) return true;

            const product = productById.get(
                variant.canonicalProduct.toString(),
            );
            const foodRangeDefinition = variant.foodRange
                ? PRODUCT_FOOD_RANGE_REGISTRY[variant.foodRange]
                : null;
            const values = [
                ...(product?.searchKeys ?? []),
                ...(variant.variety?.searchKeys ?? []),
                variant.variety?.name,
                ...(variant.characteristics ?? []).flatMap(
                    (characteristic) => [
                        ...(characteristic.searchKeys ?? []),
                        characteristic.name,
                    ],
                ),
                foodRangeDefinition?.label,
                foodRangeDefinition?.name,
                foodRangeDefinition?.defaultProcessingState,
                ...(foodRangeDefinition?.processingStates ?? []),
                variant.processingState,
            ].filter(Boolean);

            return matchesProductSearchValues(q, values);
        })
        .sort(
            (left, right) => compareProductVariants(
                left,
                right,
                productOrder,
            ),
        );

    if (scope === 'WORKSPACE') {
        const entries = await WorkspaceProduct.find({
            workspace: workspaceId,
            productVariant: mongoose.trusted({
                $in: orderedVariants.map(({ _id }) => _id),
            }),
            ...(status
                ? { status }
                : { status: WORKSPACE_PRODUCT_STATUS.ACTIVE }),
        }).lean();
        const entryByVariantId = new Map(
            entries.map((entry) => [entry.productVariant.toString(), entry]),
        );
        const workspaceVariants = orderedVariants.filter(
            (variant) => entryByVariantId.has(variant._id.toString()),
        );
        const total = workspaceVariants.length;
        const pagedVariants = workspaceVariants.slice(
            (page - 1) * limit,
            page * limit,
        );

        return {
            results: pagedVariants.map((variant) => serializeSearchResult({
                product: productById.get(variant.canonicalProduct.toString()),
                variant,
                workspaceEntry: entryByVariantId.get(variant._id.toString()),
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    const total = orderedVariants.length;
    const pagedVariants = orderedVariants.slice(
        (page - 1) * limit,
        page * limit,
    );
    const entries = await WorkspaceProduct.find({
        workspace: workspaceId,
        productVariant: mongoose.trusted({
            $in: pagedVariants.map(({ _id }) => _id),
        }),
    }).lean();
    const entryByVariantId = new Map(
        entries.map((entry) => [entry.productVariant.toString(), entry]),
    );

    return {
        results: pagedVariants.map((variant) => serializeSearchResult({
            product: productById.get(variant.canonicalProduct.toString()),
            variant,
            workspaceEntry: entryByVariantId.get(variant._id.toString()) ?? null,
        })),
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
        status: mongoose.trusted({
            $in: [
                PRODUCT_STATUS.ACTIVE,
                PRODUCT_STATUS.ARCHIVED,
            ],
        }),
    })
        .populate('category')
        .lean();

    if (!product) {
        throw new AppError('Produit introuvable.', 404);
    }

    const variants = await ProductVariant.find({
        canonicalProduct: product._id,
        identityActive: true,
        status: mongoose.trusted({
            $in: [
                PRODUCT_STATUS.ACTIVE,
                PRODUCT_STATUS.ARCHIVED,
            ],
        }),
    })
        .populate('variety')
        .populate('characteristics')
        .sort({ createdAt: 1, _id: 1 })
        .lean();

    const entries = await WorkspaceProduct.find({
        workspace: workspaceId,
        productVariant: mongoose.trusted({
            $in: variants.map(({ _id }) => _id),
        }),
    }).lean();
    const entryByVariantId = new Map(
        entries.map((entry) => [entry.productVariant.toString(), entry]),
    );

    const visibleVariants = variants.filter((variant) => (
        variant.status === PRODUCT_STATUS.ACTIVE
        || entryByVariantId.has(variant._id.toString())
    ));

    if (
        product.status === PRODUCT_STATUS.ARCHIVED
        && visibleVariants.every(
            (variant) => !entryByVariantId.has(variant._id.toString()),
        )
    ) {
        throw new AppError('Produit introuvable.', 404);
    }

    return {
        product: serializeProduct(product),
        variants: visibleVariants.map((variant) => ({
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

const createWorkspaceProduct = async ({
    workspaceId,
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
                status: PRODUCT_STATUS.ACTIVE,
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
    });

    await createProductReferenceEvent({
        actorId,
        workspaceId,
        action: PRODUCT_REFERENCE_EVENT_ACTION.PRODUCT_CREATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT,
        entityId: product._id,
        metadata: { variantId: createdVariant._id.toString() },
        session,
    });

    await createProductReferenceEvent({
        actorId,
        workspaceId,
        action: PRODUCT_REFERENCE_EVENT_ACTION.VARIANT_CREATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIANT,
        entityId: createdVariant._id,
        metadata: { productId: product._id.toString() },
        session,
    });

    await createBusinessActivityEvent({
        workspaceId,
        actorId,
        action: BUSINESS_ACTIVITY_ACTION.PRODUCT_REFERENCE_CREATED,
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

const createWorkspaceVariant = async ({
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
    });

    await createProductReferenceEvent({
        actorId,
        workspaceId,
        action: PRODUCT_REFERENCE_EVENT_ACTION.VARIANT_CREATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIANT,
        entityId: createdVariant._id,
        metadata: { productId: product._id.toString() },
        session,
    });

    await createBusinessActivityEvent({
        workspaceId,
        actorId,
        action: BUSINESS_ACTIVITY_ACTION.PRODUCT_VARIANT_CREATED,
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
        throw new AppError('Référence absente du référentiel Workspace.', 404);
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
    createProductVariantInSession,
    createWorkspaceProduct,
    createWorkspaceVariant,
    findProductDuplicateCandidates,
    getProductMetadata,
    getWorkspaceProductDetail,
    getWorkspaceProductSummary,
    listProductSearch,
    normalizeVariantInput,
};
