import mongoose from 'mongoose';

import {
    buildVariantSignature,
    normalizeProductText,
} from '../modules/productCatalog/productCatalog.normalization.js';
import {
    PRODUCT_STATUS,
    WORKSPACE_PRODUCT_STATUS,
} from '../modules/productCatalog/productCatalog.registry.js';
import { ProductVariant } from '../modules/productCatalog/productVariant.model.js';
import { WorkspaceProduct } from '../modules/productCatalog/workspaceProduct.model.js';
import {
    resolveLegacyConservationType,
    resolveLegacyReferenceName,
} from './migrateM002ProductReferenceContract.migration.js';

const LEGACY_DUPLICATE_SIGNATURE_PREFIX = '__m002_legacy_duplicate__';

const sameNullable = (left, right) => (
    (left ?? null) === (right ?? null)
);

const sameNumberNullable = (left, right) => (
    (left === null || left === undefined ? null : Number(left))
    === (right === null || right === undefined ? null : Number(right))
);

const isIncompleteReferenceContract = (document) => (
    !String(document.name ?? '').trim()
    || !String(document.normalizedName ?? '').trim()
    || !String(document.conservationType ?? '').trim()
);

const assertEquivalentReference = ({
    legacy,
    target,
    expectedName,
    expectedConservationType,
    expectedFoodRange,
    expectedSignature,
}) => {
    if (legacy.canonicalProduct._id.toString()
        !== target.canonicalProduct.toString()) {
        throw new Error(
            'Réconciliation M-002 bloquée : collision de nom entre deux '
            + `Produits différents pour « ${expectedName} ».`,
        );
    }

    if (
        target.normalizedSignature !== expectedSignature
        || target.conservationType !== expectedConservationType
        || target.referenceUnit !== legacy.referenceUnit
        || !sameNumberNullable(target.foodRange, expectedFoodRange)
        || !sameNullable(
            target.normalizedProcessingState,
            legacy.normalizedProcessingState,
        )
        || !sameNumberNullable(target.yieldPercent, legacy.yieldPercent)
    ) {
        throw new Error(
            'Réconciliation M-002 bloquée : deux références portent le même '
            + `nom « ${expectedName} » mais leurs données métier diffèrent.`,
        );
    }
};

const reconcileWorkspaceFavorites = async ({
    legacyVariantId,
    targetVariantId,
    session,
}) => {
    const legacyEntries = await WorkspaceProduct.find({
        productVariant: legacyVariantId,
    }).session(session);

    let moved = 0;
    let merged = 0;

    for (const legacyEntry of legacyEntries) {
        const targetEntry = await WorkspaceProduct.findOne({
            workspace: legacyEntry.workspace,
            productVariant: targetVariantId,
        }).session(session);

        if (!targetEntry) {
            await WorkspaceProduct.collection.updateOne(
                { _id: legacyEntry._id },
                { $set: { productVariant: targetVariantId } },
                { session },
            );
            moved += 1;
            continue;
        }

        if (
            legacyEntry.status === WORKSPACE_PRODUCT_STATUS.ACTIVE
            && targetEntry.status !== WORKSPACE_PRODUCT_STATUS.ACTIVE
        ) {
            targetEntry.status = WORKSPACE_PRODUCT_STATUS.ACTIVE;
            targetEntry.updatedBy = legacyEntry.updatedBy;
            await targetEntry.save({ session });
        }

        if (legacyEntry.status !== WORKSPACE_PRODUCT_STATUS.ARCHIVED) {
            legacyEntry.status = WORKSPACE_PRODUCT_STATUS.ARCHIVED;
            await legacyEntry.save({ session });
        }
        merged += 1;
    }

    return { moved, merged };
};

const reconcileM002LegacyReferenceDuplicates = async () => (
    mongoose.connection.transaction(async (session) => {
        const legacyReferences = await ProductVariant.find({
            identityActive: true,
            status: mongoose.trusted({
                $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
            }),
        })
            .populate('canonicalProduct')
            .populate('variety')
            .populate('characteristics')
            .session(session)
            .lean();

        let scanned = 0;
        let reconciled = 0;
        let favoritesMoved = 0;
        let favoritesMerged = 0;

        for (const legacy of legacyReferences) {
            if (!isIncompleteReferenceContract(legacy)) continue;
            scanned += 1;

            const expectedName = resolveLegacyReferenceName(legacy);
            const normalizedName = normalizeProductText(expectedName);
            const expectedConservationType =
                resolveLegacyConservationType(legacy);
            const expectedFoodRange = legacy.usageType
                ? 6
                : (legacy.foodRange ?? null);
            const expectedSignature = buildVariantSignature({
                name: expectedName,
                varietyId: legacy.variety?._id ?? null,
                characteristics: legacy.characteristics ?? [],
            });

            const target = await ProductVariant.findOne({
                _id: mongoose.trusted({ $ne: legacy._id }),
                normalizedName,
                identityActive: true,
            }).session(session).lean();

            if (!target) continue;

            assertEquivalentReference({
                legacy,
                target,
                expectedName,
                expectedConservationType,
                expectedFoodRange,
                expectedSignature,
            });

            const favorites = await reconcileWorkspaceFavorites({
                legacyVariantId: legacy._id,
                targetVariantId: target._id,
                session,
            });
            favoritesMoved += favorites.moved;
            favoritesMerged += favorites.merged;

            await ProductVariant.collection.updateOne(
                { _id: legacy._id },
                {
                    $set: {
                        name: expectedName,
                        normalizedName,
                        conservationType: expectedConservationType,
                        foodRange: expectedFoodRange,
                        status: PRODUCT_STATUS.ARCHIVED,
                        identityActive: false,
                        replacementVariant: target._id,
                        normalizedSignature:
                            LEGACY_DUPLICATE_SIGNATURE_PREFIX
                            + legacy._id.toString(),
                    },
                    $unset: { usageType: '' },
                },
                { session },
            );

            reconciled += 1;
        }

        return {
            scanned,
            reconciled,
            favoritesMoved,
            favoritesMerged,
        };
    })
);

export {
    LEGACY_DUPLICATE_SIGNATURE_PREFIX,
    reconcileM002LegacyReferenceDuplicates,
};
