import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import { CanonicalProduct } from './canonicalProduct.model.js';
import {
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
import { ProductCharacteristic } from './productCharacteristic.model.js';
import {
    createProductReferenceEvent,
} from './productReferenceEvent.service.js';
import { ProductVariety } from './productVariety.model.js';

const toObjectId = (value) => (
    value instanceof mongoose.Types.ObjectId
        ? value
        : new mongoose.Types.ObjectId(value)
);

const pendingDimensionFilter = (productIds) => ({
    canonicalProduct: mongoose.trusted({
        $in: productIds.map(toObjectId),
    }),
    identityActive: true,
    status: PRODUCT_STATUS.ACTIVE,
    qualityReviewStatus: PRODUCT_DIMENSION_REVIEW_STATUS.PENDING,
    governanceStatus: mongoose.trusted({
        $in: [
            PRODUCT_GOVERNANCE_STATUS.APPROVED,
            PRODUCT_GOVERNANCE_STATUS.PROVISIONAL,
        ],
    }),
    contributedFromWorkspace: mongoose.trusted({ $ne: null }),
});

const getProductDimensionReviewSummaries = async ({
    productIds,
}) => {
    if (!Array.isArray(productIds) || productIds.length === 0) {
        return new Map();
    }

    const ids = productIds.map(toObjectId);
    const filter = pendingDimensionFilter(ids);
    const [varietyCounts, characteristicCounts] = await Promise.all([
        ProductVariety.aggregate([
            { $match: filter },
            { $group: { _id: '$canonicalProduct', count: { $sum: 1 } } },
        ]),
        ProductCharacteristic.aggregate([
            { $match: filter },
            { $group: { _id: '$canonicalProduct', count: { $sum: 1 } } },
        ]),
    ]);

    const counts = new Map(
        ids.map((id) => [id.toString(), 0]),
    );
    for (const row of [...varietyCounts, ...characteristicCounts]) {
        const key = row._id.toString();
        counts.set(key, (counts.get(key) ?? 0) + row.count);
    }

    return new Map(
        [...counts.entries()].map(([productId, pendingCount]) => [
            productId,
            { pendingCount },
        ]),
    );
};

const markProductDimensionReviewed = async ({
    actorId,
    productId,
    type,
    dimensionId,
}) => mongoose.connection.transaction(async (session) => {
    const product = await CanonicalProduct.findOne({
        _id: productId,
        identityActive: true,
    }).session(session);

    if (!product) {
        throw new AppError('Produit introuvable.', 404);
    }

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
    }).session(session);

    if (!dimension) {
        throw new AppError('Dimension Produit introuvable.', 404);
    }

    if (
        dimension.qualityReviewStatus
        === PRODUCT_DIMENSION_REVIEW_STATUS.PENDING
    ) {
        dimension.qualityReviewStatus =
            PRODUCT_DIMENSION_REVIEW_STATUS.REVIEWED;
        dimension.qualityReviewedAt = new Date();
        dimension.qualityReviewedBy = actorId;
        dimension.updatedBy = actorId;
        await dimension.save({ session });

        await createProductReferenceEvent({
            actorId,
            action:
                PRODUCT_REFERENCE_EVENT_ACTION.PRODUCT_DIMENSION_REVIEWED,
            entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT,
            entityId: product._id,
            metadata: {
                dimensionType: type,
                dimensionId: dimension._id.toString(),
                dimensionName: dimension.name,
                ...(isCharacteristic ? { kind: dimension.kind } : {}),
            },
            session,
        });
    }

    return isVariety
        ? serializeVariety(dimension)
        : serializeCharacteristic(dimension);
});

export {
    getProductDimensionReviewSummaries,
    markProductDimensionReviewed,
};
