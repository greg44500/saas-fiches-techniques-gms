import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import { CanonicalProduct } from './canonicalProduct.model.js';
import {
    findProductDuplicateCandidates,
} from './productCatalogDedup.service.js';
import {
    buildSearchGrams,
    levenshteinDistance,
    normalizeProductText,
} from './productCatalog.normalization.js';
import {
    PRODUCT_CHARACTERISTIC_KIND,
    PRODUCT_CONTRIBUTION_CLASSIFICATION,
    PRODUCT_CONTRIBUTION_STATUS,
    PRODUCT_CONTRIBUTION_TYPE,
    PRODUCT_REFERENCE_EVENT_ACTION,
    PRODUCT_REFERENCE_EVENT_ENTITY_TYPE,
    PRODUCT_STATUS,
} from './productCatalog.registry.js';
import {
    createGlobalProduct,
    updateVariant,
} from './productCatalogGovernance.service.js';
import {
    createProductCharacteristic,
    createProductCharacteristicInSession,
    createProductVariety,
    createProductVarietyInSession,
} from './productReferenceDimension.service.js';
import {
    createProductReferenceEvent,
} from './productReferenceEvent.service.js';
import { ProductCharacteristic } from './productCharacteristic.model.js';
import { ProductVariety } from './productVariety.model.js';
import { ReferenceContribution } from './referenceContribution.model.js';

const typoThreshold = (length) => (length <= 6 ? 1 : 2);

const contributionReason = (code, message) => ({ code, message });

const serializeReferenceCandidate = (type, reference) => ({
    type,
    id: reference._id.toString(),
    name: reference.name,
    ...(reference.kind ? { kind: reference.kind } : {}),
    status: reference.status,
});

const serializeReferenceContribution = (contribution) => ({
    id: contribution._id.toString(),
    type: contribution.type,
    productId: contribution.canonicalProduct?._id
        ? contribution.canonicalProduct._id.toString()
        : contribution.canonicalProduct?.toString?.() ?? null,
    characteristicKind: contribution.characteristicKind ?? null,
    workspaceId: contribution.workspace?._id
        ? contribution.workspace._id.toString()
        : contribution.workspace.toString(),
    authorId: contribution.author?._id
        ? contribution.author._id.toString()
        : contribution.author.toString(),
    proposedValue: contribution.proposedValue,
    classification: contribution.classification,
    reasons: (contribution.reasons ?? []).map(({ code, message }) => ({
        code,
        message,
    })),
    status: contribution.status,
    reviewerId: contribution.reviewer?._id
        ? contribution.reviewer._id.toString()
        : contribution.reviewer?.toString?.() ?? null,
    reviewedAt: contribution.reviewedAt ?? null,
    resolutionEntityType: contribution.resolutionEntityType ?? null,
    resolutionEntityId: contribution.resolutionEntityId?.toString?.() ?? null,
    createdAt: contribution.createdAt,
    updatedAt: contribution.updatedAt,
});

const findDimensionCandidates = async ({
    type,
    productId,
    kind = null,
    normalizedValue,
    session,
}) => {
    const Model = type === PRODUCT_CONTRIBUTION_TYPE.VARIETY
        ? ProductVariety
        : ProductCharacteristic;
    const filter = {
        canonicalProduct: productId,
        identityActive: true,
        status: mongoose.trusted({
            $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
        }),
        ...(kind ? { kind } : {}),
    };

    const exact = await Model.findOne({
        ...filter,
        searchKeys: normalizedValue,
    }).session(session);

    if (exact) return { exact, typo: null, ambiguous: [] };

    const grams = buildSearchGrams([normalizedValue]);
    const candidates = grams.length > 0
        ? await Model.find({
            ...filter,
            searchGrams: mongoose.trusted({ $in: grams }),
        }).limit(50).session(session)
        : [];

    const typoCandidates = candidates.filter((candidate) => {
        const candidateNames = [
            candidate.normalizedName,
            ...(candidate.searchKeys ?? []),
        ].filter(Boolean);
        return candidateNames.some((candidateName) => {
            const shortest = Math.min(
                normalizedValue.length,
                candidateName.length,
            );
            return levenshteinDistance(normalizedValue, candidateName)
                <= typoThreshold(shortest);
        });
    });

    if (typoCandidates.length === 1) {
        return {
            exact: null,
            typo: typoCandidates[0],
            ambiguous: candidates.filter(
                ({ _id }) => _id.toString()
                    !== typoCandidates[0]._id.toString(),
            ),
        };
    }

    const ambiguous = candidates.filter((candidate) => (
        candidate.searchKeys ?? []
    ).some((key) => (
        key.includes(normalizedValue)
        || normalizedValue.includes(key)
    )));

    return { exact: null, typo: null, ambiguous };
};

