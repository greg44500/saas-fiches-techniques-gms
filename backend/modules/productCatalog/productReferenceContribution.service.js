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
    PRODUCT_GOVERNANCE_STATUS,
    PRODUCT_REFERENCE_EVENT_ACTION,
    PRODUCT_REFERENCE_EVENT_ENTITY_TYPE,
    PRODUCT_STATUS,
} from './productCatalog.registry.js';
import {
    createGlobalProductInSession,
} from './productCatalogGovernance.service.js';
import {
    createProductCharacteristicInSession,
    createProductVarietyInSession,
} from './productReferenceDimension.service.js';
import {
    createProductReferenceEvent,
} from './productReferenceEvent.service.js';
import {
    buildDuplicateGovernanceVisibilityFilter,
    buildWorkspaceGovernanceVisibilityFilter,
} from './productReferenceGovernance.service.js';
import {
    resolveProvisionalContribution,
} from './productReferenceResolution.service.js';
import { ProductCharacteristic } from './productCharacteristic.model.js';
import { ProductVariety } from './productVariety.model.js';
import { ReferenceContribution } from './referenceContribution.model.js';

const typoThreshold = (length) => (length <= 6 ? 1 : 2);

const numericTokens = (value) => (
    normalizeProductText(value)
        .match(/\d+(?:[.,]\d+)?/g)
    ?? []
);

const sizeFormatNumericIdentityMatches = (left, right) => {
    const leftTokens = numericTokens(left);
    const rightTokens = numericTokens(right);

    if (leftTokens.length === 0 && rightTokens.length === 0) {
        return true;
    }

    return (
        leftTokens.length === rightTokens.length
        && leftTokens.every(
            (token, index) => token === rightTokens[index],
        )
    );
};

const contributionReason = (code, message) => ({ code, message });

const serializeReferenceCandidate = (type, reference) => ({
    type,
    id: reference._id.toString(),
    name: reference.name,
    ...(reference.kind ? { kind: reference.kind } : {}),
    status: reference.status,
    governanceStatus: reference.governanceStatus
        ?? PRODUCT_GOVERNANCE_STATUS.APPROVED,
});

const serializeReferenceId = (reference) => (
    reference?._id?.toString?.()
    ?? reference?.toString?.()
    ?? null
);

const deriveReferenceContributionDecision = (contribution) => {
    if (
        contribution.status
        === PRODUCT_CONTRIBUTION_STATUS.PENDING_REVIEW
    ) {
        return null;
    }

    if (
        contribution.status
        === PRODUCT_CONTRIBUTION_STATUS.REJECTED
    ) {
        return 'REJECT';
    }

    const provisionalId =
        contribution.provisionalEntityId?.toString?.() ?? null;
    const resolutionId =
        contribution.resolutionEntityId?.toString?.() ?? null;

    if (
        provisionalId
        && resolutionId
        && provisionalId !== resolutionId
    ) {
        return 'MERGE';
    }

    return 'APPROVE';
};

const serializeReferenceContribution = (contribution) => {
    const workspaceId = serializeReferenceId(contribution.workspace);
    const authorId = serializeReferenceId(contribution.author);
    const reviewerId = serializeReferenceId(contribution.reviewer);

    return {
        id: contribution._id.toString(),
        type: contribution.type,
        productId: contribution.canonicalProduct?._id
            ? contribution.canonicalProduct._id.toString()
            : contribution.canonicalProduct?.toString?.() ?? null,
        characteristicKind: contribution.characteristicKind ?? null,
        workspaceId,
        workspace: contribution.workspace?._id
            ? {
                id: workspaceId,
                name: contribution.workspace.name ?? null,
            }
            : null,
        authorId,
        author: contribution.author?._id
            ? {
                id: authorId,
                firstName: contribution.author.firstName ?? null,
                lastName: contribution.author.lastName ?? null,
                email: contribution.author.email ?? null,
            }
            : null,
        proposedValue: contribution.proposedValue,
        classification: contribution.classification,
        reasons: (contribution.reasons ?? []).map(({ code, message }) => ({
            code,
            message,
        })),
        status: contribution.status,
        decision: deriveReferenceContributionDecision(contribution),
        candidates: contribution.payload?.candidates ?? [],
        reviewerId,
        reviewer: contribution.reviewer?._id
            ? {
                id: reviewerId,
                firstName: contribution.reviewer.firstName ?? null,
                lastName: contribution.reviewer.lastName ?? null,
                email: contribution.reviewer.email ?? null,
            }
            : null,
        reviewedAt: contribution.reviewedAt ?? null,
        provisionalEntityType: contribution.provisionalEntityType ?? null,
        provisionalEntityId:
            contribution.provisionalEntityId?.toString?.() ?? null,
        resolutionEntityType: contribution.resolutionEntityType ?? null,
        resolutionEntityId:
            contribution.resolutionEntityId?.toString?.() ?? null,
        createdAt: contribution.createdAt,
        updatedAt: contribution.updatedAt,
    };
};

