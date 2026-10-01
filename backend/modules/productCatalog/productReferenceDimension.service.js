import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import { CanonicalProduct } from './canonicalProduct.model.js';
import {
    buildSearchGrams,
    buildSearchKeys,
    normalizeProductText,
} from './productCatalog.normalization.js';
import {
    PRODUCT_CHARACTERISTIC_KIND,
    PRODUCT_DIMENSION_REVIEW_STATUS,
    PRODUCT_GOVERNANCE_STATUS,
    PRODUCT_REFERENCE_EVENT_ACTION,
    PRODUCT_REFERENCE_EVENT_ENTITY_TYPE,
    PRODUCT_STATUS,
} from './productCatalog.registry.js';
import {
    serializeCharacteristic,
    serializeVariety,
} from './productCatalog.serializer.js';
import {
    buildPlatformGovernanceVisibilityFilter,
    buildWorkspaceGovernanceVisibilityFilter,
} from './productReferenceGovernance.service.js';
import {
    createProductReferenceEvent,
} from './productReferenceEvent.service.js';
import { ProductCharacteristic } from './productCharacteristic.model.js';
import { ProductVariant } from './productVariant.model.js';
import { ProductVariety } from './productVariety.model.js';

const assertProductAvailable = async ({
    productId,
    session,
    activeOnly = true,
}) => {
    const product = await CanonicalProduct.findOne({
        _id: productId,
        identityActive: true,
        ...(activeOnly
            ? { status: PRODUCT_STATUS.ACTIVE }
            : {
                status: mongoose.trusted({
                    $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
                }),
            }),
    }).session(session);

    if (!product) {
        throw new AppError('Produit parent indisponible.', 404);
    }

    return product;
};

const createProductVarietyInSession = async ({
    actorId,
    productId,
    name,
    aliases = [],
    workspaceId = null,
    governanceStatus = PRODUCT_GOVERNANCE_STATUS.APPROVED,
    session,
}) => {
    await assertProductAvailable({ productId, session });
    const normalizedName = normalizeProductText(name);
    const existing = await ProductVariety.findOne({
        canonicalProduct: productId,
        normalizedName,
        identityActive: true,
        governanceStatus,
        ...(governanceStatus === PRODUCT_GOVERNANCE_STATUS.PROVISIONAL
            ? { contributedFromWorkspace: workspaceId }
            : {}),
    }).session(session);

    if (existing) {
        throw new AppError('Cette Variété existe déjà pour ce Produit.', 409);
    }

    const searchKeys = buildSearchKeys(name, aliases);
    let variety;
    try {
        [variety] = await ProductVariety.create([
            {
                canonicalProduct: productId,
                name,
                normalizedName,
                aliases,
                searchKeys,
                searchGrams: buildSearchGrams(searchKeys),
                status: PRODUCT_STATUS.ACTIVE,
                governanceStatus,
                contributedFromWorkspace: workspaceId,
                qualityReviewStatus: workspaceId
                    ? PRODUCT_DIMENSION_REVIEW_STATUS.PENDING
                    : PRODUCT_DIMENSION_REVIEW_STATUS.NOT_REQUIRED,
                createdBy: actorId,
                updatedBy: actorId,
            },
        ], { session });
    } catch (error) {
        if (error?.code === 11000) {
            throw new AppError(
                'Cette Variété existe déjà pour ce Produit.',
                409,
            );
        }
        throw error;
    }

    await createProductReferenceEvent({
        actorId,
        workspaceId,
        action: PRODUCT_REFERENCE_EVENT_ACTION.VARIETY_CREATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIETY,
        entityId: variety._id,
        metadata: { productId: productId.toString() },
        session,
    });

    return variety;
};

