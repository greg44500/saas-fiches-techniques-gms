import { TechnicalSheet } from '../modules/technicalSheet/technicalSheet.model.js';
import { TechnicalSheetRange } from '../modules/technicalSheet/technicalSheetRange.model.js';

const REQUIRED = Object.freeze([
    'technical_sheet_range_workspace_name_unique',
    'technical_sheet_range_workspace_status_name',
    'technical_sheet_workspace_dossier_range_status',
    'technical_sheet_workspace_range_reference',
]);

const ensureM004RangeIndexes = async () => {
    await TechnicalSheetRange.createIndexes();
    await TechnicalSheet.createIndexes();

    const [rangeIndexes, sheetIndexes] = await Promise.all([
        TechnicalSheetRange.collection.indexes(),
        TechnicalSheet.collection.indexes(),
    ]);
    const existing = new Set([...rangeIndexes, ...sheetIndexes].map(({ name }) => name));
    const missing = REQUIRED.filter((name) => !existing.has(name));
    if (missing.length > 0) {
        throw new Error('Indexes de Gammes M-004 manquants : ' + missing.join(', '));
    }
    return { ensured: REQUIRED, totalExpected: REQUIRED.length };
};

export { ensureM004RangeIndexes };