const findDimensionCandidates = async ({
    type,
    productId,
    kind = null,
    normalizedValue,
    workspaceId,
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
        ...buildDuplicateGovernanceVisibilityFilter(workspaceId),
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
            if (
                kind === PRODUCT_CHARACTERISTIC_KIND.SIZE_FORMAT
                && !sizeFormatNumericIdentityMatches(
                    normalizedValue,
                    candidateName,
                )
            ) {
                return false;
            }

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
    forceCreate = false,
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

        if (duplicateCheck.candidates.length > 0 && !forceCreate) {
            return {
                classification:
                    PRODUCT_CONTRIBUTION_CLASSIFICATION
                        .USER_CONFIRMATION_REQUIRED,
                reasons: [contributionReason(
                    'CANONICAL_PRODUCT_NEAR_CANDIDATES',
                    'Des Produits proches existent. Confirmez la référence à utiliser ou la création.',
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

        return {
            classification: PRODUCT_CONTRIBUTION_CLASSIFICATION.PROVISIONAL,
            reasons: [contributionReason(
                forceCreate
                    ? 'CANONICAL_PRODUCT_USER_CONFIRMED_NEW'
                    : 'NEW_CANONICAL_PRODUCT_PROVISIONAL',
                'Le Produit est créé provisoirement pour ce Workspace en attendant la gouvernance.',
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
        ...buildWorkspaceGovernanceVisibilityFilter(workspaceId),
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
        workspaceId,
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

    const suggestedCandidates = [
        ...(candidates.typo ? [candidates.typo] : []),
        ...candidates.ambiguous,
    ].filter((candidate, index, values) => (
        values.findIndex(({ _id }) => (
            _id.toString() === candidate._id.toString()
        )) === index
    ));

    if (suggestedCandidates.length > 0 && !forceCreate) {
        return {
            classification:
                PRODUCT_CONTRIBUTION_CLASSIFICATION
                    .USER_CONFIRMATION_REQUIRED,
            reasons: [contributionReason(
                candidates.typo
                    ? 'TYPO_CANDIDATE'
                    : 'AMBIGUOUS_REFERENCE',
                'Une ou plusieurs valeurs proches existent déjà. Confirmez la valeur à utiliser ou la création.',
            )],
            normalizedValue,
            existingReference: null,
            candidates: suggestedCandidates.map((candidate) => (
                serializeReferenceCandidate(type, candidate)
            )),
        };
    }

    if (forceCreate) {
        return {
            classification: PRODUCT_CONTRIBUTION_CLASSIFICATION.PROVISIONAL,
            reasons: [contributionReason(
                'USER_CONFIRMED_NEW_VALUE',
                'La valeur est créée provisoirement pour ce Workspace.',
            )],
            normalizedValue,
            existingReference: null,
            candidates: suggestedCandidates.map((candidate) => (
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
        classification: PRODUCT_CONTRIBUTION_CLASSIFICATION.PROVISIONAL,
        reasons: [contributionReason(
            'CHARACTERISTIC_PROVISIONAL',
            'Cette valeur est utilisable dans ce Workspace en attendant la gouvernance.',
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
    forceCreate = false,
    reviewedCandidateIds = [],
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
        forceCreate,
        session,
    });

    if (
        decision.classification
        === PRODUCT_CONTRIBUTION_CLASSIFICATION.INVALID
        || decision.classification
        === PRODUCT_CONTRIBUTION_CLASSIFICATION.EXISTING
        || decision.classification
        === PRODUCT_CONTRIBUTION_CLASSIFICATION
            .USER_CONFIRMATION_REQUIRED
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

    let provisionalEntityType = null;
    let provisionalEntityId = null;
    let provisionalReference = null;

    if (
        decision.classification
        === PRODUCT_CONTRIBUTION_CLASSIFICATION.PROVISIONAL
    ) {
        if (type === PRODUCT_CONTRIBUTION_TYPE.VARIETY) {
            const provisional = await createProductVarietyInSession({
                actorId,
                workspaceId,
                productId,
                name: value,
                aliases: [],
                governanceStatus:
                    PRODUCT_GOVERNANCE_STATUS.PROVISIONAL,
                session,
            });
            provisionalEntityType =
                PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIETY;
            provisionalEntityId = provisional._id;
            provisionalReference = serializeReferenceCandidate(
                type,
                provisional,
            );
        } else if (
            type === PRODUCT_CONTRIBUTION_TYPE.CHARACTERISTIC
        ) {
            const provisional =
                await createProductCharacteristicInSession({
                    actorId,
                    workspaceId,
                    productId,
                    kind: characteristicKind,
                    name: value,
                    aliases: [],
                    governanceStatus:
                        PRODUCT_GOVERNANCE_STATUS.PROVISIONAL,
                    session,
                });
            provisionalEntityType =
                PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CHARACTERISTIC;
            provisionalEntityId = provisional._id;
            provisionalReference = serializeReferenceCandidate(
                type,
                provisional,
            );
        } else {
            const created = await createGlobalProductInSession({
                actorId,
                name: value,
                aliases: [],
                categoryId,
                reviewedCandidateIds: [
                    ...new Set([
                        ...reviewedCandidateIds.map(String),
                        ...(decision.candidates ?? []).map(({ id }) => id),
                    ]),
                ],
                variant,
                dimensionProposals,
                workspaceId,
                governanceStatus:
                    PRODUCT_GOVERNANCE_STATUS.PROVISIONAL,
                session,
            });
            provisionalEntityType =
                PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT;
            provisionalEntityId = created.product.id;
            provisionalReference = {
                type,
                ...created.product,
                variant: created.variant,
            };
        }
    }

    const [contribution] = await ReferenceContribution.create([
        {
            type,
            canonicalProduct: type === PRODUCT_CONTRIBUTION_TYPE.CANONICAL_PRODUCT
                ? provisionalEntityId
                : productId,
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
            provisionalEntityType,
            provisionalEntityId,
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
        provisionalReference,
        contribution: serializeReferenceContribution(contribution),
    };
});

const listReferenceContributions = async ({
    status = PRODUCT_CONTRIBUTION_STATUS.PENDING_REVIEW,
    page = 1,
    limit = 20,
}) => {
    const filter = status ? { status } : {};
    const sort = status === PRODUCT_CONTRIBUTION_STATUS.PENDING_REVIEW
        ? { createdAt: 1, _id: 1 }
        : { reviewedAt: -1, _id: -1 };

    const [items, total] = await Promise.all([
        ReferenceContribution.find(filter)
            .populate('workspace', 'name')
            .populate('author', 'firstName lastName email')
            .populate('reviewer', 'firstName lastName email')
            .sort(sort)
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
    targetReferenceId = null,
    correctedValue = null,
}) => mongoose.connection.transaction(async (session) => {
    const current = await ReferenceContribution.findOne({
        _id: contributionId,
        status: PRODUCT_CONTRIBUTION_STATUS.PENDING_REVIEW,
    }).session(session);

    if (!current) {
        throw new AppError('Contribution à examiner introuvable.', 404);
    }

    if (current.provisionalEntityId) {
        const resolution = await resolveProvisionalContribution({
            contribution: current,
            actorId,
            decision,
            targetReferenceId,
            correctedValue,
            session,
        });

        const approved = decision !== 'REJECT';
        current.status = approved
            ? PRODUCT_CONTRIBUTION_STATUS.APPROVED
            : PRODUCT_CONTRIBUTION_STATUS.REJECTED;
        current.reviewer = actorId;
        current.reviewedAt = new Date();
        current.resolutionEntityType = approved
            ? (
                current.type === PRODUCT_CONTRIBUTION_TYPE.CANONICAL_PRODUCT
                    ? PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT
                    : current.type === PRODUCT_CONTRIBUTION_TYPE.VARIETY
                        ? PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIETY
                        : PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CHARACTERISTIC
            )
            : null;
        current.resolutionEntityId = approved
            ? resolution?.resolutionEntityId ?? null
            : null;
        await current.save({ session });

        await createProductReferenceEvent({
            actorId,
            workspaceId: current.workspace,
            action: approved
                ? PRODUCT_REFERENCE_EVENT_ACTION.CONTRIBUTION_APPROVED
                : PRODUCT_REFERENCE_EVENT_ACTION.CONTRIBUTION_REJECTED,
            entityType:
                PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CONTRIBUTION,
            entityId: current._id,
            metadata: {
                decision,
                ...(current.resolutionEntityId
                    ? {
                        resolutionEntityId:
                            current.resolutionEntityId.toString(),
                    }
                    : {}),
            },
            session,
        });

        return serializeReferenceContribution(current);
    }

    if (decision === 'REJECT') {
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
    }

    if (decision !== 'APPROVE') {
        throw new AppError('Décision de contribution invalide.', 400);
    }

    let resolutionEntityType;
    let resolutionEntityId;

    if (
        current.type === PRODUCT_CONTRIBUTION_TYPE.VARIETY
        || current.type === PRODUCT_CONTRIBUTION_TYPE.CHARACTERISTIC
    ) {
        const revalidated = await classifyReferenceContributionInSession({
            workspaceId: current.workspace,
            type: current.type,
            productId: current.canonicalProduct,
            characteristicKind: current.characteristicKind,
            value: current.proposedValue,
            session,
        });

        if (
            revalidated.classification
            === PRODUCT_CONTRIBUTION_CLASSIFICATION.INVALID
        ) {
            throw new AppError(
                revalidated.reasons?.[0]?.message
                    ?? 'La contribution n’est plus valide.',
                409,
            );
        }

        if (
            revalidated.classification
            === PRODUCT_CONTRIBUTION_CLASSIFICATION.EXISTING
        ) {
            resolutionEntityId = revalidated.existingReference.id;
        } else if (current.type === PRODUCT_CONTRIBUTION_TYPE.VARIETY) {
            const published = await createProductVarietyInSession({
                actorId,
                productId: current.canonicalProduct,
                name: current.proposedValue,
                aliases: [],
                workspaceId: current.workspace,
                session,
            });
            resolutionEntityId = published._id;
        } else {
            const published = await createProductCharacteristicInSession({
                actorId,
                productId: current.canonicalProduct,
                kind: current.characteristicKind,
                name: current.proposedValue,
                aliases: [],
                workspaceId: current.workspace,
                session,
            });
            resolutionEntityId = published._id;
        }

        resolutionEntityType = current.type === PRODUCT_CONTRIBUTION_TYPE.VARIETY
            ? PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIETY
            : PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CHARACTERISTIC;
    } else {
        const duplicateCheck = await findProductDuplicateCandidates({
            name: current.proposedValue,
            aliases: [],
            workspaceId: current.workspace,
            session,
        });

        if (duplicateCheck.exactMatch) {
            resolutionEntityType = PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT;
            resolutionEntityId = duplicateCheck.exactMatch.id;
        } else {
            const created = await createGlobalProductInSession({
                actorId,
                name: current.proposedValue,
                aliases: [],
                categoryId: current.payload?.categoryId,
                reviewedCandidateIds: (
                    duplicateCheck.candidates ?? []
                ).map(({ id }) => id),
                variant: current.payload?.variant,
                dimensionProposals:
                    current.payload?.dimensionProposals ?? null,
                workspaceId: current.workspace,
                session,
            });

            resolutionEntityType = PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT;
            resolutionEntityId = created.product.id;
        }
    }

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

export {
    classifyReferenceContributionInSession,
    deriveReferenceContributionDecision,
    listReferenceContributions,
    reviewReferenceContribution,
    serializeReferenceContribution,
    submitReferenceContribution,
};
