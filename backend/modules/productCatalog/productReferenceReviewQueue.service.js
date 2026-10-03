import mongoose from 'mongoose';

import { Workspace } from '../workspace/workspace.model.js';
import { User } from '../users/user.model.js';
import { CanonicalProduct } from './canonicalProduct.model.js';
import {
    PRODUCT_CONTRIBUTION_STATUS,
    PRODUCT_DIMENSION_REVIEW_STATUS,
    PRODUCT_REFERENCE_EVENT_ENTITY_TYPE,
    PRODUCT_REVIEW_QUEUE_TYPE,
    PRODUCT_STATUS,
} from './productCatalog.registry.js';
import { ProductCharacteristic } from './productCharacteristic.model.js';
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

const contributionStages = ({
    include,
    workspaceId = null,
}) => [
    {
        $match: include
            ? {
                status: PRODUCT_CONTRIBUTION_STATUS.PENDING_REVIEW,
                ...(workspaceId
                    ? { workspace: toObjectId(workspaceId) }
                    : {}),
            }
            : impossibleMatch,
    },
    {
        $project: {
            sourceId: '$_id',
            type: { $literal: PRODUCT_REVIEW_QUEUE_TYPE.CONTRIBUTION },
            productId: {
                $ifNull: [
                    '$canonicalProduct',
                    '$provisionalEntityId',
                ],
            },
            workspaceId: '$workspace',
            authorId: '$author',
            value: '$proposedValue',
            contributionType: '$type',
            dimensionType: { $literal: null },
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
                type: {
                    $literal:
                        PRODUCT_REVIEW_QUEUE_TYPE.DIMENSION_REVIEW,
                },
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

const enrichReviewQueueItems = async (items) => {
    const productIds = [
        ...new Set(
            items.map(({ productId }) => productId?.toString()).filter(Boolean),
        ),
    ];
    const workspaceIds = [
        ...new Set(
            items.map(({ workspaceId }) => workspaceId?.toString()).filter(Boolean),
        ),
    ];
    const authorIds = [
        ...new Set(
            items.map(({ authorId }) => authorId?.toString()).filter(Boolean),
        ),
    ];

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
            type: item.type,
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
            workspaceId: item.workspaceId?.toString() ?? null,
            workspace: workspace
                ? {
                    id: workspace._id.toString(),
                    name: workspace.name,
                }
                : null,
            authorId: item.authorId?.toString() ?? null,
            author: author
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
                            contributionCount: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                '$type',
                                                PRODUCT_REVIEW_QUEUE_TYPE
                                                    .CONTRIBUTION,
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            dimensionReviewCount: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                '$type',
                                                PRODUCT_REVIEW_QUEUE_TYPE
                                                    .DIMENSION_REVIEW,
                                            ],
                                        },
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
        contributionCount: 0,
        dimensionReviewCount: 0,
    };

    const [items, originOptions] = await Promise.all([
        enrichReviewQueueItems(rawItems),
        origins === 'omit'
            ? Promise.resolve([])
            : loadReviewQueueOrigins({ type }),
    ]);

    return {
        items,
        summary: {
            total: summary.total ?? 0,
            contributionCount: summary.contributionCount ?? 0,
            dimensionReviewCount: summary.dimensionReviewCount ?? 0,
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
