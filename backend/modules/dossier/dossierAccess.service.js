import mongoose from 'mongoose';

import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import { AppError } from '../../utils/appError.js';
import {
    BUSINESS_ACTIVITY_ACTION,
    BUSINESS_ACTIVITY_ENTITY_TYPE,
} from '../businessActivity/businessActivity.registry.js';
import {
    createBusinessActivityEvent,
} from '../businessActivity/businessActivity.service.js';
import { Role } from '../role/role.model.js';
import {
    WorkspaceMember,
} from '../workspaceMember/workspaceMember.model.js';
import {
    DOSSIER_ACCESS_GRANT_STATUS,
    DOSSIER_ACCESS_REVOCATION_REASON,
} from './dossierAccess.registry.js';
import {
    DossierAccessGrant,
} from './dossierAccess.model.js';
import { Dossier } from './dossier.model.js';
import { DOSSIER_STATUS } from './dossier.registry.js';
import {
    serializeDossierAccessGrant,
} from './dossier.serializer.js';


const GRANT_MUTABLE_DOSSIER_STATUSES = Object.freeze([
    DOSSIER_STATUS.ACTIVE,
    DOSSIER_STATUS.PAUSED,
]);

const assertDossierAllowsGrantMutation = async ({
    workspaceId,
    dossierId,
    session,
}) => {
    /*
     * L'incrément technique transforme ce contrôle d'état en écriture sur le
     * document Dossier. Une transition lifecycle concurrente touche le même
     * document : MongoDB détecte alors le conflit transactionnel et le retry
     * relit le statut courant avant de créer ou révoquer un grant.
     */
    const dossier = await Dossier.findOneAndUpdate(
        {
            _id: dossierId,
            workspace: workspaceId,
            status: mongoose.trusted({
                $in: GRANT_MUTABLE_DOSSIER_STATUSES,
            }),
        },
        {
            $inc: {
                accessMutationVersion: 1,
            },
        },
        {
            new: true,
            session,
            timestamps: false,
        },
    );

    if (!dossier) {
        throw new AppError(
            'État du Dossier incompatible avec la gestion des accès',
            409,
        );
    }

    return dossier;
};

const populateGrantMembership = (query) => query.populate({
    path: 'workspaceMember',
    select: '_id status user role',
    populate: [
        {
            path: 'user',
            select: '_id firstName lastName',
        },
        {
            path: 'role',
            select: '_id key name',
        },
    ],
});

