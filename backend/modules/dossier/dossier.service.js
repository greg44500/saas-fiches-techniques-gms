import mongoose from 'mongoose';

import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import {
    BUSINESS_ACTIVITY_ACTION,
    BUSINESS_ACTIVITY_ENTITY_TYPE,
} from '../businessActivity/businessActivity.registry.js';
import {
    createBusinessActivityEvent,
} from '../businessActivity/businessActivity.service.js';
import {
    WorkspaceMember,
} from '../workspaceMember/workspaceMember.model.js';
import {
    DOSSIER_ACCESS_GRANT_STATUS,
} from './dossierAccess.registry.js';
import {
    DossierAccessGrant,
} from './dossierAccess.model.js';
import { Dossier } from './dossier.model.js';
import { DOSSIER_STATUS } from './dossier.registry.js';
import { serializeDossier } from './dossier.serializer.js';
import { AppError } from '../../utils/appError.js';


const DEFAULT_LIST_STATUSES = Object.freeze([
    DOSSIER_STATUS.ACTIVE,
    DOSSIER_STATUS.PAUSED,
]);

const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildDossierSearchFilter = (search) => {
    if (!search) {
        return null;
    }

    const expression = new RegExp(
        escapeRegex(search),
        'i',
    );

    return {
        $or: [
            { name: expression },
            { brand: expression },
            { 'location.city': expression },
            { 'location.postalCode': expression },
        ],
    };
};