const classifyReferenceContributionInSession = async ({
    workspaceId,
    type,
    productId = null,
    characteristicKind = null,
    value,
    categoryId = null,
    variant = null,
    dimensionProposals = null,
    session,
}) => {
    const normalizedValue = normalizeProductText(value);
    if (!normalizedValue) {
        return {
            classification: PRODUCT_CONTRIBUTION_CLASSIFICATION.INVALID,
            reasons: [contributionReason(
                'EMPTY_NORMALIZED_VALUE',
                'La valeur proposée ne contient aucune identité exploitable.',
            )],
            normalizedValue,
            existingReference: null,
        };
    }

    if (type === PRODUCT_CONTRIBUTION_TYPE.CANONICAL_PRODUCT) {
        const duplicateCheck = await findProductDuplicateCandidates({
            name: value,
            aliases: [],
            workspaceId,
            session,
        });

        if (duplicateCheck.exactMatch) {
            return {
                classification: PRODUCT_CONTRIBUTION_CLASSIFICATION.EXISTING,
                reasons: [contributionReason(
                    'CANONICAL_PRODUCT_EXISTS',
                    'Un Produit canonique équivalent existe déjà.',
                )],
                normalizedValue,
                existingReference: {
                    type,
                    ...duplicateCheck.exactMatch,
                },
            };
        }

        return {
            classification: PRODUCT_CONTRIBUTION_CLASSIFICATION.REVIEW_REQUIRED,
            reasons: [contributionReason(
                duplicateCheck.candidates.length > 0
                    ? 'CANONICAL_PRODUCT_NEAR_CANDIDATES'
                    : 'NEW_CANONICAL_PRODUCT_REQUIRES_REVIEW',
                duplicateCheck.candidates.length > 0
                    ? 'Des Produits proches doivent être examinés.'
                    : 'Une nouvelle identité Produit racine nécessite une revue.',
            )],
            normalizedValue,
            existingReference: null,
            candidates: duplicateCheck.candidates,
            payload: {
                categoryId,
                variant,
                dimensionProposals,
            },
        };
    }

    const product = await CanonicalProduct.findOne({
        _id: productId,
        identityActive: true,
        status: PRODUCT_STATUS.ACTIVE,
    }).session(session);
    if (!product) {
        return {
            classification: PRODUCT_CONTRIBUTION_CLASSIFICATION.INVALID,
            reasons: [contributionReason(
                'PRODUCT_PARENT_UNAVAILABLE',
                'Le Produit parent est indisponible.',
            )],
            normalizedValue,
            existingReference: null,
        };
    }

    if (
        type === PRODUCT_CONTRIBUTION_TYPE.CHARACTERISTIC
        && !Object.values(PRODUCT_CHARACTERISTIC_KIND)
            .includes(characteristicKind)
    ) {
        return {
            classification: PRODUCT_CONTRIBUTION_CLASSIFICATION.INVALID,
            reasons: [contributionReason(
                'INVALID_CHARACTERISTIC_KIND',
                'Le type de Caractéristique proposé est invalide.',
            )],
            normalizedValue,
            existingReference: null,
        };
    }

    const candidates = await findDimensionCandidates({
        type,
        productId,
        kind: type === PRODUCT_CONTRIBUTION_TYPE.CHARACTERISTIC
            ? characteristicKind
            : null,
        normalizedValue,
        session,
    });

    if (candidates.exact) {
        return {
            classification: PRODUCT_CONTRIBUTION_CLASSIFICATION.EXISTING,
            reasons: [contributionReason(
                'REFERENCE_EXISTS',
                'Cette référence existe déjà.',
            )],
            normalizedValue,
            existingReference: serializeReferenceCandidate(
                type,
                candidates.exact,
            ),
        };
    }

    if (candidates.typo) {
        return {
            classification: PRODUCT_CONTRIBUTION_CLASSIFICATION.EXISTING,
            reasons: [contributionReason(
                'TYPO_MATCH',
                'La saisie correspond à une référence existante avec une faute mineure.',
            )],
            normalizedValue,
            existingReference: serializeReferenceCandidate(
                type,
                candidates.typo,
            ),
        };
    }

    if (candidates.ambiguous.length > 0) {
        return {
            classification: PRODUCT_CONTRIBUTION_CLASSIFICATION.REVIEW_REQUIRED,
            reasons: [contributionReason(
                'AMBIGUOUS_REFERENCE',
                'La proposition est proche d’une référence existante sans équivalence certaine.',
            )],
            normalizedValue,
            existingReference: null,
            candidates: candidates.ambiguous.map((candidate) => (
                serializeReferenceCandidate(type, candidate)
            )),
        };
    }

    if (type === PRODUCT_CONTRIBUTION_TYPE.VARIETY) {
        return {
            classification: PRODUCT_CONTRIBUTION_CLASSIFICATION.AUTO_PUBLISHABLE,
            reasons: [contributionReason(
                'NEW_VARIETY_NO_CONFLICT',
                'La nouvelle Variété ne présente aucun conflit détecté.',
            )],
            normalizedValue,
            existingReference: null,
        };
    }

    if (
        [
            PRODUCT_CHARACTERISTIC_KIND.PRESENTATION,
            PRODUCT_CHARACTERISTIC_KIND.SIZE_FORMAT,
        ].includes(characteristicKind)
    ) {
        return {
            classification: PRODUCT_CONTRIBUTION_CLASSIFICATION.AUTO_PUBLISHABLE,
            reasons: [contributionReason(
                'SAFE_CHARACTERISTIC_NO_CONFLICT',
                'La Caractéristique simple ne présente aucun conflit détecté.',
            )],
            normalizedValue,
            existingReference: null,
        };
    }

    return {
        classification: PRODUCT_CONTRIBUTION_CLASSIFICATION.REVIEW_REQUIRED,
        reasons: [contributionReason(
            'CHARACTERISTIC_REQUIRES_GOVERNANCE',
            'Ce type de Caractéristique nécessite une revue de gouvernance.',
        )],
        normalizedValue,
        existingReference: null,
    };
};

