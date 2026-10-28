import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import {
    BUSINESS_ACTIVITY_ACTION, BUSINESS_ACTIVITY_ENTITY_TYPE,
} from '../businessActivity/businessActivity.registry.js';
import { createBusinessActivityEvent } from '../businessActivity/businessActivity.service.js';
import { Dossier } from '../dossier/dossier.model.js';
import { DOSSIER_STATUS } from '../dossier/dossier.registry.js';
import { TechnicalSheet } from '../technicalSheet/technicalSheet.model.js';
import { TechnicalSheetDraft } from '../technicalSheet/technicalSheetDraft.model.js';
import { TechnicalSheetValidation } from '../technicalSheet/technicalSheetValidation.model.js';
import { TECHNICAL_SHEET_STATUS } from '../technicalSheet/technicalSheet.registry.js';
import { assertLineAssignments } from './processSheetDraft.service.js';
import { ProcessSheet, PROCESS_SHEET_EDITORIAL_STATE } from './processSheet.model.js';
import { ProcessSheetDraft } from './processSheetDraft.model.js';
import { toIngredientProjection } from './processSheetIngredientProjection.js';
import { serializeProcess } from './processSheet.service.js';

const conflict = () => new AppError(
    'La Fiche process a changé ou sa composition M-004 n’est plus à jour. Rechargez-la avant validation.',
    409,
);

// Only the current content is validated; no M-006 version/snapshot is created.
const validateProcessSheet = async ({
    workspaceId, dossierId, processSheetId, actorId, expectedRevision,
}) => mongoose.connection.transaction(async (session) => {
    const dossier = await Dossier.findOne(mongoose.trusted({
        _id: dossierId, workspace: workspaceId, status: DOSSIER_STATUS.ACTIVE,
    })).session(session);
    if (!dossier) throw conflict();

    const process = await ProcessSheet.findOne(mongoose.trusted({
        _id: processSheetId, workspace: workspaceId, dossier: dossierId,
        status: TECHNICAL_SHEET_STATUS.ACTIVE,
    })).session(session);
    if (!process) throw new AppError('Fiche process active introuvable.', 404);
    if (process.revision !== expectedRevision
        || process.editorialState === PROCESS_SHEET_EDITORIAL_STATE.VALIDATED) throw conflict();

    const draft = await ProcessSheetDraft.findOne(mongoose.trusted({
        processSheet: process._id, workspace: workspaceId, dossier: dossierId,
    })).session(session);
    if (!draft) throw conflict();
    if (!draft.phases?.length || !draft.phases.some(
        (phase) => phase.steps?.some((step) => step.title?.trim() && step.instructions?.trim()),
    )) {
        throw new AppError('Renseignez au moins une phase et une étape avec des instructions avant validation.', 400);
    }

    // Lock the M-004 parent to serialize against M-004 validations and lifecycle changes.
    // No change to M-004 composition, economic data, status or modified timestamps.
    const parent = await TechnicalSheet.findOneAndUpdate(mongoose.trusted({
        _id: process.technicalSheet, workspace: workspaceId, dossier: dossierId,
        status: TECHNICAL_SHEET_STATUS.ACTIVE,
        currentValidatedState: process.sourceValidation,
    }), { $inc: { processEligibilityRevision: 1 } }, {
        session, returnDocument: 'after', timestamps: false,
    });
    if (!parent) throw conflict();

    // A pending M-004 revision is not an official composition. A previously
    // created process stays readable, but cannot be newly validated until the
    // parent revision has been resolved. The parent write above serializes this
    // check against M-004 startDraft.
    const openParentDraft = await TechnicalSheetDraft.exists(mongoose.trusted({
        technicalSheet: process.technicalSheet,
        workspace: workspaceId,
        dossier: dossierId,
    })).session(session);
    if (openParentDraft) throw conflict();

    const source = await TechnicalSheetValidation.findOne(mongoose.trusted({
        _id: process.sourceValidation, technicalSheet: process.technicalSheet,
        workspace: workspaceId, dossier: dossierId,
    })).session(session);
    if (!source) throw conflict();
    assertLineAssignments({
        phases: draft.phases, unassignedReasons: draft.unassignedReasons ?? [],
        projection: toIngredientProjection({ sourceKind: 'VALIDATION', source }),
    });

    const validatedAt = new Date();
    const updated = await ProcessSheet.findOneAndUpdate(mongoose.trusted({
        _id: process._id, workspace: workspaceId, dossier: dossierId,
        status: TECHNICAL_SHEET_STATUS.ACTIVE, revision: expectedRevision,
        editorialState: PROCESS_SHEET_EDITORIAL_STATE.DRAFT,
    }), {
        $set: {
            editorialState: PROCESS_SHEET_EDITORIAL_STATE.VALIDATED,
            validatedAt, validatedBy: actorId, updatedBy: actorId,
        },
        $inc: { revision: 1 },
    }, { session, returnDocument: 'after', runValidators: true });
    if (!updated) throw conflict();

    await createBusinessActivityEvent({
        workspaceId, dossierId, actorId,
        action: BUSINESS_ACTIVITY_ACTION.PROCESS_SHEET_VALIDATED,
        entityType: BUSINESS_ACTIVITY_ENTITY_TYPE.PROCESS_SHEET,
        entityId: process._id,
        metadata: {
            revision: updated.revision,
            phaseCount: draft.phases.length,
            stepCount: draft.phases.reduce((total, phase) => total + phase.steps.length, 0),
        },
    }, { session });

    return serializeProcess(updated);
});

export { validateProcessSheet };
