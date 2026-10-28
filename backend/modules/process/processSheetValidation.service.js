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
import { processReferenceId } from './processSheetReconciliation.js';
import { serializeProcess } from './processSheet.service.js';

const conflict = (code = 'PROCESS_SHEET_CHANGED', message = 'Cette Fiche process a changé. Actualisez-la avant de valider.') => {
    const error = new AppError(message, 409);
    error.code = code;
    return error;
};

// Only the current content is validated; no M-006 version/snapshot is created.
const validateProcessSheet = async ({
    workspaceId, dossierId, processSheetId, actorId, expectedRevision,
}) => mongoose.connection.transaction(async (session) => {
    const dossier = await Dossier.findOne(mongoose.trusted({
        _id: dossierId, workspace: workspaceId, status: DOSSIER_STATUS.ACTIVE,
    })).session(session);
    if (!dossier) throw conflict('PROCESS_SHEET_DOSSIER_INACTIVE', 'Le dossier doit être actif pour valider.');

    const process = await ProcessSheet.findOne(mongoose.trusted({
        _id: processSheetId, workspace: workspaceId, dossier: dossierId,
        status: TECHNICAL_SHEET_STATUS.ACTIVE,
    })).session(session);
    if (!process) throw new AppError('Fiche process active introuvable.', 404);
    if (process.revision !== expectedRevision) throw conflict();
    if (process.editorialState === PROCESS_SHEET_EDITORIAL_STATE.VALIDATED) {
        throw conflict('PROCESS_SHEET_ALREADY_VALIDATED', 'Cette Fiche process est déjà validée.');
    }

    const draft = await ProcessSheetDraft.findOne(mongoose.trusted({
        processSheet: process._id, workspace: workspaceId, dossier: dossierId,
    })).session(session);
    if (!draft) throw conflict('PROCESS_SHEET_DRAFT_UNAVAILABLE', 'Le contenu de fabrication est indisponible.');
    if (!draft.phases?.length || !draft.phases.some(
        (phase) => phase.steps?.some((step) => step.title?.trim() && step.instructions?.trim()),
    )) {
        const error = new AppError('Ajoutez au moins une phase et une étape avec des instructions.', 400);
        error.code = 'PROCESS_SHEET_STEP_REQUIRED';
        throw error;
    }

    // Lock the M-004 parent to serialize against M-004 validations and lifecycle changes.
    // No change to M-004 composition, economic data, status or modified timestamps.
    const parent = await TechnicalSheet.findOneAndUpdate(mongoose.trusted({
        _id: process.technicalSheet, workspace: workspaceId, dossier: dossierId,
        status: TECHNICAL_SHEET_STATUS.ACTIVE,
        currentValidatedState: processReferenceId(process),
    }), { $inc: { processEligibilityRevision: 1 } }, {
        session, returnDocument: 'after', timestamps: false,
    });
    if (!parent) throw conflict('PROCESS_SHEET_PARENT_CHANGED', 'La Fiche technique a été mise à jour. Comparez les compositions avant de valider.');

    // A pending M-004 revision is not an official composition. A previously
    // created process stays readable, but cannot be newly validated until the
    // parent revision has been resolved. The parent write above serializes this
    // check against M-004 startDraft.
    const openParentDraft = await TechnicalSheetDraft.exists(mongoose.trusted({
        technicalSheet: process.technicalSheet,
        workspace: workspaceId,
        dossier: dossierId,
    })).session(session);
    if (openParentDraft) throw conflict('PROCESS_SHEET_PARENT_REVISION_OPEN', 'Une modification de la Fiche technique est encore en cours.');

    const source = await TechnicalSheetValidation.findOne(mongoose.trusted({
        _id: processReferenceId(process), technicalSheet: process.technicalSheet,
        workspace: workspaceId, dossier: dossierId,
    })).session(session);
    if (!source) throw conflict('PROCESS_SHEET_REFERENCE_UNAVAILABLE', 'La composition liée à cette Fiche process est indisponible.');
    try {
        assertLineAssignments({
            phases: draft.phases, unassignedReasons: draft.unassignedReasons ?? [],
            projection: toIngredientProjection({ sourceKind: 'VALIDATION', source }),
        });
    } catch (error) {
        if (!error?.isOperational) throw error;
        const failure = new AppError(
            'Une association d’ingrédient doit être corrigée avant validation.', 400,
        );
        failure.code = 'PROCESS_SHEET_INGREDIENT_INVALID';
        throw failure;
    }

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
