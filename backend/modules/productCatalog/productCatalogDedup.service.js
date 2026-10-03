import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import { CanonicalProduct } from './canonicalProduct.model.js';
import { ProductVariant } from './productVariant.model.js';
import {
    buildDuplicateGovernanceVisibilityFilter,
    isReferenceVisibleToWorkspace,
} from './productReferenceGovernance.service.js';
import {
    buildSearchGrams,
    buildSearchKeys,
    isNearDuplicateKey,
    productSearchValueContainedInQuery,
} from './productCatalog.normalization.js';
import {
    PRODUCT_GOVERNANCE_STATUS,
    PRODUCT_STATUS,
} from './productCatalog.registry.js';
import {
    serializeProduct,
    serializeVariant,
} from './productCatalog.serializer.js';

const queryWithSession = (query, session) => (
    session ? query.session(session) : query
);

const productVisibleInReference = (product) => (
    [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED].includes(product.status)
);

const scoreNearCandidate = (requestedKeys, candidateKeys) => {
    let score = Number.POSITIVE_INFINITY;

    for (const requested of requestedKeys) {
        for (const candidate of candidateKeys) {
            if (isNearDuplicateKey(requested, candidate)) {
                score = Math.min(
                    score,
                    Math.abs(requested.length - candidate.length),
                );
                continue;
            }

            if (
                productSearchValueContainedInQuery(requested, candidate)
                || productSearchValueContainedInQuery(candidate, requested)
            ) {
                score = Math.min(score, 0.5);
            }
        }
    }

    return score;
};

const serializeVariantDuplicate = (variant) => {
    const serializedProduct = serializeProduct(variant.canonicalProduct);

    return {
        ...serializedProduct,
        name: variant.name,
        status: variant.status,
        variantId: variant._id.toString(),
        rootName: variant.canonicalProduct.name,
        source: 'PRODUCT_VARIANT',
    };
};

const findProductDuplicateCandidates = async ({
    name,
    aliases = [],
    workspaceId = null,
    excludeProductId = null,
    session = null,
}) => {
    void workspaceId;

    const searchKeys = buildSearchKeys(name, aliases);
    const excludeFilter = excludeProductId
        ? { _id: mongoose.trusted({ $ne: new mongoose.Types.ObjectId(excludeProductId.toString()) }) }
        : {};

    let exactVariantQuery = ProductVariant.findOne({
        identityActive: true,
        status: mongoose.trusted({
            $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
        }),
        normalizedName: mongoose.trusted({ $in: searchKeys }),
        ...buildDuplicateGovernanceVisibilityFilter(workspaceId),
    })
        .populate({
            path: 'canonicalProduct',
            populate: { path: 'category' },
        })
        .lean();
    exactVariantQuery = queryWithSession(exactVariantQuery, session);
    const exactVariant = await exactVariantQuery;
    const exactVariantVisible = (
        exactVariant?.canonicalProduct
        && productVisibleInReference(exactVariant.canonicalProduct)
        && isReferenceVisibleToWorkspace({
            reference: exactVariant.canonicalProduct,
            workspaceId,
        })
        && (
            !excludeProductId
            || exactVariant.canonicalProduct._id.toString()
                !== excludeProductId.toString()
        )
    )
        ? exactVariant
        : null;

    let exactQuery = CanonicalProduct.findOne({
        ...excludeFilter,
        identityActive: true,
        status: mongoose.trusted({
            $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
        }),
        searchKeys: mongoose.trusted({ $in: searchKeys }),
        ...buildDuplicateGovernanceVisibilityFilter(workspaceId),
    })
        .populate('category')
        .lean();

    exactQuery = queryWithSession(exactQuery, session);
    const exact = await exactQuery;

    const grams = buildSearchGrams(searchKeys);
    let nearProducts = [];

    if (grams.length > 0) {
        let nearQuery = CanonicalProduct.find({
            ...excludeFilter,
            identityActive: true,
            status: mongoose.trusted({
                $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
            }),
            ...(exact || exactVariantVisible
                ? {
                    _id: mongoose.trusted({
                        $ne: exact?._id
                            ?? exactVariantVisible.canonicalProduct._id,
                    }),
                }
                : {}),
            searchGrams: mongoose.trusted({ $in: grams }),
            ...buildDuplicateGovernanceVisibilityFilter(workspaceId),
        })
            .populate('category')
            .sort({ updatedAt: -1 })
            .limit(60)
            .lean();

        nearQuery = queryWithSession(nearQuery, session);
        nearProducts = await nearQuery;
    }

    const candidates = nearProducts
        .filter(productVisibleInReference)
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
        exactMatch: exactVariantVisible
            ? serializeVariantDuplicate(exactVariantVisible)
            : exact && productVisibleInReference(exact)
                ? serializeProduct(exact)
                : null,
        candidates,
    };
};

