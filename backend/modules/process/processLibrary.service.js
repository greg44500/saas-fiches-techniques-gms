import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import {
    BUSINESS_ACTIVITY_ACTION,
    BUSINESS_ACTIVITY_ENTITY_TYPE,
} from '../businessActivity/businessActivity.registry.js';
import {
    createBusinessActivityEvent,
} from '../businessActivity/businessActivity.service.js';
import { Dossier } from '../dossier/dossier.model.js';
import { DOSSIER_STATUS } from '../dossier/dossier.registry.js';
import {
    ProcessLibraryRevision,
    ProcessLibraryTemplate,
} from './processLibrary.model.js';
import {
    PROCESS_LIBRARY_KIND,
    PROCESS_LIBRARY_STATUS,
} from './processLibrary.registry.js';
import {
    phaseDefinitionSchema,
    stepDefinitionSchema,
} from './processLibrary.validation.js';

const conflict = () => new AppError(
    'Modèle indisponible, archivé ou modifié entre-temps.',
    409,
);
const normalizeTitle = (value) =>
    value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr');

const toKind = (segment) =>
    segment === 'steps'
        ? PROCESS_LIBRARY_KIND.STEP
        : PROCESS_LIBRARY_KIND.PHASE;

const parseDefinition = (kind, value) => {
    const parsed = (
        kind === PROCESS_LIBRARY_KIND.STEP
            ? stepDefinitionSchema
            : phaseDefinitionSchema
    ).safeParse(value);
    if (!parsed.success) {
        throw new AppError('Définition de modèle invalide.', 400);
    }
    return parsed.data;
};

const scopedFilter = ({ workspaceId, dossierId = null, kind }) =>
    mongoose.trusted({
        workspace: workspaceId,
        dossier: dossierId,
        kind,
    });

const serializeTemplate = (item) => ({
    id: item._id.toString(),
    workspaceId: item.workspace.toString(),
    dossierId: item.dossier?.toString() ?? null,
    kind: item.kind,
    title: item.title,
    definition: item.definition,
    status: item.status,
    revision: item.revision,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
});

const assertOperationalScope = async ({ workspaceId, dossierId, session }) => {
    if (!dossierId) return;
    const dossier = await Dossier.findOne(mongoose.trusted({
        _id: dossierId,
        workspace: workspaceId,
        status: DOSSIER_STATUS.ACTIVE,
    })).session(session);
    if (!dossier) {
        throw new AppError('Le Dossier doit être actif.', 409);
    }
};

const audit = ({ workspaceId, dossierId, actorId, template, action, session }) =>
    createBusinessActivityEvent({
        workspaceId,
        dossierId,
        actorId,
        action,
        entityType: BUSINESS_ACTIVITY_ENTITY_TYPE.PROCESS_LIBRARY_TEMPLATE,
        entityId: template._id,
        metadata: {
            kind: template.kind,
            revision: template.revision,
        },
    }, { session });

const translateDuplicate = async (operation) => {
    try {
        return await operation();
    } catch (error) {
        if (error?.code === 11000) {
            throw new AppError(
                'Un modèle portant ce nom existe déjà dans cette bibliothèque.',
                409,
            );
        }
        throw error;
    }
};

const createRevision = async ({ template, definition, actorId, session }) =>
    ProcessLibraryRevision.create([{
        workspace: template.workspace,
        dossier: template.dossier,
        kind: template.kind,
        template: template._id,
        revision: template.revision,
        definition,
        createdBy: actorId,
    }], { session });

const createTemplate = ({
    workspaceId, dossierId = null, actorId, kind, definition,
    publishedFrom = null,
}) => translateDuplicate(() => mongoose.connection.transaction(async (session) => {
    await assertOperationalScope({ workspaceId, dossierId, session });
    const parsed = parseDefinition(kind, definition);
    const [template] = await ProcessLibraryTemplate.create([{
        workspace: workspaceId,
        dossier: dossierId,
        kind,
        title: parsed.title,
        normalizedTitle: normalizeTitle(parsed.title),
        definition: parsed,
        publishedFrom,
        createdBy: actorId,
        updatedBy: actorId,
    }], { session });
    await createRevision({ template, definition: parsed, actorId, session });
    await audit({
        workspaceId, dossierId, actorId, template, session,
        action: BUSINESS_ACTIVITY_ACTION.PROCESS_LIBRARY_CREATED,
    });
    return serializeTemplate(template);
}));

const listTemplates = async ({
    workspaceId, dossierId = null, kind, page = 1, limit = 30,
    status, search,
}) => {
    const filter = scopedFilter({ workspaceId, dossierId, kind });
    if (status) filter.status = status;
    if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.normalizedTitle = new RegExp(escaped.toLocaleLowerCase('fr'), 'i');
    }
    const [templates, total] = await Promise.all([
        ProcessLibraryTemplate.find(filter)
            .sort({ title: 1, _id: 1 })
            .skip((page - 1) * limit)
            .limit(limit),
        ProcessLibraryTemplate.countDocuments(filter),
    ]);
    return {
        templates: templates.map(serializeTemplate),
        pagination: {
            page, limit, total, totalPages: Math.ceil(total / limit),
        },
    };
};

