import { ProcessSheet } from '../modules/process/processSheet.model.js';
import { ProcessSheetDraft } from '../modules/process/processSheetDraft.model.js';

const EXPECTED = Object.freeze({
    process: ['process_sheet_technical_sheet_unique', 'process_sheet_scope_status_updated'],
    draft: ['process_sheet_draft_unique', 'process_sheet_draft_scope_updated'],
});

const ensureM006ProcessSheetIndexes = async () => {
    await ProcessSheet.createIndexes();
    await ProcessSheetDraft.createIndexes();
    const [process, draft] = await Promise.all([
        ProcessSheet.collection.indexes(),
        ProcessSheetDraft.collection.indexes(),
    ]);
    const found = {
        process: new Set(process.map(({ name }) => name)),
        draft: new Set(draft.map(({ name }) => name)),
    };
    for (const key of Object.keys(EXPECTED)) {
        const missing = EXPECTED[key].filter((name) => !found[key].has(name));
        if (missing.length) throw new Error('Indexes M-006 manquants : ' + missing.join(', '));
    }
    return { ensured: [...EXPECTED.process, ...EXPECTED.draft] };
};

export { ensureM006ProcessSheetIndexes };
