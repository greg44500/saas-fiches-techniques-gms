import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import {
    BUSINESS_ACTIVITY_ACTION,
    BUSINESS_ACTIVITY_ENTITY_TYPE,
} from '../businessActivity/businessActivity.registry.js';
import { createBusinessActivityEvent } from '../businessActivity/businessActivity.service.js';
import { Dossier } from '../dossier/dossier.model.js';
import { DOSSIER_STATUS } from '../dossier/dossier.registry.js';
import { TechnicalSheet } from '../technicalSheet/technicalSheet.model.js';
import { TechnicalSheetDraft } from '../technicalSheet/technicalSheetDraft.model.js';
import { TechnicalSheetValidation } from '../technicalSheet/technicalSheetValidation.model.js';
import { TECHNICAL_SHEET_STATUS } from '../technicalSheet/technicalSheet.registry.js';
import { ProcessSheet } from './processSheet.model.js';
import { ProcessSheetDraft } from './processSheetDraft.model.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const serializeProcess = (process) => ({
    id: process._id.toString(),
    workspaceId: process.workspace.toString(),
    dossierId: process.dossier.toString(),
    technicalSheetId: (process.technicalSheet?._id ?? process.technicalSheet).toString(),
    technicalSheetName: process.technicalSheet?.name ?? null,
    title: process.title,
    status: process.status,
    editorialState: process.currentValidatedState ? 'VALIDATED' : 'DRAFT',
    revision: process.revision,
    sourceValidationId: process.sourceValidation.toString(),
    createdAt: process.createdAt,
    updatedAt: process.updatedAt,
});

const scoped = ({ workspaceId, dossierId }) => mongoose.trusted({
    workspace: workspaceId, dossier: dossierId,
});

