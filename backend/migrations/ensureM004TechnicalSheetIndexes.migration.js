import {
    TechnicalSheet,
} from '../modules/technicalSheet/technicalSheet.model.js';
import {
    TechnicalSheetDraft,
} from '../modules/technicalSheet/technicalSheetDraft.model.js';
import {
    TechnicalSheetValidation,
} from '../modules/technicalSheet/technicalSheetValidation.model.js';

const M004_TECHNICAL_SHEET_INDEX_NAMES = Object.freeze([
    'technical_sheet_workspace_dossier_status_updated_at',
    'technical_sheet_workspace_status_updated_at',
    'technical_sheet_workspace_dossier_name',
    'technical_sheet_purge_schedule',
    'technical_sheet_draft_unique',
    'technical_sheet_draft_workspace_dossier_updated_at',
    'technical_sheet_validation_history',
    'technical_sheet_validation_workspace_dossier',
]);

const M004_TECHNICAL_SHEET_MODELS = Object.freeze([
    TechnicalSheet,
    TechnicalSheetDraft,
    TechnicalSheetValidation,
]);

const ensureM004TechnicalSheetIndexes = async () => {
    for (const model of M004_TECHNICAL_SHEET_MODELS) {
        await model.createIndexes();
    }

    const indexes = await Promise.all(
        M004_TECHNICAL_SHEET_MODELS.map(
            async (model) => ({
                model: model.modelName,
                indexes:
                    await model.collection.indexes(),
            }),
        ),
    );

    const ensured = indexes.flatMap(
        ({ model, indexes: modelIndexes }) =>
            modelIndexes
                .map(({ name }) => name)
                .filter((name) =>
                    M004_TECHNICAL_SHEET_INDEX_NAMES
                        .includes(name),
                )
                .map((name) => ({
                    model,
                    name,
                })),
    );

    const ensuredNames = new Set(
        ensured.map(({ name }) => name),
    );
    const missing =
        M004_TECHNICAL_SHEET_INDEX_NAMES.filter(
            (name) =>
                !ensuredNames.has(name),
        );

    if (missing.length > 0) {
        throw new Error(
            'Indexes M-004 Fiches techniques manquants : '
            + missing.join(', '),
        );
    }

    return {
        ensured,
        ensuredCount: ensured.length,
        totalExpected:
            M004_TECHNICAL_SHEET_INDEX_NAMES.length,
    };
};

export {
    M004_TECHNICAL_SHEET_INDEX_NAMES,
    ensureM004TechnicalSheetIndexes,
};
