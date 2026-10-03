import mongoose from 'mongoose';

import { Workspace } from '../workspace/workspace.model.js';
import { User } from '../users/user.model.js';
import { CanonicalProduct } from './canonicalProduct.model.js';
import {
    PRODUCT_CONTRIBUTION_STATUS,
    PRODUCT_CONTRIBUTION_TYPE,
    PRODUCT_DIMENSION_REVIEW_STATUS,
    PRODUCT_GOVERNANCE_STATUS,
    PRODUCT_REFERENCE_EVENT_ENTITY_TYPE,
    PRODUCT_REVIEW_QUEUE_TYPE,
    PRODUCT_STATUS,
} from './productCatalog.registry.js';
import { ProductCharacteristic } from './productCharacteristic.model.js';
import { ProductVariant } from './productVariant.model.js';
import { ProductVariety } from './productVariety.model.js';
import { ReferenceContribution } from './referenceContribution.model.js';

const toObjectId = (value) => (
    value instanceof mongoose.Types.ObjectId
        ? value
        : new mongoose.Types.ObjectId(value)
);

const impossibleMatch = Object.freeze({
    _id: { $exists: false },
});

const provisionalTargetLookup = ({
    collection,
    as,
}) => ({
    $lookup: {
        from: collection,
        let: { targetId: '$provisionalEntityId' },
        pipeline: [
            {
                $match: {
                    $expr: {
                        $eq: ['$_id', '$$targetId'],
                    },
                    identityActive: true,
                    governanceStatus:
                        PRODUCT_GOVERNANCE_STATUS.PROVISIONAL,
                },
            },
            { $limit: 1 },
        ],
        as,
    },
});

