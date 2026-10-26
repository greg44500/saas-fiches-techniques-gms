import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import {
    BUSINESS_ACTIVITY_ACTION,
    BUSINESS_ACTIVITY_ENTITY_TYPE,
} from '../businessActivity/businessActivity.registry.js';
import { createBusinessActivityEvent } from '../businessActivity/businessActivity.service.js';
import { Dossier } from '../dossier/dossier.model.js';
import { DOSSIER_STATUS } from '../dossier/dossier.registry.js';
import { TechnicalSheet } from './technicalSheet.model.js';
import { TECHNICAL_SHEET_STATUS } from './technicalSheet.registry.js';
import { createTechnicalSheetEvent } from './technicalSheetEvent.service.js';
import { serializeTechnicalSheet } from './technicalSheet.serializer.js';
import { TechnicalSheetRange } from './technicalSheetRange.model.js';
import { normalizeRangeName } from './technicalSheetRangeName.js';
import { assertRangeNameReviewed } from './technicalSheetRangeSuggestions.service.js';

const serializeRange = (range) => ({
    id: range._id.toString(),
    workspaceId: range.workspace.toString(),
    name: range.name,
    status: range.status,
    revision: range.revision,
    createdAt: range.createdAt,
    updatedAt: range.updatedAt,
});

const conflict = (message) => new AppError(message, 409);

const handleDuplicateName = async (operation) => {
    try {
        return await operation();
    } catch (error) {
        if (error?.code === 11000) {
            throw conflict('Une Gamme portant ce nom existe déjà dans le Workspace.');
        }
        throw error;
    }
};

const auditRange = ({ workspaceId, actorId, action, range, metadata = {}, session }) =>
    createBusinessActivityEvent({
        workspaceId,
        actorId,
        action,
        entityType: BUSINESS_ACTIVITY_ENTITY_TYPE.TECHNICAL_SHEET_RANGE,
        entityId: range._id,
        metadata: { name: range.name, ...metadata },
    }, { session });

