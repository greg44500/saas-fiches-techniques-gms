import {
    ProcessLibraryRevision,
    ProcessLibraryTemplate,
} from '../modules/process/processLibrary.model.js';

const REQUIRED_TEMPLATE = Object.freeze([
    'process_library_scope_kind_name_unique',
    'process_library_scope_kind_status_updated',
]);
const REQUIRED_REVISION = Object.freeze([
    'process_library_revision_unique',
    'process_library_revision_scope_history',
]);

const ensureM006ProcessLibraryIndexes = async () => {
    await ProcessLibraryTemplate.createIndexes();
    await ProcessLibraryRevision.createIndexes();
    const [templates, revisions] = await Promise.all([
        ProcessLibraryTemplate.collection.indexes(),
        ProcessLibraryRevision.collection.indexes(),
    ]);
    const actualTemplates = new Set(templates.map(({ name }) => name));
    const actualRevisions = new Set(revisions.map(({ name }) => name));
    const missing = [
        ...REQUIRED_TEMPLATE.filter((name) => !actualTemplates.has(name)),
        ...REQUIRED_REVISION.filter((name) => !actualRevisions.has(name)),
    ];
    if (missing.length) {
        throw new Error('Index M-006 manquants : ' + missing.join(', '));
    }
    return { ensured: [...REQUIRED_TEMPLATE, ...REQUIRED_REVISION] };
};

export { ensureM006ProcessLibraryIndexes };
