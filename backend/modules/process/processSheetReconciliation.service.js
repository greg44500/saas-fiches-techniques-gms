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
import { ProcessSheet, PROCESS_SHEET_EDITORIAL_STATE } from './processSheet.model.js';
import { ProcessSheetDraft } from './processSheetDraft.model.js';
import {
    applyReconciliationMappings, buildReconciliationPlan, processReferenceId,
} from './processSheetReconciliation.js';

const failure = (code, message, statusCode = 409) => {
    const error = new AppError(message, statusCode);
    error.code = code;
    return error;
};
const scope = ({ workspaceId, dossierId, processSheetId }) => mongoose.trusted({
    _id: processSheetId, workspace: workspaceId, dossier: dossierId,
});

const fetchPlan = async ({ workspaceId, dossierId, process, draft, parent, session }) => {
    if (!parent || parent.status !== TECHNICAL_SHEET_STATUS.ACTIVE
        || !parent.currentValidatedState) {
        return { status: 'PARENT_UNAVAILABLE' };
    }
    const parentDraft = await TechnicalSheetDraft.exists(mongoose.trusted({
        workspace: workspaceId, dossier: dossierId, technicalSheet: parent._id,
    })).session(session);
    if (parentDraft) return { status: 'PARENT_REVISION_OPEN' };
    const referenceId = processReferenceId(process).toString();
    const currentId = parent.currentValidatedState.toString();
    if (referenceId === currentId) return { status: 'CURRENT' };
    const previous = await TechnicalSheetValidation.findOne(mongoose.trusted({
        _id: referenceId, technicalSheet: parent._id,
        workspace: workspaceId, dossier: dossierId,
    })).session(session);
    const current = await TechnicalSheetValidation.findOne(mongoose.trusted({
        _id: currentId, technicalSheet: parent._id,
        workspace: workspaceId, dossier: dossierId,
    })).session(session);
    if (!previous || !current) return { status: 'REFERENCE_UNAVAILABLE' };
    const plan = buildReconciliationPlan({ previous, current, draft });
    return {
        status: 'REVIEW_REQUIRED', ...plan,
        currentValidationId: currentId,
        processRevision: process.revision,
        draftRevision: draft.revision,
    };
};

const getProcessSheetReconciliation = async ({
    workspaceId, dossierId, processSheetId,
}) => {
    const process = await ProcessSheet.findOne(scope({
        workspaceId, dossierId, processSheetId,
    })).lean();
    if (!process) throw failure('PROCESS_SHEET_UNAVAILABLE', 'Fiche process indisponible.', 404);
    const [parent, draft] = await Promise.all([
        TechnicalSheet.findOne(mongoose.trusted({
            _id: process.technicalSheet, workspace: workspaceId, dossier: dossierId,
        })).lean(),
        ProcessSheetDraft.findOne(mongoose.trusted({
            processSheet: process._id, workspace: workspaceId, dossier: dossierId,
        })).lean(),
    ]);
    if (!draft) throw failure('PROCESS_SHEET_DRAFT_UNAVAILABLE', 'Contenu de fabrication indisponible.');
    return fetchPlan({ workspaceId, dossierId, process, draft, parent });
};

