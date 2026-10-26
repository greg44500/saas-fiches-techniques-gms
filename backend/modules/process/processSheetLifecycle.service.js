import mongoose from 'mongoose';

import { ProcessSheet } from './processSheet.model.js';
import { ProcessSheetDraft } from './processSheetDraft.model.js';

/**
 * Called exclusively INSIDE the existing M-004 transaction. M-006 has no
 * independent archive endpoint. The parent controls every status change.
 */
const synchronizeProcessWithTechnicalSheet = async ({
    workspaceId, dossierId, technicalSheetId, status, actorId, session,
}) => ProcessSheet.updateOne(mongoose.trusted({
    workspace: workspaceId,
    dossier: dossierId,
    technicalSheet: technicalSheetId,
}), {
    $set: { status, updatedBy: actorId },
}, { session, timestamps: false });

const purgeProcessForTechnicalSheet = async ({
    workspaceId, technicalSheetId, session,
}) => {
    const process = await ProcessSheet.findOne(mongoose.trusted({
        workspace: workspaceId,
        technicalSheet: technicalSheetId,
    })).select('_id').session(session);
    if (!process) return;
    await ProcessSheetDraft.deleteMany(mongoose.trusted({
        workspace: workspaceId, processSheet: process._id,
    }), { session });
    await ProcessSheet.deleteOne(mongoose.trusted({
        workspace: workspaceId, _id: process._id,
    }), { session });
};

export { purgeProcessForTechnicalSheet, synchronizeProcessWithTechnicalSheet };
