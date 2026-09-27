import mongoose from 'mongoose';

import {
    CanonicalProduct,
} from '../modules/productCatalog/canonicalProduct.model.js';
import {
    ProductCategory,
} from '../modules/productCatalog/productCategory.model.js';
import {
    PRODUCT_CATEGORY_STATUS,
    PRODUCT_STATUS,
} from '../modules/productCatalog/productCatalog.registry.js';
import {
    ProductVariant,
} from '../modules/productCatalog/productVariant.model.js';

const LEGACY_PRODUCT_STATUS = Object.freeze({
    PENDING_REVIEW: 'PENDING_REVIEW',
    REJECTED: 'REJECTED',
});

const updateIfAny = async ({
    model,
    ids,
    status,
    session,
}) => {
    if (ids.length === 0) {
        return { matchedCount: 0, modifiedCount: 0 };
    }

    return model.updateMany(
        {
            _id: mongoose.trusted({ $in: ids }),
        },
        {
            $set: { status },
        },
        {
            session,
            timestamps: false,
        },
    );
};

const backfillM002LegacyProductLifecycle = async () => (
    mongoose.connection.transaction(async (session) => {
        const activeCategoryIds = await ProductCategory.find({
            status: PRODUCT_CATEGORY_STATUS.ACTIVE,
        })
            .session(session)
            .distinct('_id');

        const activatablePendingProductIds = await CanonicalProduct.find({
            status: LEGACY_PRODUCT_STATUS.PENDING_REVIEW,
            identityActive: true,
            category: mongoose.trusted({ $in: activeCategoryIds }),
        })
            .session(session)
            .distinct('_id');

        const pendingProductIds = await CanonicalProduct.find({
            status: LEGACY_PRODUCT_STATUS.PENDING_REVIEW,
        })
            .session(session)
            .distinct('_id');

        const activatableIds = new Set(
            activatablePendingProductIds.map(String),
        );
        const pendingProductIdsToArchive = pendingProductIds.filter(
            (id) => !activatableIds.has(id.toString()),
        );

        const pendingProductsActivated = await updateIfAny({
            model: CanonicalProduct,
            ids: activatablePendingProductIds,
            status: PRODUCT_STATUS.ACTIVE,
            session,
        });
        const pendingProductsArchived = await updateIfAny({
            model: CanonicalProduct,
            ids: pendingProductIdsToArchive,
            status: PRODUCT_STATUS.ARCHIVED,
            session,
        });

        const rejectedProductsArchived = await CanonicalProduct.updateMany(
            {
                status: LEGACY_PRODUCT_STATUS.REJECTED,
            },
            {
                $set: { status: PRODUCT_STATUS.ARCHIVED },
            },
            {
                session,
                timestamps: false,
            },
        );

        const activeProductIds = await CanonicalProduct.find({
            status: PRODUCT_STATUS.ACTIVE,
            identityActive: true,
        })
            .session(session)
            .distinct('_id');

        const pendingVariantIdsToActivate = await ProductVariant.find({
            status: LEGACY_PRODUCT_STATUS.PENDING_REVIEW,
            identityActive: true,
            canonicalProduct: mongoose.trusted({ $in: activeProductIds }),
        })
            .session(session)
            .distinct('_id');

        const pendingVariantIds = await ProductVariant.find({
            status: LEGACY_PRODUCT_STATUS.PENDING_REVIEW,
        })
            .session(session)
            .distinct('_id');

        const activatableVariantIds = new Set(
            pendingVariantIdsToActivate.map(String),
        );
        const pendingVariantIdsToArchive = pendingVariantIds.filter(
            (id) => !activatableVariantIds.has(id.toString()),
        );

        const pendingVariantsActivated = await updateIfAny({
            model: ProductVariant,
            ids: pendingVariantIdsToActivate,
            status: PRODUCT_STATUS.ACTIVE,
            session,
        });
        const pendingVariantsArchived = await updateIfAny({
            model: ProductVariant,
            ids: pendingVariantIdsToArchive,
            status: PRODUCT_STATUS.ARCHIVED,
            session,
        });

        const rejectedVariantsArchived = await ProductVariant.updateMany(
            {
                status: LEGACY_PRODUCT_STATUS.REJECTED,
            },
            {
                $set: { status: PRODUCT_STATUS.ARCHIVED },
            },
            {
                session,
                timestamps: false,
            },
        );

        const legacyStatuses = mongoose.trusted({
            $in: Object.values(LEGACY_PRODUCT_STATUS),
        });
        const [
            remainingLegacyProducts,
            remainingLegacyVariants,
        ] = await Promise.all([
            CanonicalProduct.countDocuments({
                status: legacyStatuses,
            }).session(session),
            ProductVariant.countDocuments({
                status: legacyStatuses,
            }).session(session),
        ]);

        if (remainingLegacyProducts > 0 || remainingLegacyVariants > 0) {
            throw new Error(
                'Backfill M-002 incomplet : des statuts legacy subsistent.',
            );
        }

        return {
            products: {
                pendingActivated: pendingProductsActivated.modifiedCount,
                pendingArchived: pendingProductsArchived.modifiedCount,
                rejectedArchived: rejectedProductsArchived.modifiedCount,
            },
            variants: {
                pendingActivated: pendingVariantsActivated.modifiedCount,
                pendingArchived: pendingVariantsArchived.modifiedCount,
                rejectedArchived: rejectedVariantsArchived.modifiedCount,
            },
        };
    })
);

export {
    LEGACY_PRODUCT_STATUS,
    backfillM002LegacyProductLifecycle,
};
