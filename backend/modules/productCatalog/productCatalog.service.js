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
    PRODUCT_CATEGORY_STATUS_REGISTRY,
    PRODUCT_CHARACTERISTIC_KIND,
    PRODUCT_CHARACTERISTIC_KIND_REGISTRY,
    PRODUCT_CONTRIBUTION_CLASSIFICATION_REGISTRY,
    PRODUCT_CONTRIBUTION_STATUS_REGISTRY,
    PRODUCT_CONSERVATION_TYPE,
    PRODUCT_CONSERVATION_TYPE_REGISTRY,
    PRODUCT_CONTRIBUTION_TYPE_REGISTRY,
    PRODUCT_FOOD_RANGE_REGISTRY,
    PRODUCT_FOOD_RANGES,
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
    serializeVariant,
    serializeWorkspaceProduct,
} from './productCatalog.serializer.js';
import {
    createProductReferenceEvent,
} from './productReferenceEvent.service.js';
import { ProductVariant } from './productVariant.model.js';
import { ProductVariety } from './productVariety.model.js';
import { WorkspaceProduct } from './workspaceProduct.model.js';
import {
    canonicalProductMatchesSearch,
    compareProductVariants,
    productVariantMatchesSearch,
} from './productCatalogSearch.js';
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
    const name = String(variant.name ?? '').trim();
    const normalizedName = normalizeProductText(name);

    if (!name || !normalizedName) {
        throw new AppError('Le nom de la référence Produit est obligatoire.', 409);
    }

    if (!Object.values(PRODUCT_CONSERVATION_TYPE).includes(
        variant.conservationType,
    )) {
        throw new AppError('Conservation Produit invalide.', 409);
    }

    const foodRange = variant.foodRange ?? null;
    if (
        foodRange !== null
        && !PRODUCT_FOOD_RANGES.includes(Number(foodRange))
    ) {
        throw new AppError('Gamme Produit invalide.', 409);
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
                'Une référence ne peut contenir qu’une Présentation.',
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
                'Une référence ne peut contenir plusieurs Caractéristiques du même type.',
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
    const processingState = variant.processingState ?? null;

    const normalized = {
        name,
        normalizedName,
        variety: variety?._id ?? null,
        characteristics: orderedCharacteristics.map(({ _id }) => _id),
        processingState,
        normalizedProcessingState: normalizeProductText(processingState),
        conservationType: variant.conservationType,
        foodRange,
        referenceUnit: variant.referenceUnit,
        yieldPercent: variant.yieldPercent ?? null,
    };

    return {
        ...normalized,
        normalizedSignature: buildVariantSignature({
            name: normalized.name,
            varietyId: normalized.variety,
            characteristics: orderedCharacteristics,
        }),
    };
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
        normalizedName: normalized.normalizedName,
        identityActive: true,
    }).session(session);

    if (existing) {
        throw new AppError('Cette référence Produit existe déjà.', 409);
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
        throw new AppError('Référence Produit introuvable.', 404);
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
        productContributionClassifications: Object.values(
            PRODUCT_CONTRIBUTION_CLASSIFICATION_REGISTRY,
        ),
        productContributionStatuses: Object.values(
            PRODUCT_CONTRIBUTION_STATUS_REGISTRY,
        ),
        productContributionTypes: Object.values(
            PRODUCT_CONTRIBUTION_TYPE_REGISTRY,
        ),
        referenceUnits: Object.values(PRODUCT_REFERENCE_UNIT_REGISTRY),
        conservationTypes: Object.values(PRODUCT_CONSERVATION_TYPE_REGISTRY),
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
    categoryId,
    includeArchived = false,
}) => {
    const filter = {
        identityActive: true,
        status: mongoose.trusted({
            $in: [
                PRODUCT_STATUS.ACTIVE,
                ...(includeArchived ? [PRODUCT_STATUS.ARCHIVED] : []),
            ],
        }),
    };

    if (categoryId) {
        filter.category = asObjectId(categoryId);
    }

    return filter;
};

const compareProductSearchReferences = (
    left,
    right,
    sort = 'NAME',
) => {
    if (sort === 'FOOD_RANGE') {
        const leftRange = left.variant?.foodRange ?? Number.POSITIVE_INFINITY;
        const rightRange = right.variant?.foodRange ?? Number.POSITIVE_INFINITY;
        if (leftRange !== rightRange) return leftRange - rightRange;
    }

    const leftName = left.variant?.normalizedName
        ?? left.product.normalizedName
        ?? normalizeProductText(left.variant?.name ?? left.product.name);
    const rightName = right.variant?.normalizedName
        ?? right.product.normalizedName
        ?? normalizeProductText(right.variant?.name ?? right.product.name);
    const referenceComparison = leftName.localeCompare(rightName, 'fr');

    if (referenceComparison !== 0) return referenceComparison;

    if (!left.variant && !right.variant) {
        return left.product._id.toString().localeCompare(
            right.product._id.toString(),
        );
    }
    if (!left.variant) return -1;
    if (!right.variant) return 1;

    return compareProductVariants(left.variant, right.variant);
};

