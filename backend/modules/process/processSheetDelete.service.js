import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import {
    BUSINESS_ACTIVITY_ACTION, BUSINESS_ACTIVITY_ENTITY_TYPE,
} from '../businessActivity/businessActivity.registry.js';
import { createBusinessActivityEvent } from '../businessActivity/businessActivity.service.js';
import { Dossier } from '../dossier/dossier.model.js';
import { DOSSIER_STATUS } from '../dossier/dossier.registry.js';
import { TechnicalSheet } from '../technicalSheet/technicalSheet.model.js';
import { TECHNICAL_SHEET_STATUS } from '../technicalSheet/technicalSheet.registry.js';
import { ProcessSheet } from './processSheet.model.js';
import { ProcessSheetDraft } from './processSheetDraft.model.js';

const deletionConflict = () => {
    const error = new AppError(
        'Cette Fiche process ou sa Fiche technique a changé. Actualisez avant de supprimer.',
        409,
    );
    error.code = 'PROCESS_SHEET_DELETE_CONFLICT';
    return error;
};

/**
 * Physically delete ONLY M-006 current content. Writing the M-004 parent
 * serializes this with creation and M-004 lifecycle transactions.
 */
const deleteProcessSheet = async ({
    workspaceId, dossierId, processSheetId, actorId, expectedRevision,
}) => {
    try {
        return await mongoose.connection.transaction(async (session) => {
            const dossier = await Dossier.findOne(mongoose.trusted({
                _id: dossierId, workspace: workspaceId, status: DOSSIER_STATUS.ACTIVE,
            })).select('_id').session(session);
            if (!dossier) throw deletionConflict();

            const process = await ProcessSheet.findOne(mongoose.trusted({
                _id: processSheetId, workspace: workspaceId, dossier: dossierId,
            })).session(session);
            if (!process) throw new AppError('Fiche process introuvable.', 404);
            if (process.status !== TECHNICAL_SHEET_STATUS.ACTIVE
                || process.revision !== expectedRevision) throw deletionConflict();

            const parent = await TechnicalSheet.findOneAndUpdate(mongoose.trusted({
                _id: process.technicalSheet, workspace: workspaceId, dossier: dossierId,
                status: TECHNICAL_SHEET_STATUS.ACTIVE,
            }), { $inc: { processEligibilityRevision: 1 } }, {
                session, returnDocument: 'after', timestamps: false,
            });
            if (!parent) throw deletionConflict();

            await ProcessSheetDraft.deleteMany(mongoose.trusted({
                workspace: workspaceId, dossier: dossierId, processSheet: process._id,
            }), { session });
            const deleted = await ProcessSheet.deleteOne(mongoose.trusted({
                _id: process._id, workspace: workspaceId, dossier: dossierId,
                technicalSheet: parent._id, revision: expectedRevision,
                status: TECHNICAL_SHEET_STATUS.ACTIVE,
            }), { session });
            if (deleted.deletedCount !== 1) throw deletionConflict();

            // Audit only stable identifiers, never the deleted instructions.
            await createBusinessActivityEvent({
                workspaceId, dossierId, actorId,
                action: BUSINESS_ACTIVITY_ACTION.PROCESS_SHEET_DELETED,
                entityType: BUSINESS_ACTIVITY_ENTITY_TYPE.PROCESS_SHEET,
                entityId: process._id,
                metadata: { technicalSheetId: parent._id.toString() },
            }, { session });

            return { deletedId: process._id.toString() };
        });
    } catch (error) {
        if (error?.code === 112 || error?.hasErrorLabel?.('TransientTransactionError')) {
            throw deletionConflict();
        }
        throw error;
    }
};

export { deleteProcessSheet };