const submitReferenceContribution = async ({
    workspaceId,
    actorId,
    type,
    productId = null,
    characteristicKind = null,
    value,
    categoryId = null,
    variant = null,
    dimensionProposals = null,
}) => mongoose.connection.transaction(async (session) => {
    const decision = await classifyReferenceContributionInSession({
        workspaceId,
        type,
        productId,
        characteristicKind,
        value,
        categoryId,
        variant,
        dimensionProposals,
        session,
    });

    if (
        decision.classification
        === PRODUCT_CONTRIBUTION_CLASSIFICATION.INVALID
        || decision.classification
        === PRODUCT_CONTRIBUTION_CLASSIFICATION.EXISTING
    ) {
        return decision;
    }

    if (
        decision.classification
        === PRODUCT_CONTRIBUTION_CLASSIFICATION.AUTO_PUBLISHABLE
    ) {
        if (type === PRODUCT_CONTRIBUTION_TYPE.VARIETY) {
            const published = await createProductVarietyInSession({
                actorId,
                workspaceId,
                productId,
                name: value,
                aliases: [],
                session,
            });
            return {
                ...decision,
                publishedReference: serializeReferenceCandidate(
                    type,
                    published,
                ),
            };
        }

        const published = await createProductCharacteristicInSession({
            actorId,
            workspaceId,
            productId,
            kind: characteristicKind,
            name: value,
            aliases: [],
            session,
        });
        return {
            ...decision,
            publishedReference: serializeReferenceCandidate(type, published),
        };
    }

    const [contribution] = await ReferenceContribution.create([
        {
            type,
            canonicalProduct: productId,
            characteristicKind,
            workspace: workspaceId,
            author: actorId,
            proposedValue: value,
            normalizedValue: decision.normalizedValue,
            payload: {
                ...(decision.payload ?? {}),
                candidates: decision.candidates ?? [],
            },
            classification: decision.classification,
            reasons: decision.reasons,
            status: PRODUCT_CONTRIBUTION_STATUS.PENDING_REVIEW,
        },
    ], { session });

    await createProductReferenceEvent({
        actorId,
        workspaceId,
        action: PRODUCT_REFERENCE_EVENT_ACTION.CONTRIBUTION_SUBMITTED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CONTRIBUTION,
        entityId: contribution._id,
        metadata: {
            contributionType: type,
            productId: productId?.toString?.() ?? null,
            characteristicKind,
        },
        session,
    });

    return {
        ...decision,
        contribution: serializeReferenceContribution(contribution),
    };
});

