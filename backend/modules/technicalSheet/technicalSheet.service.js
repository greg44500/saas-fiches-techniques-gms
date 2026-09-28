import mongoose from 'mongoose';

import {
    BUSINESS_ACTIVITY_ACTION,
} from '../businessActivity/businessActivity.registry.js';
import {
    Dossier,
} from '../dossier/dossier.model.js';
import {
    DOSSIER_STATUS,
} from '../dossier/dossier.registry.js';
import {
    enforcePlanLimit,
} from '../plan/planLimit.service.js';
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
    createTechnicalSheetEvent,
} from './technicalSheetEvent.service.js';
import {
    serializeTechnicalSheet,
    serializeTechnicalSheetDraft,
} from './technicalSheet.serializer.js';

const DEFAULT_LIST_STATUSES = Object.freeze([
    TECHNICAL_SHEET_STATUS.ACTIVE,
    TECHNICAL_SHEET_STATUS.ARCHIVED,
]);

const assertOperationalDossier = async ({
    workspaceId,
    dossierId,
    session,
}) => {
    const dossier = await Dossier.findOne({
        _id: dossierId,
        workspace: workspaceId,
        status: DOSSIER_STATUS.ACTIVE,
    }).session(session);

    if (!dossier) {
        throw new AppError(
            'Le Dossier doit être actif pour cette action.',
            409,
        );
    }

    return dossier;
};

const createTechnicalSheet = async ({
    workspaceId,
    dossierId,
    actorId,
    data,
}) => mongoose.connection.transaction(
    async (session) => {
        const dossier =
            await assertOperationalDossier({
                workspaceId,
                dossierId,
                session,
            });

        await enforcePlanLimit({
            workspaceId,
            metricKey:
                TECHNICAL_SHEET_METRIC.TECHNICAL_SHEETS,
            amount: 1,
            actorId,
            session,
        });

        const [sheet] = await TechnicalSheet.create(
            [{
                workspace: workspaceId,
                dossier: dossierId,
                name: data.name,
                description:
                    data.description ?? null,
                status:
                    TECHNICAL_SHEET_STATUS.ACTIVE,
                statusChangedBy: actorId,
                createdBy: actorId,
                updatedBy: actorId,
            }],
            { session },
        );

        const [draft] =
            await TechnicalSheetDraft.create(
                [{
                    workspace: workspaceId,
                    dossier: dossierId,
                    technicalSheet: sheet._id,
                    targetMarginBasisPoints:
                        dossier.technicalSheetSettings
                            ?.defaultTargetMarginBasisPoints
                        ?? null,
                    createdBy: actorId,
                    updatedBy: actorId,
                }],
                { session },
            );

        await createTechnicalSheetEvent({
            workspaceId,
            dossierId,
            actorId,
            action:
                BUSINESS_ACTIVITY_ACTION
                    .TECHNICAL_SHEET_CREATED,
            technicalSheetId: sheet._id,
            metadata: {
                draftId: draft._id.toString(),
            },
            session,
        });

        return {
            sheet:
                serializeTechnicalSheet(sheet),
            draft:
                serializeTechnicalSheetDraft(draft),
        };
    },
);

const listTechnicalSheets = async ({
    workspaceId,
    dossierId,
    page = 1,
    limit = 20,
    search = null,
    status = null,
}) => {
    const filter = {
        workspace: workspaceId,
        dossier: dossierId,
        status: status ?? mongoose.trusted({
            $in: DEFAULT_LIST_STATUSES,
        }),
    };

    if (search) {
        filter.$or = mongoose.trusted([
            {
                name: new RegExp(
                    search.replace(
                        /[.*+?^$\{\}()|[\]\\]/g,
                        '\\$&',
                    ),
                    'i',
                ),
            },
            {
                description: new RegExp(
                    search.replace(
                        /[.*+?^$\{\}()|[\]\\]/g,
                        '\\$&',
                    ),
                    'i',
                ),
            },
        ]);
    }

    const skip = (page - 1) * limit;

    const [sheets, total] =
        await Promise.all([
            TechnicalSheet.find(filter)
                .sort({ updatedAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit),
            TechnicalSheet.countDocuments(filter),
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

const getTechnicalSheet = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
    includeDeleted = false,
}) => {
    const filter = {
        _id: technicalSheetId,
        workspace: workspaceId,
        dossier: dossierId,
    };

    if (!includeDeleted) {
        filter.status = mongoose.trusted({
            $ne: TECHNICAL_SHEET_STATUS.DELETED,
        });
    }

    const [sheet, draft] =
        await Promise.all([
            TechnicalSheet.findOne(filter),
            TechnicalSheetDraft.findOne({
                technicalSheet: technicalSheetId,
                workspace: workspaceId,
                dossier: dossierId,
            }).populate({
                path: 'lines.productVariant',
                select:
                    '_id name referenceUnit yieldPercent status',
            }),
        ]);

    if (!sheet) {
        throw new AppError(
            'Fiche technique introuvable.',
            404,
        );
    }

    return {
        sheet:
            serializeTechnicalSheet(sheet),
        draft:
            draft
                ? serializeTechnicalSheetDraft(
                    draft,
                )
                : null,
    };
};

const updateTechnicalSheet = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
    actorId,
    expectedRevision,
    data,
}) => mongoose.connection.transaction(
    async (session) => {
        await assertOperationalDossier({
            workspaceId,
            dossierId,
            session,
        });

        const set = {
            updatedBy: actorId,
        };

        if (Object.hasOwn(data, 'name')) {
            set.name = data.name;
        }

        if (Object.hasOwn(data, 'description')) {
            set.description = data.description;
        }

        const sheet =
            await TechnicalSheet.findOneAndUpdate(
                {
                    _id: technicalSheetId,
                    workspace: workspaceId,
                    dossier: dossierId,
                    status:
                        TECHNICAL_SHEET_STATUS.ACTIVE,
                    revision: expectedRevision,
                },
                {
                    $set: set,
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
                'Conflit de modification de la Fiche technique.',
                409,
            );
        }

        await createTechnicalSheetEvent({
            workspaceId,
            dossierId,
            actorId,
            action:
                BUSINESS_ACTIVITY_ACTION
                    .TECHNICAL_SHEET_UPDATED,
            technicalSheetId: sheet._id,
            metadata: {
                expectedRevision,
            },
            session,
        });

        return serializeTechnicalSheet(sheet);
    },
);

export {
    assertOperationalDossier,
    createTechnicalSheet,
    getTechnicalSheet,
    listTechnicalSheets,
    updateTechnicalSheet,
};