const createProductCharacteristicInSession = async ({
    actorId,
    productId,
    kind,
    name,
    aliases = [],
    workspaceId = null,
    governanceStatus = PRODUCT_GOVERNANCE_STATUS.APPROVED,
    session,
}) => {
    await assertProductAvailable({ productId, session });

    if (!Object.values(PRODUCT_CHARACTERISTIC_KIND).includes(kind)) {
        throw new AppError('Type de Caractéristique Produit invalide.', 400);
    }

    const normalizedName = normalizeProductText(name);
    const existing = await ProductCharacteristic.findOne({
        canonicalProduct: productId,
        kind,
        normalizedName,
        identityActive: true,
        governanceStatus,
        ...(governanceStatus === PRODUCT_GOVERNANCE_STATUS.PROVISIONAL
            ? { contributedFromWorkspace: workspaceId }
            : {}),
    }).session(session);

    if (existing) {
        throw new AppError(
            'Cette Caractéristique existe déjà pour ce Produit.',
            409,
        );
    }

    const searchKeys = buildSearchKeys(name, aliases);
    let characteristic;
    try {
        [characteristic] = await ProductCharacteristic.create([
            {
                canonicalProduct: productId,
                kind,
                name,
                normalizedName,
                aliases,
                searchKeys,
                searchGrams: buildSearchGrams(searchKeys),
                status: PRODUCT_STATUS.ACTIVE,
                governanceStatus,
                contributedFromWorkspace: workspaceId,
                qualityReviewStatus: workspaceId
                    ? PRODUCT_DIMENSION_REVIEW_STATUS.PENDING
                    : PRODUCT_DIMENSION_REVIEW_STATUS.NOT_REQUIRED,
                createdBy: actorId,
                updatedBy: actorId,
            },
        ], { session });
    } catch (error) {
        if (error?.code === 11000) {
            throw new AppError(
                'Cette Caractéristique existe déjà pour ce Produit.',
                409,
            );
        }
        throw error;
    }

    await createProductReferenceEvent({
        actorId,
        workspaceId,
        action: PRODUCT_REFERENCE_EVENT_ACTION.CHARACTERISTIC_CREATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CHARACTERISTIC,
        entityId: characteristic._id,
        metadata: {
            productId: productId.toString(),
            kind,
        },
        session,
    });

    return characteristic;
};

const createProductVariety = (payload) => (
    mongoose.connection.transaction(async (session) => (
        serializeVariety(await createProductVarietyInSession({
            ...payload,
            session,
        }))
    ))
);

const createProductCharacteristic = (payload) => (
    mongoose.connection.transaction(async (session) => (
        serializeCharacteristic(await createProductCharacteristicInSession({
            ...payload,
            session,
        }))
    ))
);

const listProductDimensions = async ({
    productId,
    workspaceId = null,
    includeArchived = false,
    includeProvisional = false,
}) => {
    const product = await CanonicalProduct.findOne({
        _id: productId,
        identityActive: true,
        status: mongoose.trusted({
            $in: [
                PRODUCT_STATUS.ACTIVE,
                ...(includeArchived ? [PRODUCT_STATUS.ARCHIVED] : []),
            ],
        }),
    }).lean();

    if (!product) {
        throw new AppError('Produit introuvable.', 404);
    }

    const statusFilter = mongoose.trusted({
        $in: [
            PRODUCT_STATUS.ACTIVE,
            ...(includeArchived ? [PRODUCT_STATUS.ARCHIVED] : []),
        ],
    });
    const governanceFilter = includeProvisional
        ? buildPlatformGovernanceVisibilityFilter()
        : buildWorkspaceGovernanceVisibilityFilter(workspaceId);

    const [varieties, characteristics] = await Promise.all([
        ProductVariety.find({
            canonicalProduct: productId,
            identityActive: true,
            status: statusFilter,
            ...governanceFilter,
        }).sort({ normalizedName: 1, _id: 1 }).lean(),
        ProductCharacteristic.find({
            canonicalProduct: productId,
            identityActive: true,
            status: statusFilter,
            ...governanceFilter,
        }).sort({ kind: 1, normalizedName: 1, _id: 1 }).lean(),
    ]);

    return {
        varieties: varieties.map(serializeVariety),
        characteristics: characteristics.map(serializeCharacteristic),
    };
};