const contributionStages = ({
    include,
    workspaceId = null,
}) => [
    {
        $match: include
            ? {
                status: PRODUCT_CONTRIBUTION_STATUS.PENDING_REVIEW,
                provisionalEntityId: { $ne: null },
                ...(workspaceId
                    ? { workspace: toObjectId(workspaceId) }
                    : {}),
            }
            : impossibleMatch,
    },
    provisionalTargetLookup({
        collection: CanonicalProduct.collection.name,
        as: 'productTarget',
    }),
    provisionalTargetLookup({
        collection: ProductVariant.collection.name,
        as: 'variantTarget',
    }),
    provisionalTargetLookup({
        collection: ProductVariety.collection.name,
        as: 'varietyTarget',
    }),
    provisionalTargetLookup({
        collection: ProductCharacteristic.collection.name,
        as: 'characteristicTarget',
    }),
    {
        $match: {
            $expr: {
                $switch: {
                    branches: [
                        {
                            case: {
                                $eq: [
                                    '$type',
                                    PRODUCT_CONTRIBUTION_TYPE.CANONICAL_PRODUCT,
                                ],
                            },
                            then: {
                                $gt: [{ $size: '$productTarget' }, 0],
                            },
                        },
                        {
                            case: {
                                $eq: [
                                    '$type',
                                    PRODUCT_CONTRIBUTION_TYPE.VARIANT,
                                ],
                            },
                            then: {
                                $gt: [{ $size: '$variantTarget' }, 0],
                            },
                        },
                        {
                            case: {
                                $eq: [
                                    '$type',
                                    PRODUCT_CONTRIBUTION_TYPE.VARIETY,
                                ],
                            },
                            then: {
                                $gt: [{ $size: '$varietyTarget' }, 0],
                            },
                        },
                        {
                            case: {
                                $eq: [
                                    '$type',
                                    PRODUCT_CONTRIBUTION_TYPE.CHARACTERISTIC,
                                ],
                            },
                            then: {
                                $gt: [{ $size: '$characteristicTarget' }, 0],
                            },
                        },
                    ],
                    default: false,
                },
            },
        },
    },
    {
        $project: {
            sourceId: '$_id',
            targetId: '$provisionalEntityId',
            type: { $literal: PRODUCT_REVIEW_QUEUE_TYPE.CONTRIBUTION },
            dataType: {
                $switch: {
                    branches: [
                        {
                            case: {
                                $eq: [
                                    '$type',
                                    PRODUCT_CONTRIBUTION_TYPE.CANONICAL_PRODUCT,
                                ],
                            },
                            then: 'PRODUCT',
                        },
                        {
                            case: {
                                $eq: [
                                    '$type',
                                    PRODUCT_CONTRIBUTION_TYPE.VARIANT,
                                ],
                            },
                            then: 'REFERENCE',
                        },
                    ],
                    default: 'DIMENSION',
                },
            },
            productId: '$canonicalProduct',
            workspaceId: '$workspace',
            authorId: '$author',
            value: {
                $switch: {
                    branches: [
                        {
                            case: {
                                $eq: [
                                    '$type',
                                    PRODUCT_CONTRIBUTION_TYPE.CANONICAL_PRODUCT,
                                ],
                            },
                            then: {
                                $ifNull: [
                                    {
                                        $arrayElemAt: [
                                            '$productTarget.name',
                                            0,
                                        ],
                                    },
                                    '$proposedValue',
                                ],
                            },
                        },
                        {
                            case: {
                                $eq: [
                                    '$type',
                                    PRODUCT_CONTRIBUTION_TYPE.VARIANT,
                                ],
                            },
                            then: {
                                $ifNull: [
                                    {
                                        $arrayElemAt: [
                                            '$variantTarget.name',
                                            0,
                                        ],
                                    },
                                    '$proposedValue',
                                ],
                            },
                        },
                        {
                            case: {
                                $eq: [
                                    '$type',
                                    PRODUCT_CONTRIBUTION_TYPE.VARIETY,
                                ],
                            },
                            then: {
                                $ifNull: [
                                    {
                                        $arrayElemAt: [
                                            '$varietyTarget.name',
                                            0,
                                        ],
                                    },
                                    '$proposedValue',
                                ],
                            },
                        },
                        {
                            case: {
                                $eq: [
                                    '$type',
                                    PRODUCT_CONTRIBUTION_TYPE.CHARACTERISTIC,
                                ],
                            },
                            then: {
                                $ifNull: [
                                    {
                                        $arrayElemAt: [
                                            '$characteristicTarget.name',
                                            0,
                                        ],
                                    },
                                    '$proposedValue',
                                ],
                            },
                        },
                    ],
                    default: '$proposedValue',
                },
            },
            contributionType: '$type',
            dimensionType: {
                $switch: {
                    branches: [
                        {
                            case: {
                                $eq: [
                                    '$type',
                                    PRODUCT_CONTRIBUTION_TYPE.VARIETY,
                                ],
                            },
                            then: 'VARIETY',
                        },
                        {
                            case: {
                                $eq: [
                                    '$type',
                                    PRODUCT_CONTRIBUTION_TYPE.CHARACTERISTIC,
                                ],
                            },
                            then: 'CHARACTERISTIC',
                        },
                    ],
                    default: null,
                },
            },
            characteristicKind: '$characteristicKind',
            reasons: { $ifNull: ['$reasons', []] },
            candidates: { $ifNull: ['$payload.candidates', []] },
            createdAt: '$createdAt',
            updatedAt: '$updatedAt',
        },
    },
];

const pendingContributionLookup = (provisionalEntityType) => ({
    $lookup: {
        from: ReferenceContribution.collection.name,
        let: { dimensionId: '$_id' },
        pipeline: [
            {
                $match: {
                    $expr: {
                        $and: [
                            {
                                $eq: [
                                    '$status',
                                    PRODUCT_CONTRIBUTION_STATUS.PENDING_REVIEW,
                                ],
                            },
                            {
                                $eq: [
                                    '$provisionalEntityType',
                                    provisionalEntityType,
                                ],
                            },
                            {
                                $eq: [
                                    '$provisionalEntityId',
                                    '$$dimensionId',
                                ],
                            },
                        ],
                    },
                },
            },
            { $limit: 1 },
        ],
        as: 'pendingContribution',
    },
});