const listDossierAccessGrants = async ({
    workspaceId,
    dossierId,
    status,
    page = 1,
    limit = 20,
}) => {
    const filter = {
        workspace: workspaceId,
        dossier: dossierId,
        status,
    };
    const skip = (page - 1) * limit;

    const [grants, total] = await Promise.all([
        populateGrantMembership(
            DossierAccessGrant.find(filter)
                .sort({
                    grantedAt: -1,
                    _id: -1,
                })
                .skip(skip)
                .limit(limit),
        ).lean(),
        DossierAccessGrant.countDocuments(filter),
    ]);

    return {
        accessGrants:
            grants.map(serializeDossierAccessGrant),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const loadTargetMembershipReference = async ({
    workspaceId,
    membershipId,
    session,
}) => {
    const membership = await WorkspaceMember.findOne({
        _id: membershipId,
        workspace: workspaceId,
    })
        .session(session)
        .lean();

    if (!membership) {
        throw new AppError(
            'Membre introuvable',
            404,
        );
    }

    return membership;
};

const loadTargetMembership = async ({
    workspaceId,
    membershipId,
    session,
}) => {
    const membership =
        await loadTargetMembershipReference({
            workspaceId,
            membershipId,
            session,
        });

    if (
        membership.status
        !== WORKSPACE_MEMBER_STATUS.ACTIVE
    ) {
        throw new AppError(
            'Seul un membre actif peut recevoir un accès Dossier',
            409,
        );
    }

    const role = await Role.findOne({
        _id: membership.role,
        workspace: workspaceId,
    })
        .session(session)
        .lean();

    if (!role) {
        throw new AppError(
            'Rôle du membre introuvable',
            409,
        );
    }

    if (
        role.isSystem
        && role.key === SYSTEM_ROLE_KEY.OWNER
    ) {
        throw new AppError(
            'Le propriétaire possède déjà un accès implicite à tous les Dossiers',
            409,
        );
    }

    return membership;
};

const createGrantInTransaction = async ({
    workspaceId,
    dossierId,
    membershipId,
    actorId,
    session,
}) => {
    await assertDossierAllowsGrantMutation({
        workspaceId,
        dossierId,
        session,
    });

    await loadTargetMembership({
        workspaceId,
        membershipId,
        session,
    });

    const currentGrant = await DossierAccessGrant.findOne({
        workspace: workspaceId,
        dossier: dossierId,
        workspaceMember: membershipId,
        status: DOSSIER_ACCESS_GRANT_STATUS.ACTIVE,
    }).session(session);

    if (currentGrant) {
        return {
            grant: currentGrant,
            created: false,
        };
    }

    const [grant] = await DossierAccessGrant.create(
        [
            {
                workspace: workspaceId,
                dossier: dossierId,
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
            dossierId,
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

    return {
        grant,
        created: true,
    };
};

const grantDossierAccess = async ({
    workspaceId,
    dossierId,
    membershipId,
    actorId,
}) => {
    try {
        const result =
            await mongoose.connection.transaction(
                (session) =>
                    createGrantInTransaction({
                        workspaceId,
                        dossierId,
                        membershipId,
                        actorId,
                        session,
                    }),
            );

        const populatedGrant =
            await populateGrantMembership(
                DossierAccessGrant.findById(
                    result.grant._id,
                ),
            ).lean();

        return {
            accessGrant:
                serializeDossierAccessGrant(
                    populatedGrant,
                ),
            created: result.created,
        };
    } catch (error) {
        if (error?.code !== 11000) {
            throw error;
        }

        const currentGrant =
            await populateGrantMembership(
                DossierAccessGrant.findOne({
                    workspace: workspaceId,
                    dossier: dossierId,
                    workspaceMember: membershipId,
                    status:
                        DOSSIER_ACCESS_GRANT_STATUS.ACTIVE,
                }),
            ).lean();

        if (!currentGrant) {
            throw error;
        }

        return {
            accessGrant:
                serializeDossierAccessGrant(
                    currentGrant,
                ),
            created: false,
        };
    }
};

const revokeActiveGrantsInSession = async ({
    workspaceId,
    filter,
    actorId,
    revocationReason,
    session,
}) => {
    if (!session) {
        throw new TypeError(
            'session is required to revoke Dossier grants',
        );
    }

    const grants = await DossierAccessGrant.find({
        workspace: workspaceId,
        ...filter,
        status: DOSSIER_ACCESS_GRANT_STATUS.ACTIVE,
    }).session(session);

    const revokedAt = new Date();

    for (const grant of grants) {
        grant.status =
            DOSSIER_ACCESS_GRANT_STATUS.REVOKED;
        grant.revokedAt = revokedAt;
        grant.revokedBy = actorId;
        grant.revocationReason = revocationReason;

        await grant.save({ session });

        await createBusinessActivityEvent(
            {
                workspaceId,
                dossierId: grant.dossier,
                actorId,
                action:
                    BUSINESS_ACTIVITY_ACTION
                        .DOSSIER_ACCESS_REVOKED,
                entityType:
                    BUSINESS_ACTIVITY_ENTITY_TYPE
                        .DOSSIER_ACCESS_GRANT,
                entityId: grant._id,
                metadata: {
                    membershipId:
                        grant.workspaceMember.toString(),
                    revocationReason,
                },
            },
            { session },
        );
    }

    return grants.length;
};

const revokeActiveGrantsForDossierInSession = ({
    workspaceId,
    dossierId,
    actorId,
    revocationReason =
        DOSSIER_ACCESS_REVOCATION_REASON
            .DOSSIER_DELETED,
    session,
}) => revokeActiveGrantsInSession({
    workspaceId,
    filter: {
        dossier: dossierId,
    },
    actorId,
    revocationReason,
    session,
});

const revokeActiveGrantsForMembershipInSession = ({
    workspaceId,
    membershipId,
    actorId,
    revocationReason =
        DOSSIER_ACCESS_REVOCATION_REASON
            .WORKSPACE_MEMBER_REMOVED,
    session,
}) => revokeActiveGrantsInSession({
    workspaceId,
    filter: {
        workspaceMember: membershipId,
    },
    actorId,
    revocationReason,
    session,
});

const revokeDossierAccess = async ({
    workspaceId,
    dossierId,
    membershipId,
    actorId,
}) => mongoose.connection.transaction(async (session) => {
    await assertDossierAllowsGrantMutation({
        workspaceId,
        dossierId,
        session,
    });

    await loadTargetMembershipReference({
        workspaceId,
        membershipId,
        session,
    });

    const revokedCount =
        await revokeActiveGrantsInSession({
            workspaceId,
            filter: {
                dossier: dossierId,
                workspaceMember: membershipId,
            },
            actorId,
            revocationReason:
                DOSSIER_ACCESS_REVOCATION_REASON.MANUAL,
            session,
        });

    return {
        revoked: revokedCount > 0,
    };
});


export {
    grantDossierAccess,
    listDossierAccessGrants,
    revokeActiveGrantsForDossierInSession,
    revokeActiveGrantsForMembershipInSession,
    revokeDossierAccess,
};
