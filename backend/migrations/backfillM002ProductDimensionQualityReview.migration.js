import {
    PRODUCT_DIMENSION_REVIEW_STATUS,
} from '../modules/productCatalog/productCatalog.registry.js';
import {
    ProductCharacteristic,
} from '../modules/productCatalog/productCharacteristic.model.js';
import {
    ProductVariety,
} from '../modules/productCatalog/productVariety.model.js';

const backfillModel = async (model) => {
    const pending = await model.collection.updateMany(
        {
            qualityReviewStatus: { $exists: false },
            contributedFromWorkspace: { $type: 'objectId' },
        },
        {
            $set: {
                qualityReviewStatus:
                    PRODUCT_DIMENSION_REVIEW_STATUS.PENDING,
                qualityReviewedAt: null,
                qualityReviewedBy: null,
            },
        },
    );

    const notRequired = await model.collection.updateMany(
        {
            qualityReviewStatus: { $exists: false },
        },
        {
            $set: {
                qualityReviewStatus:
                    PRODUCT_DIMENSION_REVIEW_STATUS.NOT_REQUIRED,
                qualityReviewedAt: null,
                qualityReviewedBy: null,
            },
        },
    );

    return {
        model: model.modelName,
        pending: {
            matchedCount: pending.matchedCount,
            modifiedCount: pending.modifiedCount,
        },
        notRequired: {
            matchedCount: notRequired.matchedCount,
            modifiedCount: notRequired.modifiedCount,
        },
    };
};

const backfillM002ProductDimensionQualityReview = async () => (
    Promise.all([
        backfillModel(ProductVariety),
        backfillModel(ProductCharacteristic),
    ])
);

export { backfillM002ProductDimensionQualityReview };
