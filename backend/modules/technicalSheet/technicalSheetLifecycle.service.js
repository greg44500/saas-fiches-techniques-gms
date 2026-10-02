import mongoose from 'mongoose';

import {
    BUSINESS_ACTIVITY_ACTION,
} from '../businessActivity/businessActivity.registry.js';
import {
    releaseCurrentUsageMetric,
} from '../usageMetric/releaseUsageMetric.service.js';
import { AppError } from '../../utils/appError.js';
import {
    TECHNICAL_SHEET_METRIC,
    TECHNICAL_SHEET_STATUS,
} from './technicalSheet.registry.js';
import {
    TechnicalSheet,
} from './technicalSheet.model.js';
import {
    TechnicalSheetDraft,
} from './technicalSheetDraft.model.js';
import {
    TechnicalSheetValidation,
} from './technicalSheetValidation.model.js';
import {
    createTechnicalSheetEvent,
} from './technicalSheetEvent.service.js';
import {
    serializeTechnicalSheet,
} from './technicalSheet.serializer.js';
import {
    getTrashRetentionDays,
} from './workspaceBusinessSettings.service.js';

const addDays = (date, days) =>
    new Date(
        date.getTime()
        + days * 24 * 60 * 60 * 1000,
    );

const transitionTechnicalSheet = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
    actorId,
    expectedRevision,
    fromStatus,
    toStatus,
    action,
}) => mongoose.connection.transaction(
    async (session) => {
        const sheet =
            await TechnicalSheet.findOneAndUpdate(
                mongoose.trusted({
                    _id: technicalSheetId,
                    workspace: workspaceId,
                    dossier: dossierId,
                    status: fromStatus,
                    revision: expectedRevision,
                }),
                {
                    $set: {
                        status: toStatus,
                        statusChangedAt:
                            new Date(),
                        statusChangedBy:
                            actorId,
                        updatedBy: actorId,
                    },
                    $inc: { revision: 1 },
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                    session,
                },
            );

        if (!sheet) {
            throw new AppError(
                'Conflit de cycle de vie de la Fiche technique.',
                409,
            );
        }

        await createTechnicalSheetEvent({
            workspaceId,
            dossierId,
            actorId,
            action,
            technicalSheetId:
                sheet._id,
            metadata: {
                fromStatus,
                toStatus,
            },
            session,
        });

        return serializeTechnicalSheet(sheet);
    },
);

const archiveTechnicalSheet = (params) =>
    transitionTechnicalSheet({
        ...params,
        fromStatus:
            TECHNICAL_SHEET_STATUS.ACTIVE,
        toStatus:
            TECHNICAL_SHEET_STATUS.ARCHIVED,
        action:
            BUSINESS_ACTIVITY_ACTION
                .TECHNICAL_SHEET_ARCHIVED,
    });

const reactivateTechnicalSheet = (params) =>
    transitionTechnicalSheet({
        ...params,
        fromStatus:
            TECHNICAL_SHEET_STATUS.ARCHIVED,
        toStatus:
            TECHNICAL_SHEET_STATUS.ACTIVE,
        action:
            BUSINESS_ACTIVITY_ACTION
                .TECHNICAL_SHEET_REACTIVATED,
    });

const deleteTechnicalSheet = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
    actorId,
    expectedRevision,
    now = new Date(),
}) => mongoose.connection.transaction(
    async (session) => {
        const retentionDays =
            await getTrashRetentionDays({
                workspaceId,
                session,
            });

        const sheet =
            await TechnicalSheet.findOne(
                mongoose.trusted({
                    _id: technicalSheetId,
                    workspace: workspaceId,
                    dossier: dossierId,
                    status: mongoose.trusted({
                        $in: [
                            TECHNICAL_SHEET_STATUS.ACTIVE,
                            TECHNICAL_SHEET_STATUS.ARCHIVED,
                        ],
                    }),
                    revision: expectedRevision,
                }),
            ).session(session);

        if (!sheet) {
            throw new AppError(
                'Conflit de suppression de la Fiche technique.',
                409,
            );
        }

        const previousStatus =
            sheet.status;

        sheet.preDeleteStatus =
            previousStatus;
        sheet.status =
            TECHNICAL_SHEET_STATUS.DELETED;
        sheet.statusChangedAt = now;
        sheet.statusChangedBy = actorId;
        sheet.deletedAt = now;
        sheet.deletedBy = actorId;
        sheet.purgeScheduledAt =
            addDays(now, retentionDays);
        sheet.updatedBy = actorId;
        sheet.revision += 1;

        await sheet.save({ session });

        await createTechnicalSheetEvent({
            workspaceId,
            dossierId,
            actorId,
            action:
                BUSINESS_ACTIVITY_ACTION
                    .TECHNICAL_SHEET_DELETED,
            technicalSheetId:
                sheet._id,
            metadata: {
                previousStatus,
                retentionDays,
                purgeScheduledAt:
                    sheet.purgeScheduledAt
                        .toISOString(),
            },
            session,
        });

        return serializeTechnicalSheet(sheet);
    },
);