const dimensionStages = ({
    dimensionType,
    include,
    workspaceId = null,
}) => {
    const provisionalEntityType =
        dimensionType === 'VARIETY'
            ? PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIETY
            : PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CHARACTERISTIC;

    return [
        {
            $match: include
                ? {
                    qualityReviewStatus:
                        PRODUCT_DIMENSION_REVIEW_STATUS.PENDING,
                    status: PRODUCT_STATUS.ACTIVE,
                    identityActive: true,
                    contributedFromWorkspace: {
                        $ne: null,
                        ...(workspaceId
                            ? { $eq: toObjectId(workspaceId) }
                            : {}),
                    },
                }
                : impossibleMatch,
        },
        pendingContributionLookup(provisionalEntityType),
        {
            $match: {
                'pendingContribution.0': { $exists: false },
            },
        },
        {
            $project: {
                sourceId: '$_id',
                targetId: '$_id',
                type: {
                    $literal:
                        PRODUCT_REVIEW_QUEUE_TYPE.DIMENSION_REVIEW,
                },
                dataType: { $literal: 'DIMENSION' },
                productId: '$canonicalProduct',
                workspaceId: '$contributedFromWorkspace',
                authorId: '$createdBy',
                value: '$name',
                contributionType: { $literal: null },
                dimensionType: { $literal: dimensionType },
                characteristicKind: dimensionType === 'CHARACTERISTIC'
                    ? '$kind'
                    : { $literal: null },
                reasons: {
                    $literal: [],
                },
                candidates: {
                    $literal: [],
                },
                createdAt: '$createdAt',
                updatedAt: '$updatedAt',
            },
        },
    ];
};

const buildUnifiedReviewQueuePipeline = ({
    type = null,
    workspaceId = null,
}) => {
    const includeContributions =
        !type || type === PRODUCT_REVIEW_QUEUE_TYPE.CONTRIBUTION;
    const includeDimensions =
        !type || type === PRODUCT_REVIEW_QUEUE_TYPE.DIMENSION_REVIEW;

    return [
        ...contributionStages({
            include: includeContributions,
            workspaceId,
        }),
        {
            $unionWith: {
                coll: ProductVariety.collection.name,
                pipeline: dimensionStages({
                    dimensionType: 'VARIETY',
                    include: includeDimensions,
                    workspaceId,
                }),
            },
        },
        {
            $unionWith: {
                coll: ProductCharacteristic.collection.name,
                pipeline: dimensionStages({
                    dimensionType: 'CHARACTERISTIC',
                    include: includeDimensions,
                    workspaceId,
                }),
            },
        },
    ];
};

const enrichReviewQueueItems = async (
    items,
    { includeOrigin = true } = {},
) => {
    const productIds = [
        ...new Set(
            items.map(({ productId }) => productId?.toString()).filter(Boolean),
        ),
    ];
    const workspaceIds = includeOrigin
        ? [
            ...new Set(
                items
                    .map(({ workspaceId }) => workspaceId?.toString())
                    .filter(Boolean),
            ),
        ]
        : [];
    const authorIds = includeOrigin
        ? [
            ...new Set(
                items
                    .map(({ authorId }) => authorId?.toString())
                    .filter(Boolean),
            ),
        ]
        : [];

    const [products, workspaces, authors] = await Promise.all([
        productIds.length
            ? CanonicalProduct.find({
                _id: mongoose.trusted({
                    $in: productIds.map(toObjectId),
                }),
            }).select('_id name').lean()
            : [],
        workspaceIds.length
            ? Workspace.find({
                _id: mongoose.trusted({
                    $in: workspaceIds.map(toObjectId),
                }),
            }).select('_id name').lean()
            : [],
        authorIds.length
            ? User.find({
                _id: mongoose.trusted({
                    $in: authorIds.map(toObjectId),
                }),
            }).select('_id firstName lastName email').lean()
            : [],
    ]);

    const productById = new Map(
        products.map((product) => [product._id.toString(), product]),
    );
    const workspaceById = new Map(
        workspaces.map((workspace) => [workspace._id.toString(), workspace]),
    );
    const authorById = new Map(
        authors.map((author) => [author._id.toString(), author]),
    );

    return items.map((item) => {
        const product = item.productId
            ? productById.get(item.productId.toString())
            : null;
        const workspace = item.workspaceId
            ? workspaceById.get(item.workspaceId.toString())
            : null;
        const author = item.authorId
            ? authorById.get(item.authorId.toString())
            : null;

        return {
            id: item.type + ':' + item.sourceId.toString(),
            sourceId: item.sourceId.toString(),
            targetId: item.targetId?.toString() ?? null,
            type: item.type,
            dataType: item.dataType,
            value: item.value,
            contributionType: item.contributionType ?? null,
            dimensionType: item.dimensionType ?? null,
            characteristicKind: item.characteristicKind ?? null,
            productId: item.productId?.toString() ?? null,
            product: product
                ? {
                    id: product._id.toString(),
                    name: product.name,
                }
                : null,
            workspaceId: includeOrigin
                ? item.workspaceId?.toString() ?? null
                : null,
            workspace: includeOrigin && workspace
                ? {
                    id: workspace._id.toString(),
                    name: workspace.name,
                }
                : null,
            authorId: includeOrigin
                ? item.authorId?.toString() ?? null
                : null,
            author: includeOrigin && author
                ? {
                    id: author._id.toString(),
                    firstName: author.firstName ?? null,
                    lastName: author.lastName ?? null,
                    email: author.email ?? null,
                }
                : null,
            reasons: item.reasons ?? [],
            candidates: item.candidates ?? [],
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        };
    });
};