const getTemplate = async ({
    workspaceId, dossierId = null, kind, templateId,
}) => {
    const template = await ProcessLibraryTemplate.findOne(mongoose.trusted({
        ...scopedFilter({ workspaceId, dossierId, kind }),
        _id: templateId,
    }));
    if (!template) throw new AppError('Modèle introuvable.', 404);
    return serializeTemplate(template);
};

const listRevisions = async ({
    workspaceId, dossierId = null, kind, templateId,
    page = 1, limit = 30,
}) => {
    await getTemplate({ workspaceId, dossierId, kind, templateId });
    const filter = mongoose.trusted({
        ...scopedFilter({ workspaceId, dossierId, kind }),
        template: templateId,
    });
    const [versions, total] = await Promise.all([
        ProcessLibraryRevision.find(filter)
            .sort({ revision: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        ProcessLibraryRevision.countDocuments(filter),
    ]);
    return {
        revisions: versions.map((revision) => ({
            id: revision._id.toString(),
            revision: revision.revision,
            definition: revision.definition,
            createdAt: revision.createdAt,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};

const updateTemplate = ({
    workspaceId, dossierId = null, actorId, kind,
    templateId, expectedRevision, definition,
}) => translateDuplicate(() => mongoose.connection.transaction(async (session) => {
    await assertOperationalScope({ workspaceId, dossierId, session });
    const parsed = parseDefinition(kind, definition);
    const template = await ProcessLibraryTemplate.findOneAndUpdate(
        mongoose.trusted({
            ...scopedFilter({ workspaceId, dossierId, kind }),
            _id: templateId,
            status: PROCESS_LIBRARY_STATUS.ACTIVE,
            revision: expectedRevision,
        }),
        {
            $set: {
                title: parsed.title,
                normalizedTitle: normalizeTitle(parsed.title),
                definition: parsed,
                updatedBy: actorId,
            },
            $inc: { revision: 1 },
        },
        { session, returnDocument: 'after', runValidators: true },
    );
    if (!template) throw conflict();
    await createRevision({ template, definition: parsed, actorId, session });
    await audit({
        workspaceId, dossierId, actorId, template, session,
        action: BUSINESS_ACTIVITY_ACTION.PROCESS_LIBRARY_REVISED,
    });
    return serializeTemplate(template);
}));

const setTemplateStatus = ({
    workspaceId, dossierId = null, actorId, kind, templateId,
    expectedRevision, nextStatus,
}) => mongoose.connection.transaction(async (session) => {
    await assertOperationalScope({ workspaceId, dossierId, session });
    const previousStatus = nextStatus === PROCESS_LIBRARY_STATUS.ARCHIVED
        ? PROCESS_LIBRARY_STATUS.ACTIVE
        : PROCESS_LIBRARY_STATUS.ARCHIVED;
    const template = await ProcessLibraryTemplate.findOneAndUpdate(
        mongoose.trusted({
            ...scopedFilter({ workspaceId, dossierId, kind }),
            _id: templateId,
            revision: expectedRevision,
            status: previousStatus,
        }),
        {
            $set: { status: nextStatus, updatedBy: actorId },
            $inc: { revision: 1 },
        },
        { session, returnDocument: 'after', runValidators: true },
    );
    if (!template) throw conflict();
    // Keep the content lookup valid for every revision number. A status
    // transition has an identical, but independently immutable, snapshot.
    await createRevision({
        template,
        definition: template.definition,
        actorId,
        session,
    });
    await audit({
        workspaceId, dossierId, actorId, template, session,
        action: nextStatus === PROCESS_LIBRARY_STATUS.ARCHIVED
            ? BUSINESS_ACTIVITY_ACTION.PROCESS_LIBRARY_ARCHIVED
            : BUSINESS_ACTIVITY_ACTION.PROCESS_LIBRARY_REACTIVATED,
    });
    return serializeTemplate(template);
});

const publishTemplate = ({
    workspaceId, dossierId, actorId, kind, templateId,
    expectedRevision,
}) => translateDuplicate(() => mongoose.connection.transaction(async (session) => {
    await assertOperationalScope({ workspaceId, dossierId, session });
    // A write to the source prevents races with archive/edit while copying.
    const source = await ProcessLibraryTemplate.findOneAndUpdate(
        mongoose.trusted({
            ...scopedFilter({ workspaceId, dossierId, kind }),
            _id: templateId,
            status: PROCESS_LIBRARY_STATUS.ACTIVE,
            revision: expectedRevision,
        }),
        { $inc: { assignmentVersion: 1 } },
        { session, returnDocument: 'after', timestamps: false },
    );
    if (!source) throw conflict();
    const definition = structuredClone(source.definition);
    const [published] = await ProcessLibraryTemplate.create([{
        workspace: workspaceId,
        dossier: null,
        kind,
        title: source.title,
        normalizedTitle: source.normalizedTitle,
        definition,
        publishedFrom: source._id,
        createdBy: actorId,
        updatedBy: actorId,
    }], { session });
    await createRevision({ template: published, definition, actorId, session });
    await audit({
        workspaceId, dossierId: null, actorId, template: published, session,
        action: BUSINESS_ACTIVITY_ACTION.PROCESS_LIBRARY_PUBLISHED,
    });
    return serializeTemplate(published);
}));

export {
    createTemplate,
    getTemplate,
    listRevisions,
    listTemplates,
    publishTemplate,
    serializeTemplate,
    setTemplateStatus,
    toKind,
    updateTemplate,
};