const listRanges = async ({ workspaceId, page = 1, limit = 50, status, search }) => {
    const filter = mongoose.trusted({ workspace: workspaceId });
    if (status) filter.status = status;
    if (search) {
        const escaped = Array.from(search).map((char) =>
            '^$.*+?()[]{}|\\'.includes(char) ? '\\' + char : char,
        ).join('');
        filter.normalizedName = new RegExp(normalizeRangeName(escaped), 'i');
    }
    const [ranges, total] = await Promise.all([
        TechnicalSheetRange.find(filter)
            .sort({ name: 1, _id: 1 })
            .skip((page - 1) * limit)
            .limit(limit),
        TechnicalSheetRange.countDocuments(filter),
    ]);
    return {
        ranges: ranges.map(serializeRange),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};

const listRangeOptions = async ({ workspaceId, includeArchived = false }) => {
    const filter = mongoose.trusted({
        workspace: workspaceId,
        ...(!includeArchived ? { status: 'ACTIVE' } : {}),
    });
    const ranges = await TechnicalSheetRange.find(filter)
        .select('_id name status').sort({ name: 1, _id: 1 }).lean();
    return ranges.map((range) => ({
        id: range._id.toString(),
        name: range.name,
        status: range.status,
    }));
};

const createRange = ({ workspaceId, actorId, name, reviewedCandidateIds = [] }) =>
    handleDuplicateName(() => mongoose.connection.transaction(async (session) => {
        await assertRangeNameReviewed({
            workspaceId, name, reviewedCandidateIds, session,
        });
        const [range] = await TechnicalSheetRange.create([{
            workspace: workspaceId,
            name: name.trim().replace(/\s+/g, ' '),
            normalizedName: normalizeRangeName(name),
            createdBy: actorId,
            updatedBy: actorId,
            statusChangedBy: actorId,
        }], { session });
        await auditRange({
            workspaceId, actorId, range, session,
            action: BUSINESS_ACTIVITY_ACTION.TECHNICAL_SHEET_RANGE_CREATED,
        });
        return serializeRange(range);
    }));

const renameRange = ({ workspaceId, rangeId, actorId, name, expectedRevision, reviewedCandidateIds = [] }) =>
    handleDuplicateName(() => mongoose.connection.transaction(async (session) => {
        const range = await TechnicalSheetRange.findOne(
            mongoose.trusted({
                _id: rangeId, workspace: workspaceId, status: 'ACTIVE', revision: expectedRevision,
            }),
        ).session(session);
        if (!range) throw conflict('Gamme indisponible ou modifiée entre-temps.');
        await assertRangeNameReviewed({
            workspaceId, name, excludeRangeId: rangeId, reviewedCandidateIds, session,
        });
        const previousName = range.name;
        range.name = name.trim().replace(/\s+/g, ' ');
        range.normalizedName = normalizeRangeName(name);
        range.updatedBy = actorId;
        range.revision += 1;
        await range.save({ session });
        await auditRange({
            workspaceId, actorId, range, session,
            action: BUSINESS_ACTIVITY_ACTION.TECHNICAL_SHEET_RANGE_RENAMED,
            metadata: { previousName, nextName: range.name },
        });
        return serializeRange(range);
    }));

const transitionRange = ({ workspaceId, rangeId, actorId, expectedRevision, from, to, action }) =>
    mongoose.connection.transaction(async (session) => {
        const range = await TechnicalSheetRange.findOneAndUpdate(
            mongoose.trusted({
                _id: rangeId, workspace: workspaceId, revision: expectedRevision, status: from,
            }),
            {
                $set: { status: to, statusChangedBy: actorId, updatedBy: actorId },
                $inc: { revision: 1 },
            },
            { session, returnDocument: 'after', runValidators: true },
        );
        if (!range) throw conflict('Gamme indisponible ou modifiée entre-temps.');
        await auditRange({ workspaceId, actorId, action, range, session });
        return serializeRange(range);
    });

const archiveRange = (params) => transitionRange({
    ...params, from: 'ACTIVE', to: 'ARCHIVED',
    action: BUSINESS_ACTIVITY_ACTION.TECHNICAL_SHEET_RANGE_ARCHIVED,
});
const reactivateRange = (params) => transitionRange({
    ...params, from: 'ARCHIVED', to: 'ACTIVE',
    action: BUSINESS_ACTIVITY_ACTION.TECHNICAL_SHEET_RANGE_REACTIVATED,
});

const deleteRange = ({ workspaceId, rangeId, actorId, expectedRevision }) =>
    mongoose.connection.transaction(async (session) => {
        // Delete first, so the write conflicts with a concurrent assignment
        // that necessarily touches this same range document.
        const range = await TechnicalSheetRange.findOneAndDelete(
            mongoose.trusted({
                _id: rangeId, workspace: workspaceId, revision: expectedRevision,
            }),
            { session },
        );
        if (!range) throw conflict('Gamme introuvable ou modifiée entre-temps.');
        const linked = await TechnicalSheet.countDocuments(
            mongoose.trusted({ workspace: workspaceId, range: rangeId }),
        ).session(session);
        if (linked > 0) {
            throw conflict('Cette Gamme est encore associée à des Fiches techniques.');
        }
        await auditRange({
            workspaceId, actorId, range, session,
            action: BUSINESS_ACTIVITY_ACTION.TECHNICAL_SHEET_RANGE_DELETED,
        });
        return { deletedRangeId: range._id.toString() };
    });

// Must be executed in every transaction creating a range reference, including
// creation and copy. This shared write prevents deletion/archiving races.
const lockActiveRangeForAssignment = async ({ workspaceId, rangeId, session }) => {
    if (!rangeId) return null;
    const range = await TechnicalSheetRange.findOneAndUpdate(
        mongoose.trusted({ _id: rangeId, workspace: workspaceId, status: 'ACTIVE' }),
        { $inc: { assignmentVersion: 1 } },
        { session, returnDocument: 'after', timestamps: false },
    );
    if (!range) throw conflict('La Gamme sélectionnée est introuvable ou archivée.');
    return range;
};

const assignTechnicalSheetRange = ({
    workspaceId, dossierId, technicalSheetId, actorId, expectedRevision, rangeId,
}) => mongoose.connection.transaction(async (session) => {
    const dossier = await Dossier.findOne(
        mongoose.trusted({
            _id: dossierId, workspace: workspaceId, status: DOSSIER_STATUS.ACTIVE,
        }),
    ).session(session);
    if (!dossier) throw conflict('Le Dossier doit être actif.');
    const sheet = await TechnicalSheet.findOne(
        mongoose.trusted({
            _id: technicalSheetId, workspace: workspaceId, dossier: dossierId,
            status: TECHNICAL_SHEET_STATUS.ACTIVE, revision: expectedRevision,
        }),
    ).session(session);
    if (!sheet) throw conflict('La Fiche est indisponible ou a été modifiée.');
    const previousRangeId = sheet.range?.toString() ?? null;
    if (previousRangeId === (rangeId ?? null)) return serializeTechnicalSheet(sheet);
    await lockActiveRangeForAssignment({ workspaceId, rangeId, session });
    const updated = await TechnicalSheet.findOneAndUpdate(
        mongoose.trusted({
            _id: technicalSheetId, workspace: workspaceId, dossier: dossierId,
            status: TECHNICAL_SHEET_STATUS.ACTIVE, revision: expectedRevision,
        }),
        { $set: { range: rangeId ?? null, updatedBy: actorId }, $inc: { revision: 1 } },
        { session, returnDocument: 'after', runValidators: true },
    );
    if (!updated) throw conflict('La Fiche a été modifiée entre-temps.');
    await createTechnicalSheetEvent({
        workspaceId, dossierId, actorId, technicalSheetId: updated._id, session,
        action: BUSINESS_ACTIVITY_ACTION.TECHNICAL_SHEET_RANGE_CHANGED,
        metadata: { previousRangeId, nextRangeId: rangeId ?? null },
    });
    return serializeTechnicalSheet(updated);
});

export {
    archiveRange,
    assignTechnicalSheetRange,
    createRange,
    deleteRange,
    listRanges,
    listRangeOptions,
    lockActiveRangeForAssignment,
    normalizeRangeName,
    reactivateRange,
    renameRange,
    serializeRange,
};