const serializeVariantCandidate = (variant) => ({
    ...serializeVariant(variant),
    rootName: variant.canonicalProduct?.name ?? null,
    source: 'PRODUCT_VARIANT',
});

const findVariantDuplicateCandidates = async ({
    name,
    canonicalProductId,
    workspaceId = null,
    excludeVariantId = null,
    session = null,
}) => {
    const normalizedName = buildSearchKeys(name, [])[0] ?? '';
    const baseFilter = {
        identityActive: true,
        status: mongoose.trusted({
            $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
        }),
        canonicalProduct: canonicalProductId,
        ...(excludeVariantId
            ? {
                _id: mongoose.trusted({
                    $ne: new mongoose.Types.ObjectId(
                        excludeVariantId.toString(),
                    ),
                }),
            }
            : {}),
        ...buildDuplicateGovernanceVisibilityFilter(workspaceId),
    };

    let exactQuery = ProductVariant.findOne({
        ...baseFilter,
        normalizedName,
    })
        .populate('canonicalProduct', 'name')
        .populate('variety')
        .populate('characteristics')
        .lean();
    exactQuery = queryWithSession(exactQuery, session);
    const exactMatch = await exactQuery;

    const grams = buildSearchGrams([normalizedName]);
    let candidates = [];

    if (!exactMatch && grams.length > 0) {
        let query = ProductVariant.find({
            ...baseFilter,
            governanceStatus: PRODUCT_GOVERNANCE_STATUS.APPROVED,
            searchGrams: mongoose.trusted({ $in: grams }),
        })
            .populate('canonicalProduct', 'name')
            .populate('variety')
            .populate('characteristics')
            .limit(50)
            .lean();
        query = queryWithSession(query, session);

        const matches = await query;
        candidates = matches
            .map((variant) => ({
                variant,
                score: scoreNearCandidate(
                    [normalizedName],
                    [variant.normalizedName],
                ),
            }))
            .filter(({ score }) => Number.isFinite(score))
            .sort((left, right) => (
                left.score - right.score
                || left.variant.name.localeCompare(
                    right.variant.name,
                    'fr',
                )
            ))
            .slice(0, 5)
            .map(({ variant }) => serializeVariantCandidate(variant));
    }

    return {
        exactMatch: exactMatch
            ? serializeVariantCandidate(exactMatch)
            : null,
        candidates,
    };
};

const assertVariantCreationReviewed = async ({
    name,
    canonicalProductId,
    workspaceId,
    reviewedCandidateIds = [],
    session = null,
}) => {
    const duplicateCheck = await findVariantDuplicateCandidates({
        name,
        canonicalProductId,
        workspaceId,
        session,
    });

    if (duplicateCheck.exactMatch) {
        const error = new AppError(
            'Cette Référence Produit existe déjà.',
            409,
        );
        error.code = 'PRODUCT_VARIANT_EXACT_DUPLICATE';
        error.duplicateCheck = duplicateCheck;
        throw error;
    }

    const reviewedSet = new Set(reviewedCandidateIds.map(String));
    const missingCandidate = duplicateCheck.candidates.find(
        ({ id }) => !reviewedSet.has(id),
    );

    if (missingCandidate) {
        const error = new AppError(
            'Des Références proches doivent être examinées avant création.',
            409,
        );
        error.code = 'PRODUCT_VARIANT_DUPLICATE_REVIEW_REQUIRED';
        error.duplicateCheck = duplicateCheck;
        throw error;
    }

    return duplicateCheck;
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

    if (duplicateCheck.exactMatch) {
        const error = new AppError('Une référence Produit équivalente existe déjà.', 409);
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
    assertVariantCreationReviewed,
    findProductDuplicateCandidates,
    findVariantDuplicateCandidates,
    productVisibleInReference,
};
