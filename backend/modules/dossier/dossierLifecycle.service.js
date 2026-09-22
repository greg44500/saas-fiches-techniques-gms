import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import {
    BUSINESS_ACTIVITY_ACTION,
    BUSINESS_ACTIVITY_ENTITY_TYPE,
} from '../businessActivity/businessActivity.registry.js';
import {
    createBusinessActivityEvent,
} from '../businessActivity/businessActivity.service.js';
import {
    DOSSIER_ACCESS_REVOCATION_REASON,
} from './dossierAccess.registry.js';
import {
    revokeActiveGrantsForDossierInSession,
} from './dossierAccess.service.js';
import { Dossier } from './dossier.model.js';
import {
    DOSSIER_STATUS,
    DOSSIER_STATUS_TRANSITIONS,
} from './dossier.registry.js';
import { serializeDossier } from './dossier.serializer.js';


const transitionRequiresReason = ({
    fromStatus,
    toStatus,
}) => (
    toStatus === DOSSIER_STATUS.DELETED
    || (
        fromStatus === DOSSIER_STATUS.DELETED
        && toStatus === DOSSIER_STATUS.PAUSED
    )
);

const transitionDossierStatus = async ({
    workspaceId,
    dossierId,
    actorId,
    status,
    reason,
}) => mongoose.connection.transaction(async (session) => {
    const dossier = await Dossier.findOne({
        _id: dossierId,
        workspace: workspaceId,
    }).session(session);

    if (!dossier) {
        throw new AppError(
            'Dossier introuvable',
            404,
        );
    }

    const fromStatus = dossier.status;

    if (fromStatus === status) {
        return serializeDossier(dossier);
    }

    const allowedTransitions =
        DOSSIER_STATUS_TRANSITIONS[fromStatus] ?? [];

    if (!allowedTransitions.includes(status)) {
        throw new AppError(
            'Transition de statut Dossier impossible',
            409,
        );
    }

    const normalizedReason =
        typeof reason === 'string'
            ? reason.trim()
            : '';

    if (
        transitionRequiresReason({
            fromStatus,
            toStatus: status,
        })
        && !normalizedReason
    ) {
        throw new AppError(
            'Une raison est obligatoire pour cette transition',
            400,
        );
    }

    const now = new Date();

    dossier.status = status;
    dossier.statusChangedAt = now;
    dossier.statusChangedBy = actorId;
    dossier.updatedBy = actorId;

    if (status === DOSSIER_STATUS.DELETED) {
        dossier.deletedAt = now;
        dossier.deletedBy = actorId;
    } else if (
        fromStatus === DOSSIER_STATUS.DELETED
        && status === DOSSIER_STATUS.PAUSED
    ) {
        dossier.deletedAt = null;
        dossier.deletedBy = null;
    }

    await dossier.save({ session });

    if (status === DOSSIER_STATUS.DELETED) {
        await revokeActiveGrantsForDossierInSession({
            workspaceId,
            dossierId: dossier._id,
            actorId,
            revocationReason:
                DOSSIER_ACCESS_REVOCATION_REASON
                    .DOSSIER_DELETED,
            session,
        });
    }

    await createBusinessActivityEvent(
        {
            workspaceId,
            dossierId: dossier._id,
            actorId,
            action:
                BUSINESS_ACTIVITY_ACTION
                    .DOSSIER_STATUS_CHANGED,
            entityType:
                BUSINESS_ACTIVITY_ENTITY_TYPE.DOSSIER,
            entityId: dossier._id,
            metadata: {
                fromStatus,
                toStatus: status,
                ...(normalizedReason
                    ? {
                        reason:
                            normalizedReason,
                    }
                    : {}),
            },
        },
        { session },
    );

    return serializeDossier(dossier);
});


export {
    transitionDossierStatus,
    transitionRequiresReason,
};
