import mongoose from 'mongoose';

import {
    TECHNICAL_SHEET_TRASH_RETENTION,
} from './technicalSheet.registry.js';
import {
    WorkspaceBusinessSettings,
} from './workspaceBusinessSettings.model.js';

const serializeWorkspaceBusinessSettings = (
    settings,
) => ({
    workspaceId:
        settings?.workspace?.toString() ?? null,
    trashRetentionDays:
        settings?.trashRetentionDays
        ?? TECHNICAL_SHEET_TRASH_RETENTION.DEFAULT_DAYS,
    isDefault: !settings,
    updatedAt:
        settings?.updatedAt ?? null,
});

const getWorkspaceBusinessSettings = async ({
    workspaceId,
    session = null,
}) => {
    let query =
        WorkspaceBusinessSettings.findOne({
            workspace: workspaceId,
        });

    if (session) {
        query = query.session(session);
    }

    const settings = await query;

    return serializeWorkspaceBusinessSettings(
        settings,
    );
};

const getTrashRetentionDays = async ({
    workspaceId,
    session = null,
}) => {
    const settings =
        await getWorkspaceBusinessSettings({
            workspaceId,
            session,
        });

    return settings.trashRetentionDays;
};

const updateTrashRetentionDays = async ({
    workspaceId,
    actorId,
    trashRetentionDays,
}) => mongoose.connection.transaction(
    async (session) => {
        const settings =
            await WorkspaceBusinessSettings
                .findOneAndUpdate(
                    { workspace: workspaceId },
                    {
                        $set: {
                            trashRetentionDays,
                            updatedBy: actorId,
                        },
                        $setOnInsert: {
                            workspace: workspaceId,
                            createdBy: actorId,
                        },
                    },
                    {
                        upsert: true,
                        returnDocument: 'after',
                        runValidators: true,
                        session,
                    },
                );

        return serializeWorkspaceBusinessSettings(
            settings,
        );
    },
);

export {
    getTrashRetentionDays,
    getWorkspaceBusinessSettings,
    serializeWorkspaceBusinessSettings,
    updateTrashRetentionDays,
};
