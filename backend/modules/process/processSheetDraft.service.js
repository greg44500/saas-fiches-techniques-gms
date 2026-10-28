import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import {
    BUSINESS_ACTIVITY_ACTION, BUSINESS_ACTIVITY_ENTITY_TYPE,
} from '../businessActivity/businessActivity.registry.js';
import { createBusinessActivityEvent } from '../businessActivity/businessActivity.service.js';
import { Dossier } from '../dossier/dossier.model.js';
import { DOSSIER_STATUS } from '../dossier/dossier.registry.js';
import { TechnicalSheet } from '../technicalSheet/technicalSheet.model.js';
import { TechnicalSheetValidation } from '../technicalSheet/technicalSheetValidation.model.js';
import { TECHNICAL_SHEET_STATUS } from '../technicalSheet/technicalSheet.registry.js';
import { ProcessSheet, PROCESS_SHEET_EDITORIAL_STATE } from './processSheet.model.js';
import { hasProcessContentChanged } from './processSheetContent.js';
import { ProcessSheetDraft } from './processSheetDraft.model.js';
import { toIngredientProjection } from './processSheetIngredientProjection.js';

const conflict = () => new AppError(
    'Le brouillon a été modifié ou la Fiche technique ne permet plus cette action.',
    409,
);

const assertLineAssignments = ({ phases, unassignedReasons, projection }) => {
    const known = new Set(projection.lines.map(({ lineKey }) => lineKey));
    const assignments = new Set();
    for (const phase of phases) {
        for (const key of phase.ingredientLineKeys) {
            if (!known.has(key)) throw new AppError('Ingrédient non reconnu dans la validation M-004.', 400);
            assignments.add(key);
        }
        for (const step of phase.steps) {
            for (const key of step.ingredientLineKeys) {
                if (!known.has(key)) throw new AppError('Ingrédient non reconnu dans la validation M-004.', 400);
                assignments.add(key);
            }
        }
    }
    for (const { lineKey } of unassignedReasons) {
        if (!known.has(lineKey)) throw new AppError('Justification liée à un ingrédient inconnu.', 400);
        if (assignments.has(lineKey)) {
            throw new AppError('Une justification de non-affectation ne doit pas viser un ingrédient affecté.', 400);
        }
    }
};

const updateProcessSheetDraft = async ({
    workspaceId, dossierId, processSheetId, actorId,
    expectedRevision, phases, unassignedReasons,
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

    const parent = await TechnicalSheet.findOne(mongoose.trusted({
        _id: process.technicalSheet,
        workspace: workspaceId, dossier: dossierId,
        status: TECHNICAL_SHEET_STATUS.ACTIVE,
    })).select('_id').session(session);
    if (!parent) throw conflict();

    // Composition at process creation is immutable. Editing remains possible
    // during later M-004 revisions, but never silently rebinds ingredient IDs.
    const source = await TechnicalSheetValidation.findOne(mongoose.trusted({
        _id: process.sourceValidation,
        technicalSheet: process.technicalSheet,
        workspace: workspaceId,
        dossier: dossierId,
    })).session(session);
    if (!source) throw conflict();
    const projection = toIngredientProjection({ sourceKind: 'VALIDATION', source });
    assertLineAssignments({ phases, unassignedReasons, projection });

    const stored = await ProcessSheetDraft.findOne(mongoose.trusted({
        processSheet: process._id, workspace: workspaceId, dossier: dossierId,
        revision: expectedRevision,
    })).session(session);
    if (!stored) throw conflict();
    const changed = hasProcessContentChanged({
        phases: stored.phases, unassignedReasons: stored.unassignedReasons ?? [],
    }, { phases, unassignedReasons });

    const draft = await ProcessSheetDraft.findOneAndUpdate(mongoose.trusted({
        processSheet: process._id,
        workspace: workspaceId,
        dossier: dossierId,
        revision: expectedRevision,
    }), {
        $set: { phases, unassignedReasons, updatedBy: actorId },
        $inc: { revision: 1 },
    }, { returnDocument: 'after', session, runValidators: true });
    if (!draft) throw conflict();

    const parentWrite = await ProcessSheet.updateOne(mongoose.trusted({
        _id: process._id, workspace: workspaceId, dossier: dossierId,
        status: TECHNICAL_SHEET_STATUS.ACTIVE,
        revision: process.revision,
    }), {
        $inc: { revision: 1 },
        $set: {
            updatedBy: actorId,
            ...(changed && process.editorialState === PROCESS_SHEET_EDITORIAL_STATE.VALIDATED
                ? {
                    editorialState: PROCESS_SHEET_EDITORIAL_STATE.DRAFT,
                    validatedAt: null,
                    validatedBy: null,
                } : {}),
        },
    }, { session });
    if (parentWrite.matchedCount !== 1) throw conflict();
    await createBusinessActivityEvent({
        workspaceId, dossierId, actorId,
        action: BUSINESS_ACTIVITY_ACTION.PROCESS_SHEET_DRAFT_SAVED,
        entityType: BUSINESS_ACTIVITY_ENTITY_TYPE.PROCESS_SHEET,
        entityId: process._id,
        metadata: {
            revision: draft.revision,
            phaseCount: phases.length,
            stepCount: phases.reduce((sum, phase) => sum + phase.steps.length, 0),
        },
    }, { session });

    return {
        id: draft._id.toString(), revision: draft.revision,
        // The aggregate revision also advances on validation, independently
        // of the mutable content revision. Return both concurrency tokens.
        processRevision: process.revision + 1,
        phases: draft.phases, unassignedReasons: draft.unassignedReasons,
    };
});

export { assertLineAssignments, updateProcessSheetDraft };