const updateProductVariety = async ({
    actorId,
    productId,
    varietyId,
    name,
    aliases,
}) => mongoose.connection.transaction(async (session) => {
    await assertProductAvailable({
        productId,
        session,
        activeOnly: false,
    });
    const variety = await ProductVariety.findOne({
        _id: varietyId,
        canonicalProduct: productId,
        identityActive: true,
        status: mongoose.trusted({
            $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
        }),
    }).session(session);

    if (!variety) throw new AppError('Variété introuvable.', 404);

    const nextName = name ?? variety.name;
    const nextAliases = aliases ?? variety.aliases;
    const normalizedName = normalizeProductText(nextName);
    const duplicate = await ProductVariety.findOne({
        _id: mongoose.trusted({ $ne: variety._id }),
        canonicalProduct: productId,
        normalizedName,
        identityActive: true,
    }).session(session);

    if (duplicate) {
        throw new AppError('Cette Variété existe déjà pour ce Produit.', 409);
    }

    const searchKeys = buildSearchKeys(nextName, nextAliases);
    const wasPendingReview = (
        variety.qualityReviewStatus
        === PRODUCT_DIMENSION_REVIEW_STATUS.PENDING
    );
    variety.name = nextName;
    variety.normalizedName = normalizedName;
    variety.aliases = nextAliases;
    variety.searchKeys = searchKeys;
    variety.searchGrams = buildSearchGrams(searchKeys);
    if (
        variety.qualityReviewStatus
        === PRODUCT_DIMENSION_REVIEW_STATUS.PENDING
    ) {
        variety.qualityReviewStatus =
            PRODUCT_DIMENSION_REVIEW_STATUS.REVIEWED;
        variety.qualityReviewedAt = new Date();
        variety.qualityReviewedBy = actorId;
    }
    variety.updatedBy = actorId;
    await variety.save({ session });

    await createProductReferenceEvent({
        actorId,
        action: PRODUCT_REFERENCE_EVENT_ACTION.VARIETY_UPDATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIETY,
        entityId: variety._id,
        metadata: { productId: productId.toString() },
        session,
    });

    if (wasPendingReview) {
        await createProductReferenceEvent({
            actorId,
            action:
                PRODUCT_REFERENCE_EVENT_ACTION.PRODUCT_DIMENSION_REVIEWED,
            entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT,
            entityId: productId,
            metadata: {
                dimensionType: 'VARIETY',
                dimensionId: variety._id.toString(),
                dimensionName: variety.name,
                reviewReason: 'CORRECTED',
            },
            session,
        });
    }

    return serializeVariety(variety);
});

const updateProductCharacteristic = async ({
    actorId,
    productId,
    characteristicId,
    name,
    aliases,
}) => mongoose.connection.transaction(async (session) => {
    await assertProductAvailable({
        productId,
        session,
        activeOnly: false,
    });
    const characteristic = await ProductCharacteristic.findOne({
        _id: characteristicId,
        canonicalProduct: productId,
        identityActive: true,
        status: mongoose.trusted({
            $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
        }),
    }).session(session);

    if (!characteristic) {
        throw new AppError('Caractéristique Produit introuvable.', 404);
    }

    const nextName = name ?? characteristic.name;
    const nextAliases = aliases ?? characteristic.aliases;
    const normalizedName = normalizeProductText(nextName);
    const duplicate = await ProductCharacteristic.findOne({
        _id: mongoose.trusted({ $ne: characteristic._id }),
        canonicalProduct: productId,
        kind: characteristic.kind,
        normalizedName,
        identityActive: true,
    }).session(session);

    if (duplicate) {
        throw new AppError(
            'Cette Caractéristique existe déjà pour ce Produit.',
            409,
        );
    }

    const searchKeys = buildSearchKeys(nextName, nextAliases);
    const wasPendingReview = (
        characteristic.qualityReviewStatus
        === PRODUCT_DIMENSION_REVIEW_STATUS.PENDING
    );
    characteristic.name = nextName;
    characteristic.normalizedName = normalizedName;
    characteristic.aliases = nextAliases;
    characteristic.searchKeys = searchKeys;
    characteristic.searchGrams = buildSearchGrams(searchKeys);
    if (
        characteristic.qualityReviewStatus
        === PRODUCT_DIMENSION_REVIEW_STATUS.PENDING
    ) {
        characteristic.qualityReviewStatus =
            PRODUCT_DIMENSION_REVIEW_STATUS.REVIEWED;
        characteristic.qualityReviewedAt = new Date();
        characteristic.qualityReviewedBy = actorId;
    }
    characteristic.updatedBy = actorId;
    await characteristic.save({ session });

    await createProductReferenceEvent({
        actorId,
        action: PRODUCT_REFERENCE_EVENT_ACTION.CHARACTERISTIC_UPDATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CHARACTERISTIC,
        entityId: characteristic._id,
        metadata: {
            productId: productId.toString(),
            kind: characteristic.kind,
        },
        session,
    });

    if (wasPendingReview) {
        await createProductReferenceEvent({
            actorId,
            action:
                PRODUCT_REFERENCE_EVENT_ACTION.PRODUCT_DIMENSION_REVIEWED,
            entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT,
            entityId: productId,
            metadata: {
                dimensionType: 'CHARACTERISTIC',
                dimensionId: characteristic._id.toString(),
                dimensionName: characteristic.name,
                kind: characteristic.kind,
                reviewReason: 'CORRECTED',
            },
            session,
        });
    }

    return serializeCharacteristic(characteristic);
});