const restoreTechnicalSheet = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
    actorId,
    expectedRevision,
    now = new Date(),
}) => mongoose.connection.transaction(
    async (session) => {
        const sheet =
            await TechnicalSheet.findOne(
                mongoose.trusted({
                    _id: technicalSheetId,
                    workspace: workspaceId,
                    dossier: dossierId,
                    status:
                        TECHNICAL_SHEET_STATUS.DELETED,
                    purgeScheduledAt:
                        mongoose.trusted({
                            $gt: now,
                        }),
                    revision: expectedRevision,
                }),
            ).session(session);

        if (!sheet) {
            throw new AppError(
                'La Fiche technique n’est plus restaurable ou son état a changé.',
                409,
            );
        }

        const restoredStatus =
            sheet.preDeleteStatus
            === TECHNICAL_SHEET_STATUS.ARCHIVED
                ? TECHNICAL_SHEET_STATUS.ARCHIVED
                : TECHNICAL_SHEET_STATUS.ACTIVE;

        sheet.status = restoredStatus;
        sheet.statusChangedAt = new Date();
        sheet.statusChangedBy = actorId;
        sheet.preDeleteStatus = null;
        sheet.deletedAt = null;
        sheet.deletedBy = null;
        sheet.purgeScheduledAt = null;
        sheet.updatedBy = actorId;
        sheet.revision += 1;

        await sheet.save({ session });

        await createTechnicalSheetEvent({
            workspaceId,
            dossierId,
            actorId,
            action:
                BUSINESS_ACTIVITY_ACTION
                    .TECHNICAL_SHEET_RESTORED,
            technicalSheetId:
                sheet._id,
            metadata: {
                restoredStatus,
            },
            session,
        });

        return serializeTechnicalSheet(sheet);
    },
);

const purgeTechnicalSheet = async ({
    workspaceId,
    technicalSheetId,
    actorId = null,
    expectedRevision = null,
    requireExpired = false,
    now = new Date(),
}) => mongoose.connection.transaction(
    async (session) => {
        const filter = mongoose.trusted({
            _id: technicalSheetId,
            workspace: workspaceId,
            status:
                TECHNICAL_SHEET_STATUS.DELETED,
        });

        if (expectedRevision !== null) {
            filter.revision =
                expectedRevision;
        }

        if (requireExpired) {
            filter.purgeScheduledAt =
                mongoose.trusted({
                    $lte: now,
                });
        }

        const sheet =
            await TechnicalSheet.findOne(
                filter,
            ).session(session);

        if (!sheet) {
            return {
                purged: false,
                technicalSheetId:
                    technicalSheetId.toString(),
            };
        }

        await createTechnicalSheetEvent({
            workspaceId,
            dossierId:
                sheet.dossier,
            actorId,
            action:
                BUSINESS_ACTIVITY_ACTION
                    .TECHNICAL_SHEET_PURGED,
            technicalSheetId:
                sheet._id,
            metadata: {
                automatic:
                    requireExpired,
            },
            session,
        });

        await Promise.all([
            TechnicalSheetDraft.deleteMany(
                mongoose.trusted({
                    technicalSheet:
                        sheet._id,
                    workspace: workspaceId,
                }),
                { session },
            ),
            TechnicalSheetValidation
                .deleteMany(
                    mongoose.trusted({
                        technicalSheet:
                            sheet._id,
                        workspace: workspaceId,
                    }),
                    { session },
                ),
        ]);

        const deletion =
            await TechnicalSheet.deleteOne(
                mongoose.trusted({
                    _id: sheet._id,
                    workspace: workspaceId,
                    status:
                        TECHNICAL_SHEET_STATUS.DELETED,
                }),
                { session },
            );

        if (deletion.deletedCount !== 1) {
            throw new AppError(
                'Conflit pendant la suppression définitive de la Fiche technique.',
                409,
            );
        }

        await releaseCurrentUsageMetric({
            workspaceId,
            metricKey:
                TECHNICAL_SHEET_METRIC.TECHNICAL_SHEETS,
            amount: 1,
            actorId,
            session,
        });

        return {
            purged: true,
            technicalSheetId:
                sheet._id.toString(),
        };
    },
);

const listTechnicalSheetTrash = async ({
    workspaceId,
    page = 1,
    limit = 20,
}) => {
    const filter = mongoose.trusted({
        workspace: workspaceId,
        status:
            TECHNICAL_SHEET_STATUS.DELETED,
    });
    const skip = (page - 1) * limit;

    const [sheets, total] =
        await Promise.all([
            TechnicalSheet.find(filter)
                .sort({
                    deletedAt: -1,
                    _id: -1,
                })
                .skip(skip)
                .limit(limit),
            TechnicalSheet.countDocuments(
                filter,
            ),
        ]);

    return {
        sheets:
            sheets.map(serializeTechnicalSheet),
        pagination: {
            page,
            limit,
            total,
            totalPages:
                Math.ceil(total / limit),
        },
    };
};

const purgeExpiredTechnicalSheets = async ({
    workspaceId = null,
    actorId = null,
    now = new Date(),
    batchSize = 100,
}) => {
    const filter = mongoose.trusted({
        status:
            TECHNICAL_SHEET_STATUS.DELETED,
        purgeScheduledAt:
            mongoose.trusted({
                $lte: now,
            }),
    });

    if (workspaceId) {
        filter.workspace = workspaceId;
    }

    const candidates =
        await TechnicalSheet.find(filter)
            .select('_id workspace')
            .sort({
                purgeScheduledAt: 1,
                _id: 1,
            })
            .limit(batchSize)
            .lean();

    const results = [];

    for (const candidate of candidates) {
        results.push(
            await purgeTechnicalSheet({
                workspaceId:
                    candidate.workspace,
                technicalSheetId:
                    candidate._id,
                actorId,
                requireExpired: true,
                now,
            }),
        );
    }

    return {
        scanned: candidates.length,
        purged:
            results.filter(
                (result) => result.purged,
            ).length,
    };
};

export {
    archiveTechnicalSheet,
    deleteTechnicalSheet,
    listTechnicalSheetTrash,
    purgeExpiredTechnicalSheets,
    purgeTechnicalSheet,
    reactivateTechnicalSheet,
    restoreTechnicalSheet,
};
