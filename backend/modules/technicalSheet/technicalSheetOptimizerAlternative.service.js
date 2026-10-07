import mongoose from 'mongoose';

import {
    PRODUCT_STATUS,
} from '../productCatalog/productCatalog.registry.js';
import {
    ProductVariant,
} from '../productCatalog/productVariant.model.js';
import {
    buildWorkspaceGovernanceVisibilityFilter,
} from '../productCatalog/productReferenceGovernance.service.js';
import {
    listUsableSupplierArticlesForVariant,
    resolveApplicablePrice,
} from '../supplierCatalog/supplierPricing.service.js';
import { AppError } from '../../utils/appError.js';

const serializeVariantAlternative = (
    variant,
) => ({
    id: variant._id.toString(),
    name: variant.name,
    referenceUnit:
        variant.referenceUnit,
    countUnitLabelSingular:
        variant.countUnitLabelSingular
        ?? null,
    countUnitLabelPlural:
        variant.countUnitLabelPlural
        ?? null,
    yieldPercent:
        variant.yieldPercent
        ?.toString?.()
        ?? variant.yieldPercent
        ?? null,
    canonicalProductId:
        variant.canonicalProduct
            .toString(),
});

const serializeApplicablePreview = (
    applicable,
) => ({
    available:
        Boolean(
            applicable?.price
            ?.normalizedAmount,
        ),
    source:
        applicable
            ?.resolvedSource
        ?? null,
    normalizedAmount:
        applicable
            ?.price
            ?.normalizedAmount
        ?? null,
    normalizedUnit:
        applicable
            ?.price
            ?.normalizedUnit
        ?? null,
    supplierArticleId:
        applicable
            ?.article
            ?.id
        ?? null,
    supplierName:
        applicable
            ?.article
            ?.supplierName
        ?? null,
    alerts:
        applicable?.alerts
        ?? [],
});

const getCurrentVariant = async ({
    workspaceId,
    productVariantId,
    session = null,
}) => {
    let query =
        ProductVariant.findOne(
            mongoose.trusted({
                _id: productVariantId,
                status:
                    PRODUCT_STATUS.ACTIVE,
                identityActive: true,
                ...buildWorkspaceGovernanceVisibilityFilter(
                    workspaceId,
                ),
            }),
        ).select(
            '_id name canonicalProduct referenceUnit countUnitLabelSingular countUnitLabelPlural yieldPercent',
        );

    if (session) {
        query = query.session(session);
    }

    const variant =
        await query;

    if (!variant) {
        throw new AppError(
            'Référence Produit indisponible pour l’optimisation.',
            409,
        );
    }

    return variant;
};

const listProductAlternatives = async ({
    workspaceId,
    dossierId,
    productVariantId,
    atDate = new Date(),
    session = null,
}) => {
    const current =
        await getCurrentVariant({
            workspaceId,
            productVariantId,
            session,
        });

    let query =
        ProductVariant.find(
            mongoose.trusted({
                _id: mongoose.trusted({
                    $ne: current._id,
                }),
                canonicalProduct:
                    current.canonicalProduct,
                referenceUnit:
                    current.referenceUnit,
                status:
                    PRODUCT_STATUS.ACTIVE,
                identityActive: true,
                ...buildWorkspaceGovernanceVisibilityFilter(
                    workspaceId,
                ),
            }),
        )
            .select(
                '_id name canonicalProduct referenceUnit countUnitLabelSingular countUnitLabelPlural yieldPercent',
            )
            .sort({
                name: 1,
                _id: 1,
            });

    if (session) {
        query = query.session(session);
    }

    const alternatives =
        await query;

    const resolved = [];

    for (const alternative of alternatives) {
        let pricing = null;
        let supplierCandidates = [];

        try {
            const applicable =
                await resolveApplicablePrice({
                    workspaceId,
                    dossierId,
                    productVariantId:
                        alternative._id,
                    atDate,
                    session,
                });

            pricing =
                serializeApplicablePreview(
                    applicable,
                );
        } catch (error) {
            if (
                error.code
                === 'SUPPLIER_ARTICLE_SELECTION_REQUIRED'
            ) {
                supplierCandidates =
                    error.candidates ?? [];
            } else if (
                error.statusCode !== 404
            ) {
                throw error;
            }
        }

        resolved.push({
            ...serializeVariantAlternative(
                alternative,
            ),
            pricing,
            requiresSupplierSelection:
                supplierCandidates.length > 0,
            supplierCandidates,
        });
    }

    return resolved;
};

const listSupplierAlternatives = async ({
    workspaceId,
    dossierId,
    productVariantId,
    selectedSupplierArticleId = null,
    atDate = new Date(),
    session = null,
}) => {
    const articles =
        await listUsableSupplierArticlesForVariant({
            workspaceId,
            productVariantId,
            session,
            limit: 200,
        });

    const alternatives = [];

    for (const article of articles) {
        if (
            selectedSupplierArticleId
            && article.id
                === selectedSupplierArticleId
                    .toString()
        ) {
            continue;
        }

        const applicable =
            await resolveApplicablePrice({
                workspaceId,
                dossierId,
                articleId:
                    article.id,
                productVariantId,
                atDate,
                session,
            });

        alternatives.push({
            ...article,
            pricing:
                serializeApplicablePreview(
                    applicable,
                ),
        });
    }

    alternatives.sort(
        (left, right) => {
            const leftPrice =
                left.pricing
                    ?.normalizedAmount;
            const rightPrice =
                right.pricing
                    ?.normalizedAmount;

            if (
                leftPrice !== null
                && leftPrice !== undefined
                && rightPrice !== null
                && rightPrice !== undefined
            ) {
                const delta =
                    Number(leftPrice)
                    - Number(rightPrice);

                if (delta !== 0) {
                    return delta;
                }
            } else if (
                leftPrice !== null
                && leftPrice !== undefined
            ) {
                return -1;
            } else if (
                rightPrice !== null
                && rightPrice !== undefined
            ) {
                return 1;
            }

            return (
                (
                    left.supplierName
                    ?? ''
                ).localeCompare(
                    right.supplierName
                    ?? '',
                    'fr',
                )
                || left.id.localeCompare(
                    right.id,
                )
            );
        },
    );

    return alternatives;
};

const assertProductAlternative = async ({
    workspaceId,
    currentProductVariantId,
    candidateProductVariantId,
    session = null,
}) => {
    if (
        currentProductVariantId
            .toString()
        === candidateProductVariantId
            .toString()
    ) {
        return getCurrentVariant({
            workspaceId,
            productVariantId:
                currentProductVariantId,
            session,
        });
    }

    const current =
        await getCurrentVariant({
            workspaceId,
            productVariantId:
                currentProductVariantId,
            session,
        });
    const candidate =
        await getCurrentVariant({
            workspaceId,
            productVariantId:
                candidateProductVariantId,
            session,
        });

    if (
        candidate.canonicalProduct
            .toString()
            !== current.canonicalProduct
                .toString()
        || candidate.referenceUnit
            !== current.referenceUnit
    ) {
        throw new AppError(
            'La Référence Produit choisie n’est pas une alternative admissible pour cette ligne.',
            409,
        );
    }

    return candidate;
};

export {
    assertProductAlternative,
    listProductAlternatives,
    listSupplierAlternatives,
};
