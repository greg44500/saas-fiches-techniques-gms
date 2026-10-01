import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import { CanonicalProduct } from './canonicalProduct.model.js';
import {
    PRODUCT_GOVERNANCE_STATUS,
    PRODUCT_REFERENCE_EVENT_ACTION,
    PRODUCT_REFERENCE_EVENT_ENTITY_TYPE,
} from './productCatalog.registry.js';
import { ProductCharacteristic } from './productCharacteristic.model.js';
import {
    createProductReferenceEvent,
} from './productReferenceEvent.service.js';
import { ProductReferenceEvent } from './productReferenceEvent.model.js';
import { ProductVariety } from './productVariety.model.js';

const toObjectId = (value) => (
    value instanceof mongoose.Types.ObjectId
        ? value
        : new mongoose.Types.ObjectId(value)
);

const emptyReviewSummary = () => ({
    pendingCount: 0,
    reviewedAt: null,
    newVarietyIds: [],
    newCharacteristicIds: [],
});

const getProductDimensionReviewSummaries = async ({
    productIds,
}) => {
    if (!Array.isArray(productIds) || productIds.length === 0) {
        return new Map();
    }

    const objectIds = productIds.map(toObjectId);
    const reviewRows = await ProductReferenceEvent.aggregate([
        {
            $match: {
                action:
                    PRODUCT_REFERENCE_EVENT_ACTION
                        .PRODUCT_DIMENSIONS_REVIEWED,
                entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT,
                entityId: { $in: objectIds },
            },
        },
        { $sort: { createdAt: -1, _id: -1 } },
        {
            $group: {
                _id: '$entityId',
                reviewedAt: { $first: '$createdAt' },
            },
        },
    ]);

    const reviewedAtByProductId = new Map(
        reviewRows.map((row) => [
            row._id.toString(),
            row.reviewedAt,
        ]),
    );

    const dimensionFilter = {
        canonicalProduct: mongoose.trusted({ $in: objectIds }),
        identityActive: true,
        governanceStatus: mongoose.trusted({
            $in: [
                PRODUCT_GOVERNANCE_STATUS.APPROVED,
                PRODUCT_GOVERNANCE_STATUS.PROVISIONAL,
            ],
        }),
        contributedFromWorkspace: mongoose.trusted({ $ne: null }),
    };

    const [varieties, characteristics] = await Promise.all([
        ProductVariety.find(dimensionFilter)
            .select('_id canonicalProduct createdAt')
            .lean(),
        ProductCharacteristic.find(dimensionFilter)
            .select('_id canonicalProduct createdAt')
            .lean(),
    ]);

    const summaries = new Map(
        objectIds.map((productId) => [
            productId.toString(),
            {
                ...emptyReviewSummary(),
                reviewedAt:
                    reviewedAtByProductId.get(productId.toString()) ?? null,
            },
        ]),
    );

    const addDimension = ({
        dimension,
        targetKey,
    }) => {
        const productId = dimension.canonicalProduct.toString();
        const summary = summaries.get(productId);
        if (!summary) return;

        if (
            summary.reviewedAt
            && dimension.createdAt <= summary.reviewedAt
        ) {
            return;
        }

        summary[targetKey].push(dimension._id.toString());
        summary.pendingCount += 1;
    };

    for (const variety of varieties) {
        addDimension({
            dimension: variety,
            targetKey: 'newVarietyIds',
        });
    }
    for (const characteristic of characteristics) {
        addDimension({
            dimension: characteristic,
            targetKey: 'newCharacteristicIds',
        });
    }

    return summaries;
};

const getProductDimensionReviewSummary = async ({
    productId,
}) => {
    const summaries = await getProductDimensionReviewSummaries({
        productIds: [productId],
    });

    return summaries.get(productId.toString()) ?? emptyReviewSummary();
};

const markProductDimensionsReviewed = async ({
    actorId,
    productId,
}) => mongoose.connection.transaction(async (session) => {
    const product = await CanonicalProduct.findOne({
        _id: productId,
        identityActive: true,
    }).session(session);

    if (!product) {
        throw new AppError('Produit introuvable.', 404);
    }

    const event = await createProductReferenceEvent({
        actorId,
        action:
            PRODUCT_REFERENCE_EVENT_ACTION.PRODUCT_DIMENSIONS_REVIEWED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT,
        entityId: product._id,
        metadata: {
            reviewScope: 'WORKSPACE_DIMENSIONS',
        },
        session,
    });

    return {
        pendingCount: 0,
        reviewedAt: event.createdAt,
    };
});

export {
    getProductDimensionReviewSummaries,
    getProductDimensionReviewSummary,
    markProductDimensionsReviewed,
};