const listReferenceContributions = async ({
    status = PRODUCT_CONTRIBUTION_STATUS.PENDING_REVIEW,
    page = 1,
    limit = 20,
}) => {
    const filter = status ? { status } : {};
    const [items, total] = await Promise.all([
        ReferenceContribution.find(filter)
            .sort({ createdAt: 1, _id: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        ReferenceContribution.countDocuments(filter),
    ]);

    return {
        contributions: items.map(serializeReferenceContribution),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const reviewReferenceContribution = async ({
    contributionId,
    actorId,
    decision,
}) => {
    const contribution = await ReferenceContribution.findOne({
        _id: contributionId,
        status: PRODUCT_CONTRIBUTION_STATUS.PENDING_REVIEW,
    });

    if (!contribution) {
        throw new AppError('Contribution à examiner introuvable.', 404);
    }

    if (decision === 'REJECT') {
        return mongoose.connection.transaction(async (session) => {
            const current = await ReferenceContribution.findOne({
                _id: contributionId,
                status: PRODUCT_CONTRIBUTION_STATUS.PENDING_REVIEW,
            }).session(session);
            if (!current) throw new AppError('Contribution déjà traitée.', 409);

            current.status = PRODUCT_CONTRIBUTION_STATUS.REJECTED;
            current.reviewer = actorId;
            current.reviewedAt = new Date();
            await current.save({ session });
            await createProductReferenceEvent({
                actorId,
                workspaceId: current.workspace,
                action: PRODUCT_REFERENCE_EVENT_ACTION.CONTRIBUTION_REJECTED,
                entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CONTRIBUTION,
                entityId: current._id,
                session,
            });
            return serializeReferenceContribution(current);
        });
    }

    let resolutionEntityType;
    let resolutionEntityId;

    if (contribution.type === PRODUCT_CONTRIBUTION_TYPE.VARIETY) {
        const published = await createProductVariety({
            actorId,
            productId: contribution.canonicalProduct,
            name: contribution.proposedValue,
            aliases: [],
        });
        resolutionEntityType = PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIETY;
        resolutionEntityId = published.id;
    } else if (
        contribution.type === PRODUCT_CONTRIBUTION_TYPE.CHARACTERISTIC
    ) {
        const published = await createProductCharacteristic({
            actorId,
            productId: contribution.canonicalProduct,
            kind: contribution.characteristicKind,
            name: contribution.proposedValue,
            aliases: [],
        });
        resolutionEntityType = PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CHARACTERISTIC;
        resolutionEntityId = published.id;
    } else {
        const duplicateCheck = await findProductDuplicateCandidates({
            name: contribution.proposedValue,
            aliases: [],
            workspaceId: contribution.workspace,
        });

        if (duplicateCheck.exactMatch) {
            resolutionEntityType = PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT;
            resolutionEntityId = duplicateCheck.exactMatch.id;
        } else {
            const created = await createGlobalProduct({
                actorId,
                name: contribution.proposedValue,
                aliases: [],
                categoryId: contribution.payload?.categoryId,
                reviewedCandidateIds: (
                    duplicateCheck.candidates ?? []
                ).map(({ id }) => id),
                variant: contribution.payload?.variant,
            });

            const dimensionProposals = (
                contribution.payload?.dimensionProposals ?? {}
            );
            let varietyId = null;
            const characteristicIds = (
                created.variant.characteristics ?? []
            ).map(({ id }) => id);

            if (dimensionProposals.variety) {
                const variety = await createProductVariety({
                    actorId,
                    productId: created.product.id,
                    name: dimensionProposals.variety,
                    aliases: [],
                });
                varietyId = variety.id;
            }

            for (const proposal of (
                dimensionProposals.characteristics ?? []
            )) {
                const characteristic = await createProductCharacteristic({
                    actorId,
                    productId: created.product.id,
                    kind: proposal.kind,
                    name: proposal.value,
                    aliases: [],
                });
                characteristicIds.push(characteristic.id);
            }

            if (
                varietyId
                || characteristicIds.length
                    !== (created.variant.characteristics ?? []).length
            ) {
                await updateVariant({
                    actorId,
                    productId: created.product.id,
                    variantId: created.variant.id,
                    changes: {
                        ...(varietyId ? { varietyId } : {}),
                        characteristicIds,
                    },
                });
            }

            resolutionEntityType = PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT;
            resolutionEntityId = created.product.id;
        }
    }

    return mongoose.connection.transaction(async (session) => {
        const current = await ReferenceContribution.findOne({
            _id: contributionId,
            status: PRODUCT_CONTRIBUTION_STATUS.PENDING_REVIEW,
        }).session(session);
        if (!current) throw new AppError('Contribution déjà traitée.', 409);

        current.status = PRODUCT_CONTRIBUTION_STATUS.APPROVED;
        current.reviewer = actorId;
        current.reviewedAt = new Date();
        current.resolutionEntityType = resolutionEntityType;
        current.resolutionEntityId = resolutionEntityId;
        await current.save({ session });
        await createProductReferenceEvent({
            actorId,
            workspaceId: current.workspace,
            action: PRODUCT_REFERENCE_EVENT_ACTION.CONTRIBUTION_APPROVED,
            entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CONTRIBUTION,
            entityId: current._id,
            metadata: {
                resolutionEntityType,
                resolutionEntityId: resolutionEntityId.toString(),
            },
            session,
        });

        return serializeReferenceContribution(current);
    });
};

export {
    classifyReferenceContributionInSession,
    listReferenceContributions,
    reviewReferenceContribution,
    serializeReferenceContribution,
    submitReferenceContribution,
};