const listDossiers = async ({
    workspaceId,
    membershipId,
    isOwner,
    page = 1,
    limit = 20,
    search,
    status,
    canReadDeleted = false,
}) => {
    if (
        status === DOSSIER_STATUS.DELETED
        && !canReadDeleted
    ) {
        throw new AppError(
            'Permission lifecycle requise pour consulter les Dossiers supprimés',
            403,
        );
    }

    const workspaceObjectId =
        new mongoose.Types.ObjectId(
            workspaceId.toString(),
        );
    const match = {
        workspace: workspaceObjectId,
        status: status ?? {
            $in: DEFAULT_LIST_STATUSES,
        },
    };

    const searchFilter =
        buildDossierSearchFilter(search);

    if (searchFilter) {
        Object.assign(match, searchFilter);
    }

    const pipeline = [
        {
            $match: match,
        },
    ];

    if (!isOwner) {
        const membershipObjectId =
            new mongoose.Types.ObjectId(
                membershipId.toString(),
            );

        pipeline.push(
            {
                $lookup: {
                    from:
                        DossierAccessGrant
                            .collection.name,
                    let: {
                        dossierId: '$_id',
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: [
                                                '$dossier',
                                                '$$dossierId',
                                            ],
                                        },
                                        {
                                            $eq: [
                                                '$workspace',
                                                workspaceObjectId,
                                            ],
                                        },
                                        {
                                            $eq: [
                                                '$workspaceMember',
                                                membershipObjectId,
                                            ],
                                        },
                                        {
                                            $eq: [
                                                '$status',
                                                DOSSIER_ACCESS_GRANT_STATUS
                                                    .ACTIVE,
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                        {
                            $limit: 1,
                        },
                    ],
                    as: 'scopeGrant',
                },
            },
            {
                $match: {
                    'scopeGrant.0': {
                        $exists: true,
                    },
                },
            },
            {
                $unset: 'scopeGrant',
            },
        );
    }

    const skip = (page - 1) * limit;

    pipeline.push(
        {
            $sort: {
                name: 1,
                _id: 1,
            },
        },
        {
            $facet: {
                dossiers: [
                    {
                        $skip: skip,
                    },
                    {
                        $limit: limit,
                    },
                ],
                metadata: [
                    {
                        $count: 'total',
                    },
                ],
            },
        },
    );

    const [result] =
        await Dossier.aggregate(pipeline);

    const dossiers = result?.dossiers ?? [];
    const total =
        result?.metadata?.[0]?.total ?? 0;

    return {
        dossiers: dossiers.map(serializeDossier),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const createDossier = async ({
    workspaceId,
    membershipId,
    isOwner,
    actorId,
    data,
}) => mongoose.connection.transaction(async (session) => {
    if (!isOwner) {
        const membership =
            await WorkspaceMember.findOne({
                _id: membershipId,
                workspace: workspaceId,
                status: WORKSPACE_MEMBER_STATUS.ACTIVE,
            }).session(session);

        if (!membership) {
            throw new AppError(
                'Membre actif requis pour créer un Dossier',
                409,
            );
        }
    }

    const [dossier] = await Dossier.create(
        [
            {
                workspace: workspaceId,
                ...data,
                status: DOSSIER_STATUS.ACTIVE,
                statusChangedBy: actorId,
                createdBy: actorId,
                updatedBy: actorId,
            },
        ],
        { session },
    );

    await createBusinessActivityEvent(
        {
            workspaceId,
            dossierId: dossier._id,
            actorId,
            action:
                BUSINESS_ACTIVITY_ACTION.DOSSIER_CREATED,
            entityType:
                BUSINESS_ACTIVITY_ENTITY_TYPE.DOSSIER,
            entityId: dossier._id,
        },
        { session },
    );

    if (!isOwner) {
        const [grant] = await DossierAccessGrant.create(
            [
                {
                    workspace: workspaceId,
                    dossier: dossier._id,
                    workspaceMember: membershipId,
                    status:
                        DOSSIER_ACCESS_GRANT_STATUS.ACTIVE,
                    grantedBy: actorId,
                },
            ],
            { session },
        );

        await createBusinessActivityEvent(
            {
                workspaceId,
                dossierId: dossier._id,
                actorId,
                action:
                    BUSINESS_ACTIVITY_ACTION
                        .DOSSIER_ACCESS_GRANTED,
                entityType:
                    BUSINESS_ACTIVITY_ENTITY_TYPE
                        .DOSSIER_ACCESS_GRANT,
                entityId: grant._id,
                metadata: {
                    membershipId:
                        membershipId.toString(),
                },
            },
            { session },
        );
    }

    return serializeDossier(dossier);
});

const currentLocation = (dossier) => ({
    address: dossier.location?.address ?? null,
    postalCode: dossier.location?.postalCode ?? null,
    city: dossier.location?.city ?? null,
});

const applyLocationPatch = ({
    dossier,
    locationPatch,
    changedFields,
}) => {
    if (locationPatch === undefined) {
        return;
    }

    if (locationPatch === null) {
        if (dossier.location !== null) {
            dossier.location = null;
            changedFields.push('location');
        }

        return;
    }

    const before = currentLocation(dossier);
    const after = {
        ...before,
    };

    for (const key of [
        'address',
        'postalCode',
        'city',
    ]) {
        if (
            Object.prototype.hasOwnProperty.call(
                locationPatch,
                key,
            )
        ) {
            after[key] = locationPatch[key];
        }
    }

    for (const key of Object.keys(after)) {
        if (before[key] !== after[key]) {
            changedFields.push(
                `location.${key}`,
            );
        }
    }

    if (
        changedFields.some(
            (field) => field.startsWith('location.'),
        )
    ) {
        dossier.location = after;
    }
};

const updateDossier = async ({
    workspaceId,
    dossierId,
    actorId,
    data,
}) => mongoose.connection.transaction(async (session) => {
    const dossier = await Dossier.findOne({
        _id: dossierId,
        workspace: workspaceId,
        status: mongoose.trusted({
            $in: [
                DOSSIER_STATUS.ACTIVE,
                DOSSIER_STATUS.PAUSED,
            ],
        }),
    }).session(session);

    if (!dossier) {
        throw new AppError(
            'État du Dossier incompatible avec la modification',
            409,
        );
    }

    const changedFields = [];

    for (const field of [
        'name',
        'brand',
        'documentEmail',
        'phone',
        'contactName',
    ]) {
        if (
            !Object.prototype.hasOwnProperty.call(
                data,
                field,
            )
        ) {
            continue;
        }

        const nextValue = data[field];

        if (dossier[field] !== nextValue) {
            dossier[field] = nextValue;
            changedFields.push(field);
        }
    }

    applyLocationPatch({
        dossier,
        locationPatch: data.location,
        changedFields,
    });

    if (changedFields.length === 0) {
        return serializeDossier(dossier);
    }

    dossier.updatedBy = actorId;
    await dossier.save({ session });

    await createBusinessActivityEvent(
        {
            workspaceId,
            dossierId: dossier._id,
            actorId,
            action:
                BUSINESS_ACTIVITY_ACTION.DOSSIER_UPDATED,
            entityType:
                BUSINESS_ACTIVITY_ENTITY_TYPE.DOSSIER,
            entityId: dossier._id,
            metadata: {
                changedFields,
            },
        },
        { session },
    );

    return serializeDossier(dossier);
});


export {
    createDossier,
    listDossiers,
    updateDossier,
};