const updateProductVarietyStatus = async ({
    actorId,
    productId,
    varietyId,
    status,
}) => mongoose.connection.transaction(async (session) => {
    const product = await assertProductAvailable({
        productId,
        session,
        activeOnly: false,
    });
    const variety = await ProductVariety.findOne({
        _id: varietyId,
        canonicalProduct: productId,
        identityActive: true,
        status: mongoose.trusted({
            $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
        }),
    }).session(session);

    if (!variety) throw new AppError('Variété introuvable.', 404);
    if (variety.status === status) return serializeVariety(variety);

    if (status === PRODUCT_STATUS.ARCHIVED) {
        const used = await ProductVariant.exists({
            canonicalProduct: productId,
            variety: variety._id,
            identityActive: true,
            status: PRODUCT_STATUS.ACTIVE,
        }).session(session);
        if (used) {
            throw new AppError(
                'Cette Variété est utilisée par une référence active.',
                409,
            );
        }
    } else if (status === PRODUCT_STATUS.ACTIVE) {
        if (product.status !== PRODUCT_STATUS.ACTIVE) {
            throw new AppError(
                'Le Produit parent doit être actif pour réactiver la Variété.',
                409,
            );
        }
    } else {
        throw new AppError('Transition de statut Variété invalide.', 400);
    }

    variety.status = status;
    variety.updatedBy = actorId;
    await variety.save({ session });
    await createProductReferenceEvent({
        actorId,
        action: status === PRODUCT_STATUS.ARCHIVED
            ? PRODUCT_REFERENCE_EVENT_ACTION.VARIETY_ARCHIVED
            : PRODUCT_REFERENCE_EVENT_ACTION.VARIETY_REACTIVATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIETY,
        entityId: variety._id,
        metadata: { productId: productId.toString() },
        session,
    });

    return serializeVariety(variety);
});

const updateProductCharacteristicStatus = async ({
    actorId,
    productId,
    characteristicId,
    status,
}) => mongoose.connection.transaction(async (session) => {
    const product = await assertProductAvailable({
        productId,
        session,
        activeOnly: false,
    });
    const characteristic = await ProductCharacteristic.findOne({
        _id: characteristicId,
        canonicalProduct: productId,
        identityActive: true,
        status: mongoose.trusted({
            $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
        }),
    }).session(session);

    if (!characteristic) {
        throw new AppError('Caractéristique Produit introuvable.', 404);
    }
    if (characteristic.status === status) {
        return serializeCharacteristic(characteristic);
    }

    if (status === PRODUCT_STATUS.ARCHIVED) {
        const used = await ProductVariant.exists({
            canonicalProduct: productId,
            characteristics: characteristic._id,
            identityActive: true,
            status: PRODUCT_STATUS.ACTIVE,
        }).session(session);
        if (used) {
            throw new AppError(
                'Cette Caractéristique est utilisée par une référence active.',
                409,
            );
        }
    } else if (status === PRODUCT_STATUS.ACTIVE) {
        if (product.status !== PRODUCT_STATUS.ACTIVE) {
            throw new AppError(
                'Le Produit parent doit être actif pour réactiver la Caractéristique.',
                409,
            );
        }
    } else {
        throw new AppError(
            'Transition de statut Caractéristique invalide.',
            400,
        );
    }

    characteristic.status = status;
    characteristic.updatedBy = actorId;
    await characteristic.save({ session });
    await createProductReferenceEvent({
        actorId,
        action: status === PRODUCT_STATUS.ARCHIVED
            ? PRODUCT_REFERENCE_EVENT_ACTION.CHARACTERISTIC_ARCHIVED
            : PRODUCT_REFERENCE_EVENT_ACTION.CHARACTERISTIC_REACTIVATED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CHARACTERISTIC,
        entityId: characteristic._id,
        metadata: {
            productId: productId.toString(),
            kind: characteristic.kind,
        },
        session,
    });

    return serializeCharacteristic(characteristic);
});



