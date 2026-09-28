import mongoose from 'mongoose';

import {
    BUSINESS_ACTIVITY_ACTION,
    BUSINESS_ACTIVITY_ENTITY_TYPE,
} from '../businessActivity/businessActivity.registry.js';
import {
    createBusinessActivityEvent,
} from '../businessActivity/businessActivity.service.js';
import {
    Dossier,
} from '../dossier/dossier.model.js';
import {
    DOSSIER_STATUS,
} from '../dossier/dossier.registry.js';
import { AppError } from '../../utils/appError.js';

const SETTINGS_MUTABLE_DOSSIER_STATUSES = Object.freeze([
    DOSSIER_STATUS.ACTIVE,
    DOSSIER_STATUS.PAUSED,
]);

const serializeDossierTechnicalSheetSettings = (
    dossier,
) => ({
    dossierId: dossier._id.toString(),
    defaultTargetMarginBasisPoints:
        dossier.technicalSheetSettings
            ?.defaultTargetMarginBasisPoints
        ?? null,
});

const getDossierTechnicalSheetSettings = async ({
    workspaceId,
    dossierId,
}) => {
    const dossier = await Dossier.findOne({
        _id: dossierId,
        workspace: workspaceId,
    }).select(
        '_id technicalSheetSettings',
    );

    if (!dossier) {
        throw new AppError(
            'Dossier introuvable.',
            404,
        );
    }

    return serializeDossierTechnicalSheetSettings(
        dossier,
    );
};

const updateDossierTechnicalSheetSettings = async ({
    workspaceId,
    dossierId,
    actorId,
    defaultTargetMarginBasisPoints,
}) => mongoose.connection.transaction(
    async (session) => {
        const dossier =
            await Dossier.findOneAndUpdate(
                {
                    _id: dossierId,
                    workspace: workspaceId,
                    status: mongoose.trusted({
                        $in:
                            SETTINGS_MUTABLE_DOSSIER_STATUSES,
                    }),
                },
                {
                    $set: {
                        'technicalSheetSettings.defaultTargetMarginBasisPoints':
                            defaultTargetMarginBasisPoints,
                        updatedBy: actorId,
                    },
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                    session,
                },
            );

        if (!dossier) {
            throw new AppError(
                'État du Dossier incompatible avec ce réglage.',
                409,
            );
        }

        await createBusinessActivityEvent(
            {
                workspaceId,
                dossierId,
                actorId,
                action:
                    BUSINESS_ACTIVITY_ACTION
                        .TECHNICAL_SHEET_DEFAULT_MARGIN_UPDATED,
                entityType:
                    BUSINESS_ACTIVITY_ENTITY_TYPE.DOSSIER,
                entityId: dossier._id,
                metadata: {
                    defaultTargetMarginBasisPoints,
                },
            },
            { session },
        );

        return serializeDossierTechnicalSheetSettings(
            dossier,
        );
    },
);

export {
    getDossierTechnicalSheetSettings,
    serializeDossierTechnicalSheetSettings,
    updateDossierTechnicalSheetSettings,
};