const listProcessSheets = async ({
    workspaceId, dossierId, page = 1, limit = 20, status, search,
}) => {
    const filter = scoped({ workspaceId, dossierId });
    filter.status = status ?? mongoose.trusted({
        $in: [TECHNICAL_SHEET_STATUS.ACTIVE, TECHNICAL_SHEET_STATUS.ARCHIVED],
    });
    if (search) filter.title = new RegExp(escapeRegex(search), 'i');
    const [processes, total] = await Promise.all([
        ProcessSheet.find(filter).sort({ updatedAt: -1, _id: -1 })
            .skip((page - 1) * limit).limit(limit)
            .populate({ path: 'technicalSheet', select: '_id name' }),
        ProcessSheet.countDocuments(filter),
    ]);
    return {
        processes: processes.map(serializeProcess),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};

const getProcessSheet = async ({
    workspaceId, dossierId, processSheetId,
}) => {
    const process = await ProcessSheet.findOne(mongoose.trusted({
        ...scoped({ workspaceId, dossierId }),
        _id: processSheetId,
        status: mongoose.trusted({ $ne: TECHNICAL_SHEET_STATUS.DELETED }),
    })).populate({ path: 'technicalSheet', select: '_id name' });
    if (!process) throw new AppError('Fiche process introuvable.', 404);

    const draft = await ProcessSheetDraft.findOne(mongoose.trusted({
        processSheet: process._id, workspace: workspaceId, dossier: dossierId,
    })).lean();
    return {
        process: serializeProcess(process),
        draft: draft ? {
            id: draft._id.toString(),
            revision: draft.revision,
            phases: draft.phases,
        } : null,
    };
};

/**
 * Eligible technical sheets are ACTIVE, validated, without M-004 draft and
 * without an associated process (even if the process was archived/deleted).
 * Aggregation applies the filters BEFORE pagination, not in React.
 */
const listEligibleTechnicalSheets = async ({
    workspaceId, dossierId, page = 1, limit = 20, search,
}) => {
    const filter = {
        workspace: new mongoose.Types.ObjectId(workspaceId.toString()),
        dossier: new mongoose.Types.ObjectId(dossierId.toString()),
        status: TECHNICAL_SHEET_STATUS.ACTIVE,
        currentValidatedState: { $type: 'objectId' },
    };
    if (search) filter.name = new RegExp(escapeRegex(search), 'i');

    const pipeline = [
        { $match: filter },
        { $lookup: {
            from: TechnicalSheetDraft.collection.name,
            localField: '_id', foreignField: 'technicalSheet',
            as: 'openDrafts',
        } },
        { $lookup: {
            from: ProcessSheet.collection.name,
            localField: '_id', foreignField: 'technicalSheet',
            as: 'associatedProcesses',
        } },
        { $match: { openDrafts: { $size: 0 }, associatedProcesses: { $size: 0 } } },
        { $sort: { name: 1, _id: 1 } },
        { $facet: {
            items: [{ $skip: (page - 1) * limit }, { $limit: limit },
                { $project: { _id: 1, name: 1, revision: 1 } }],
            total: [{ $count: 'count' }],
        } },
    ];
    const [data] = await TechnicalSheet.aggregate(pipeline);
    const total = data.total[0]?.count ?? 0;
    return {
        technicalSheets: data.items.map((item) => ({
            id: item._id.toString(),
            name: item.name,
            revision: item.revision,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};

const creationConflict = () => {
    const error = new AppError(
        'La Fiche technique doit être active, validée, sans brouillon et sans Fiche process associée.',
        409,
    );
    error.code = 'PROCESS_SHEET_TECHNICAL_SHEET_INELIGIBLE';
    return error;
};

const createProcessSheet = async ({
    workspaceId, dossierId, actorId, title, technicalSheetId,
}) => {
    try {
        return await mongoose.connection.transaction(async (session) => {
            const dossier = await Dossier.findOne(mongoose.trusted({
                _id: dossierId, workspace: workspaceId, status: DOSSIER_STATUS.ACTIVE,
            })).session(session);
            if (!dossier) throw new AppError('Le Dossier doit être actif.', 409);

            // A real M-004 parent write serializes this check with M-004
            // startDraft (which uses the same processEligibilityRevision lock).
            const sheet = await TechnicalSheet.findOneAndUpdate(mongoose.trusted({
                _id: technicalSheetId,
                workspace: workspaceId,
                dossier: dossierId,
                status: TECHNICAL_SHEET_STATUS.ACTIVE,
                currentValidatedState: mongoose.trusted({ $type: 'objectId' }),
            }), {
                $inc: { processEligibilityRevision: 1 },
            }, { session, returnDocument: 'after', timestamps: false });
            if (!sheet) throw creationConflict();

            const [draft, existingProcess, validation] = await Promise.all([
                TechnicalSheetDraft.exists(mongoose.trusted({
                    technicalSheet: sheet._id, workspace: workspaceId, dossier: dossierId,
                })).session(session),
                ProcessSheet.exists(mongoose.trusted({
                    technicalSheet: sheet._id, workspace: workspaceId, dossier: dossierId,
                })).session(session),
                TechnicalSheetValidation.findOne(mongoose.trusted({
                    _id: sheet.currentValidatedState,
                    technicalSheet: sheet._id,
                    workspace: workspaceId,
                    dossier: dossierId,
                })).select('_id').session(session),
            ]);
            if (draft || existingProcess || !validation) throw creationConflict();

            const [process] = await ProcessSheet.create([{
                workspace: workspaceId, dossier: dossierId,
                technicalSheet: sheet._id,
                title,
                status: TECHNICAL_SHEET_STATUS.ACTIVE,
                sourceValidation: validation._id,
                createdBy: actorId, updatedBy: actorId,
            }], { session });
            await ProcessSheetDraft.create([{
                workspace: workspaceId, dossier: dossierId,
                processSheet: process._id,
                sourceValidation: validation._id,
                phases: [],
                createdBy: actorId, updatedBy: actorId,
            }], { session });
            await createBusinessActivityEvent({
                workspaceId, dossierId, actorId,
                action: BUSINESS_ACTIVITY_ACTION.PROCESS_SHEET_CREATED,
                entityType: BUSINESS_ACTIVITY_ENTITY_TYPE.PROCESS_SHEET,
                entityId: process._id,
                metadata: { technicalSheetId: sheet._id.toString() },
            }, { session });

            return serializeProcess(process);
        });
    } catch (error) {
        if (error?.code === 11000 || error?.code === 112
            || error?.hasErrorLabel?.('TransientTransactionError')) {
            throw creationConflict();
        }
        throw error;
    }
};

export {
    createProcessSheet,
    getProcessSheet,
    listEligibleTechnicalSheets,
    listProcessSheets,
    serializeProcess,
};