const loadReviewQueueOrigins = async ({ type = null }) => {
    const rows = await ReferenceContribution.aggregate([
        ...buildUnifiedReviewQueuePipeline({ type }),
        {
            $match: {
                workspaceId: { $ne: null },
            },
        },
        {
            $group: {
                _id: '$workspaceId',
                count: { $sum: 1 },
            },
        },
        {
            $sort: {
                count: -1,
                _id: 1,
            },
        },
    ]);

    const ids = rows.map(({ _id }) => _id);
    const workspaces = ids.length
        ? await Workspace.find({
            _id: mongoose.trusted({ $in: ids }),
        }).select('_id name').lean()
        : [];
    const workspaceById = new Map(
        workspaces.map((workspace) => [
            workspace._id.toString(),
            workspace,
        ]),
    );

    return rows.map(({ _id, count }) => ({
        id: _id.toString(),
        name:
            workspaceById.get(_id.toString())?.name
            ?? 'Espace de travail indisponible',
        count,
    }));
};

const listProductReviewQueue = async ({
    type = null,
    workspaceId = null,
    origins = 'include',
    page = 1,
    limit = 20,
}) => {
    const [result] = await ReferenceContribution.aggregate([
        ...buildUnifiedReviewQueuePipeline({
            type,
            workspaceId,
        }),
        {
            $sort: {
                createdAt: 1,
                sourceId: 1,
            },
        },
        {
            $facet: {
                items: [
                    { $skip: (page - 1) * limit },
                    { $limit: limit },
                ],
                summary: [
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            productCount: {
                                $sum: {
                                    $cond: [
                                        { $eq: ['$dataType', 'PRODUCT'] },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            referenceCount: {
                                $sum: {
                                    $cond: [
                                        { $eq: ['$dataType', 'REFERENCE'] },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            dimensionCount: {
                                $sum: {
                                    $cond: [
                                        { $eq: ['$dataType', 'DIMENSION'] },
                                        1,
                                        0,
                                    ],
                                },
                            },
                        },
                    },
                ],
            },
        },
    ]);

    const rawItems = result?.items ?? [];
    const summary = result?.summary?.[0] ?? {
        total: 0,
        productCount: 0,
        referenceCount: 0,
        dimensionCount: 0,
    };

    const [items, originOptions] = await Promise.all([
        enrichReviewQueueItems(rawItems, {
            includeOrigin: origins !== 'omit',
        }),
        origins === 'omit'
            ? Promise.resolve([])
            : loadReviewQueueOrigins({ type }),
    ]);

    return {
        items,
        summary: {
            total: summary.total ?? 0,
            productCount: summary.productCount ?? 0,
            referenceCount: summary.referenceCount ?? 0,
            dimensionCount: summary.dimensionCount ?? 0,
        },
        origins: originOptions,
        pagination: {
            page,
            limit,
            total: summary.total ?? 0,
            totalPages: Math.ceil((summary.total ?? 0) / limit),
        },
    };
};

export {
    buildUnifiedReviewQueuePipeline,
    listProductReviewQueue,
};
