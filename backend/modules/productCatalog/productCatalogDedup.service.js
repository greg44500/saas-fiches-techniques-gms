import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import { CanonicalProduct } from './canonicalProduct.model.js';
import {
    buildSearchGrams,
    buildSearchKeys,
    isNearDuplicateKey,
} from './productCatalog.normalization.js';
import { PRODUCT_STATUS } from './productCatalog.registry.js';
import { serializeProduct } from './productCatalog.serializer.js';

const queryWithSession = (query, session) => (
    session ? query.session(session) : query
);

const productVisibleToWorkspace = (product, workspaceId) => (
    [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED].includes(product.status)
    || (
        product.status === PRODUCT_STATUS.PENDING_REVIEW
        && product.contributedFromWorkspace?.toString()
            === workspaceId?.toString()
    )
);

const scoreNearCandidate = (requestedKeys, candidateKeys) => {
    let score = Number.POSITIVE_INFINITY;

    for (const requested of requestedKeys) {
        for (const candidate of candidateKeys) {
            if (!isNearDuplicateKey(requested, candidate)) {
                continue;
            }

            const lengthDelta = Math.abs(requested.length - candidate.length);
            score = Math.min(score, lengthDelta);
        }
    }

    return score;
};

const findProductDuplicateCandidates = async ({
    name,
    aliases = [],
    workspaceId = null,
    excludeProductId = null,
    session = null,
}) => {
    const searchKeys = buildSearchKeys(name, aliases);
    const excludeFilter = excludeProductId
        ? { _id: { $ne: new mongoose.Types.ObjectId(excludeProductId.toString()) } }
        : {};

    let exactQuery = CanonicalProduct.findOne({
        ...excludeFilter,
        identityActive: true,
        searchKeys: { $in: searchKeys },
    })
        .populate('category')
        .lean();

    exactQuery = queryWithSession(exactQuery, session);
    const exact = await exactQuery;

    const exactVisible = exact && productVisibleToWorkspace(exact, workspaceId);
    const privateConflict = Boolean(exact && !exactVisible);

    const grams = buildSearchGrams(searchKeys);
    let nearProducts = [];

    if (grams.length > 0) {
        let nearQuery = CanonicalProduct.find({
            ...excludeFilter,
            identityActive: true,
            ...(exact ? { _id: { $nin: [
                ...(excludeProductId
                    ? [new mongoose.Types.ObjectId(excludeProductId.toString())]
                    : []),
                exact._id,
            ] } } : {}),
            searchGrams: { $in: grams },
        })
            .populate('category')
            .sort({ updatedAt: -1 })
            .limit(60)
            .lean();

        nearQuery = queryWithSession(nearQuery, session);
        nearProducts = await nearQuery;
    }

    const candidates = nearProducts
        .filter((product) => productVisibleToWorkspace(product, workspaceId))
        .map((product) => ({
            product,
            score: scoreNearCandidate(searchKeys, product.searchKeys ?? []),
        }))
        .filter(({ score }) => Number.isFinite(score))
        .sort((left, right) => (
            left.score - right.score
            || left.product.name.localeCompare(right.product.name, 'fr')
        ))
        .slice(0, 8)
        .map(({ product }) => serializeProduct(product));

    return {
        normalizedKeys: searchKeys,
        exactMatch: exactVisible ? serializeProduct(exact) : null,
        privateConflict,
        candidates,
    };
};

const assertProductCreationReviewed = async ({
    name,
    aliases = [],
    workspaceId,
    reviewedCandidateIds = [],
    excludeProductId = null,
    session = null,
}) => {
    const duplicateCheck = await findProductDuplicateCandidates({
        name,
        aliases,
        workspaceId,
        excludeProductId,
        session,
    });

    if (duplicateCheck.exactMatch || duplicateCheck.privateConflict) {
        const error = new AppError('Un Produit équivalent existe déjà.', 409);
        error.code = 'PRODUCT_EXACT_DUPLICATE';
        error.duplicateCheck = duplicateCheck;
        throw error;
    }

    const reviewedSet = new Set(reviewedCandidateIds.map(String));
    const missingCandidate = duplicateCheck.candidates.find(
        ({ id }) => !reviewedSet.has(id),
    );

    if (missingCandidate) {
        const error = new AppError(
            'Des Produits proches doivent être examinés avant création.',
            409,
        );
        error.code = 'PRODUCT_DUPLICATE_REVIEW_REQUIRED';
        error.duplicateCheck = duplicateCheck;
        throw error;
    }

    return duplicateCheck;
};

export {
    assertProductCreationReviewed,
    findProductDuplicateCandidates,
    productVisibleToWorkspace,
};