const paginateProductSearchReferences = ({
    references,
    page,
    limit,
}) => {
    const total = references.length;

    return {
        pageReferences: references.slice(
            (page - 1) * limit,
            page * limit,
        ),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const serializeProductSearchReference = ({
    reference,
    entryByVariantId = new Map(),
}) => ({
    source: reference.variant ? 'PRODUCT_VARIANT' : 'CANONICAL_PRODUCT',
    product: serializeProduct(reference.product),
    variant: reference.variant
        ? serializeVariant(reference.variant)
        : null,
    workspaceEntry: reference.variant
        ? serializeWorkspaceProduct(
            entryByVariantId.get(reference.variant._id.toString()) ?? null,
        )
        : null,
});

const listProductSearch = async ({
    workspaceId,
    scope = 'WORKSPACE',
    q = null,
    categoryId = null,
    status = null,
    conservationType = null,
    foodRange = null,
    sort = 'NAME',
    page = 1,
    limit = 20,
}) => {
    const products = await CanonicalProduct.find(
        buildProductSearchFilter({
            categoryId,
            includeArchived: false,
        }),
    )
        .select(
            '_id name normalizedName aliases category status searchKeys createdAt updatedAt',
        )
        .populate('category')
        .sort({ normalizedName: 1, _id: 1 })
        .lean();

    const productById = new Map(
        products.map((product) => [product._id.toString(), product]),
    );
    const productIds = products.map(({ _id }) => _id);

    if (productIds.length === 0) {
        return {
            results: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
        };
    }

    const variants = await ProductVariant.find({
        canonicalProduct: mongoose.trusted({ $in: productIds }),
        identityActive: true,
        status: PRODUCT_STATUS.ACTIVE,
    })
        .populate('variety')
        .populate('characteristics')
        .lean();

    const matchingVariants = variants.filter((variant) => (
        (
            conservationType === null
            || conservationType === undefined
            || variant.conservationType === conservationType
        )
        && (
            foodRange === null
            || foodRange === undefined
            || Number(variant.foodRange) === Number(foodRange)
        )
        && productVariantMatchesSearch({
            query: q,
            product: productById.get(variant.canonicalProduct.toString()),
            variant,
        })
    ));

    if (scope === 'WORKSPACE') {
        const entries = matchingVariants.length > 0
            ? await WorkspaceProduct.find({
                workspace: workspaceId,
                productVariant: mongoose.trusted({
                    $in: matchingVariants.map(({ _id }) => _id),
                }),
                ...(status
                    ? { status }
                    : { status: WORKSPACE_PRODUCT_STATUS.ACTIVE }),
            }).lean()
            : [];
        const entryByVariantId = new Map(
            entries.map((entry) => [entry.productVariant.toString(), entry]),
        );

        const references = matchingVariants
            .filter((variant) => entryByVariantId.has(variant._id.toString()))
            .map((variant) => ({
                product: productById.get(variant.canonicalProduct.toString()),
                variant,
            }))
            .sort((left, right) => (
                compareProductSearchReferences(left, right, sort)
            ));

        const {
            pageReferences,
            pagination,
        } = paginateProductSearchReferences({
            references,
            page,
            limit,
        });

        return {
            results: pageReferences.map((reference) => (
                serializeProductSearchReference({
                    reference,
                    entryByVariantId,
                })
            )),
            pagination,
        };
    }

    const variantProductIds = new Set(
        variants.map(({ canonicalProduct }) => canonicalProduct.toString()),
    );
    const references = matchingVariants.map((variant) => ({
        product: productById.get(variant.canonicalProduct.toString()),
        variant,
    }));

    if (foodRange === null || foodRange === undefined) {
        for (const product of products) {
            if (variantProductIds.has(product._id.toString())) continue;
            if (q && !canonicalProductMatchesSearch(q, product)) continue;

            references.push({ product, variant: null });
        }
    }

    references.sort((left, right) => (
        compareProductSearchReferences(left, right, sort)
    ));

    const {
        pageReferences,
        pagination,
    } = paginateProductSearchReferences({
        references,
        page,
        limit,
    });
    const pagedVariantIds = pageReferences
        .filter(({ variant }) => Boolean(variant))
        .map(({ variant }) => variant._id);

    const entries = pagedVariantIds.length > 0
        ? await WorkspaceProduct.find({
            workspace: workspaceId,
            productVariant: mongoose.trusted({
                $in: pagedVariantIds,
            }),
        }).lean()
        : [];
    const entryByVariantId = new Map(
        entries.map((entry) => [entry.productVariant.toString(), entry]),
    );

    return {
        results: pageReferences.map((reference) => (
            serializeProductSearchReference({
                reference,
                entryByVariantId,
            })
        )),
        pagination,
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
    createWorkspaceVariant,
    findProductDuplicateCandidates,
    getProductMetadata,
    getWorkspaceProductDetail,
    getWorkspaceProductSummary,
    listProductSearch,
    normalizeVariantInput,
};
