import {
    WorkspaceBusinessSettings,
} from '../modules/technicalSheet/workspaceBusinessSettings.model.js';

const M004_WORKSPACE_BUSINESS_SETTINGS_INDEX =
    'workspace_business_settings_unique';

const ensureM004WorkspaceBusinessSettings = async () => {
    await WorkspaceBusinessSettings.createIndexes();

    const indexes =
        await WorkspaceBusinessSettings
            .collection.indexes();

    const ensured = indexes.some(
        ({ name }) =>
            name
            === M004_WORKSPACE_BUSINESS_SETTINGS_INDEX,
    );

    if (!ensured) {
        throw new Error(
            'Index unique WorkspaceBusinessSettings M-004 manquant.',
        );
    }

    return {
        index:
            M004_WORKSPACE_BUSINESS_SETTINGS_INDEX,
        createdSettings: 0,
        defaultTrashRetentionDays:
            30,
    };
};

export {
    M004_WORKSPACE_BUSINESS_SETTINGS_INDEX,
    ensureM004WorkspaceBusinessSettings,
};
