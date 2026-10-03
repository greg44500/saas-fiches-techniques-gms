import mongoose from 'mongoose';

import {
    normalizeProductText,
} from '../modules/productCatalog/productCatalog.normalization.js';
import {
    ProductVariant,
} from '../modules/productCatalog/productVariant.model.js';
import {
    INDICATIVE_PRICE_STATUS,
} from '../modules/supplierCatalog/supplierCatalog.registry.js';
import {
    IndicativePrice,
} from '../modules/supplierCatalog/supplierPricing.model.js';

const RETIRED_M002_V8_REFERENCE_NAMES = Object.freeze([
    'Fond de tarte sucré cru surgelé',
    'Fond de tarte sucré cuit',
    'Fond de tarte sablé cru surgelé',
    'Fond de tarte sablé cuit',
    'Fond de tarte salé cru surgelé',
    'Fond de tarte salé cuit',
]);

const reconcileM003GlobalIndicativePricesToV3 = async ({
    actorId,
}) => {
    if (!actorId) {
        throw new TypeError(
            'actorId is required to reconcile M-003 global indicative prices.',
        );
    }

    const normalizedNames =
        RETIRED_M002_V8_REFERENCE_NAMES.map(
            normalizeProductText,
        );

    const variants = await ProductVariant.find({
        normalizedName: mongoose.trusted({
            $in: normalizedNames,
        }),
    })
        .select('_id')
        .lean();

    if (variants.length === 0) {
        return {
            matchedCount: 0,
            archivedCount: 0,
        };
    }

    const now = new Date();
    const result = await IndicativePrice.updateMany(
        {
            workspace: null,
            dossier: null,
            productVariant: mongoose.trusted({
                $in: variants.map(({ _id }) => _id),
            }),
            status: INDICATIVE_PRICE_STATUS.ACTIVE,
            source: /m003-global-indicative-v2$/,
        },
        {
            $set: {
                status: INDICATIVE_PRICE_STATUS.ARCHIVED,
                archivedAt: now,
                archivedBy: actorId,
                updatedBy: actorId,
            },
        },
    );

    return {
        matchedCount: result.matchedCount,
        archivedCount: result.modifiedCount,
    };
};

export {
    RETIRED_M002_V8_REFERENCE_NAMES,
    reconcileM003GlobalIndicativePricesToV3,
};