// The user explicitly accepts the new official M-004 reference and resolves
// every ambiguous association. Only current content is mutated, never M-004.
const reconcileProcessSheet = async ({
    workspaceId, dossierId, processSheetId, actorId,
    expectedRevision, expectedDraftRevision, currentValidationId, decisions,
}) => mongoose.connection.transaction(async (session) => {
    const dossier = await Dossier.findOne(mongoose.trusted({
        _id: dossierId, workspace: workspaceId, status: DOSSIER_STATUS.ACTIVE,
    })).session(session);
    if (!dossier) throw failure('PROCESS_SHEET_DOSSIER_INACTIVE', 'Le dossier doit être actif.');
    const process = await ProcessSheet.findOne(mongoose.trusted({
        ...scope({ workspaceId, dossierId, processSheetId }),
        status: TECHNICAL_SHEET_STATUS.ACTIVE, revision: expectedRevision,
    })).session(session);
    if (!process) throw failure('PROCESS_SHEET_CHANGED',
        'Cette Fiche process a changé. Actualisez les données avant de continuer.');

    // Fence shared with M-004 draft opening and validation; never alter M-004
    // business fields or timestamps, only the internal concurrency counter.
    const parent = await TechnicalSheet.findOneAndUpdate(mongoose.trusted({
        _id: process.technicalSheet, workspace: workspaceId, dossier: dossierId,
        status: TECHNICAL_SHEET_STATUS.ACTIVE,
        currentValidatedState: currentValidationId,
    }), { $inc: { processEligibilityRevision: 1 } }, {
        session, returnDocument: 'after', timestamps: false,
    });
    if (!parent) throw failure('PROCESS_SHEET_PARENT_CHANGED',
        'La Fiche technique a changé. Relancez la comparaison.');
    const draft = await ProcessSheetDraft.findOne(mongoose.trusted({
        processSheet: process._id, workspace: workspaceId, dossier: dossierId,
        revision: expectedDraftRevision,
    })).session(session);
    if (!draft) throw failure('PROCESS_SHEET_CHANGED',
        'Le contenu a changé. Actualisez la Fiche process avant de continuer.');

    const plan = await fetchPlan({ workspaceId, dossierId, process, draft, parent, session });
    if (plan.status === 'PARENT_REVISION_OPEN') {
        throw failure('PROCESS_SHEET_PARENT_REVISION_OPEN',
            'Une modification de la Fiche technique est encore en cours.');
    }
    if (plan.status !== 'REVIEW_REQUIRED'
        || plan.currentValidationId !== currentValidationId) {
        throw failure('PROCESS_SHEET_PARENT_CHANGED',
            'La Fiche technique a changé. Relancez la comparaison.');
    }
    let content;
    try {
        content = applyReconciliationMappings({ draft, plan, decisions });
    } catch (error) {
        if (error.message === 'MAPPING_REQUIRED') {
            throw failure('PROCESS_SHEET_MAPPING_REQUIRED',
                'Vérifiez les associations d’ingrédients avant de continuer.', 400);
        }
        throw failure('PROCESS_SHEET_MAPPING_INVALID',
            'Une correspondance d’ingrédient n’est pas valide. Vérifiez vos choix.', 400);
    }
    const draftUpdated = await ProcessSheetDraft.updateOne(mongoose.trusted({
        _id: draft._id, workspace: workspaceId, dossier: dossierId,
        revision: expectedDraftRevision,
    }), {
        $set: { ...content, updatedBy: actorId },
        $inc: { revision: 1 },
    }, { session, runValidators: true });
    if (draftUpdated.matchedCount !== 1) throw failure('PROCESS_SHEET_CHANGED',
        'Le contenu a changé. Actualisez la Fiche process avant de continuer.');

    const updated = await ProcessSheet.findOneAndUpdate(mongoose.trusted({
        ...scope({ workspaceId, dossierId, processSheetId }),
        revision: expectedRevision, status: TECHNICAL_SHEET_STATUS.ACTIVE,
    }), {
        $set: {
            compositionValidation: parent.currentValidatedState,
            updatedBy: actorId,
            ...(plan.compositionChanged ? {
                editorialState: PROCESS_SHEET_EDITORIAL_STATE.DRAFT,
                validatedAt: null, validatedBy: null,
            } : {}),
        },
        $inc: { revision: 1 },
    }, { session, returnDocument: 'after', runValidators: true });
    if (!updated) throw failure('PROCESS_SHEET_CHANGED',
        'Cette Fiche process a changé. Actualisez-la avant de continuer.');

    await createBusinessActivityEvent({
        workspaceId, dossierId, actorId,
        action: BUSINESS_ACTIVITY_ACTION.PROCESS_SHEET_COMPOSITION_RECONCILED,
        entityType: BUSINESS_ACTIVITY_ENTITY_TYPE.PROCESS_SHEET,
        entityId: process._id,
        metadata: {
            fromValidationId: processReferenceId(process).toString(),
            toValidationId: currentValidationId,
            compositionChanged: plan.compositionChanged,
            reassociatedCount: plan.assignments.length,
            removedCount: decisions.filter(({ to }) => to === null).length,
        },
    }, { session });
    return {
        processRevision: updated.revision,
        draftRevision: expectedDraftRevision + 1,
        editorialState: updated.editorialState,
    };
});

export { getProcessSheetReconciliation, reconcileProcessSheet };