const deleteProductDimension = async ({
    actorId,
    productId,
    type,
    dimensionId,
}) => mongoose.connection.transaction(async (session) => {
    await assertProductAvailable({
        productId,
        session,
        activeOnly: false,
    });

    const isVariety = type === 'VARIETY';
    const isCharacteristic = type === 'CHARACTERISTIC';
    if (!isVariety && !isCharacteristic) {
        throw new AppError('Type de dimension invalide.', 400);
    }

    const model = isVariety ? ProductVariety : ProductCharacteristic;
    const dimension = await model.findOne({
        _id: dimensionId,
        canonicalProduct: productId,
        identityActive: true,
    }).session(session);

    if (!dimension) {
        throw new AppError('Dimension Produit introuvable.', 404);
    }

    const usageFilter = {
        canonicalProduct: productId,
        ...(isVariety
            ? { variety: dimension._id }
            : { characteristics: dimension._id }),
    };
    const [usageCount, usedReferences] = await Promise.all([
        ProductVariant.countDocuments(usageFilter).session(session),
        ProductVariant.find(usageFilter)
            .select('name')
            .sort({ normalizedName: 1, _id: 1 })
            .limit(3)
            .session(session)
            .lean(),
    ]);

    if (usageCount > 0) {
        const names = usedReferences
            .map(({ name }) => name)
            .filter(Boolean)
            .join(', ');
        throw new AppError(
            'Cette valeur est utilisée par '
            + usageCount
            + ' Référence'
            + (usageCount > 1 ? 's' : '')
            + ' Produit'
            + (usageCount > 1 ? 's' : '')
            + (names ? ' : ' + names + '.' : '.'),
            409,
        );
    }

    const previousReviewStatus = dimension.qualityReviewStatus;
    dimension.status = PRODUCT_STATUS.ARCHIVED;
    dimension.identityActive = false;
    dimension.updatedBy = actorId;
    await dimension.save({ session });

    await createProductReferenceEvent({
        actorId,
        action: PRODUCT_REFERENCE_EVENT_ACTION.PRODUCT_DIMENSION_DELETED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT,
        entityId: productId,
        metadata: {
            dimensionType: type,
            dimensionId: dimension._id.toString(),
            dimensionName: dimension.name,
            previousReviewStatus,
            ...(isCharacteristic ? { kind: dimension.kind } : {}),
        },
        session,
    });

    return isVariety
        ? serializeVariety(dimension)
        : serializeCharacteristic(dimension);
});

const undoProductDimensionAddition = async ({
    actorId,
    workspaceId = null,
    productId,
    type,
    dimensionId,
}) => mongoose.connection.transaction(async (session) => {
    await assertProductAvailable({
        productId,
        session,
        activeOnly: false,
    });

    const isVariety = type === 'VARIETY';
    const isCharacteristic = type === 'CHARACTERISTIC';
    if (!isVariety && !isCharacteristic) {
        throw new AppError('Type de dimension invalide.', 400);
    }

    const model = isVariety ? ProductVariety : ProductCharacteristic;
    const dimension = await model.findOne({
        _id: dimensionId,
        canonicalProduct: productId,
        identityActive: true,
        status: PRODUCT_STATUS.ACTIVE,
        governanceStatus: PRODUCT_GOVERNANCE_STATUS.APPROVED,
        createdBy: actorId,
        contributedFromWorkspace: workspaceId,
    }).session(session);

    if (!dimension) {
        throw new AppError(
            'Cette valeur ne peut plus être retirée.',
            409,
        );
    }

    const used = await ProductVariant.exists({
        canonicalProduct: productId,
        ...(isVariety
            ? { variety: dimension._id }
            : { characteristics: dimension._id }),
    }).session(session);

    if (used) {
        throw new AppError(
            'Cette valeur est déjà utilisée par une Référence Produit.',
            409,
        );
    }

    dimension.status = PRODUCT_STATUS.ARCHIVED;
    dimension.identityActive = false;
    dimension.updatedBy = actorId;
    await dimension.save({ session });

    await createProductReferenceEvent({
        actorId,
        workspaceId,
        action: isVariety
            ? PRODUCT_REFERENCE_EVENT_ACTION.VARIETY_ARCHIVED
            : PRODUCT_REFERENCE_EVENT_ACTION.CHARACTERISTIC_ARCHIVED,
        entityType: isVariety
            ? PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIETY
            : PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CHARACTERISTIC,
        entityId: dimension._id,
        metadata: {
            productId: productId.toString(),
            reason: 'IMMEDIATE_UNDO',
        },
        session,
    });

    return isVariety
        ? serializeVariety(dimension)
        : serializeCharacteristic(dimension);
});

export {
    createProductCharacteristic,
    createProductCharacteristicInSession,
    createProductVariety,
    createProductVarietyInSession,
    deleteProductDimension,
    listProductDimensions,
    updateProductCharacteristic,
    undoProductDimensionAddition,
    updateProductCharacteristicStatus,
    updateProductVariety,
    updateProductVarietyStatus,
};
