import mongoose from 'mongoose';

import { Workspace } from '../workspace/workspace.model.js';
import {
    ProcessLibraryRevision,
    ProcessLibraryTemplate,
} from './processLibrary.model.js';
import {
    PROCESS_LIBRARY_KIND,
    PROCESS_LIBRARY_STATUS,
} from './processLibrary.registry.js';
import {
    createTemplate,
} from './processLibrary.service.js';

// Provisioning belongs to M-006, not to the generic Core Workspace service.
const DEFAULT_PROCESS_PHASE_TITLES = Object.freeze([
    'Préparation du poste',
    'Préparations initiales',
    'Cuisson',
    'Assemblage',
    'Présentation / dressage',
]);
const normalizedTitle = (title) =>
    title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr');

const ensureDefaultProcessPhases = async ({ workspaceId, actorId, session }) => {
    if (!workspaceId || !actorId || !session) {
        throw new TypeError('workspaceId, actorId et session sont obligatoires.');
    }
    const result = [];
    for (const title of DEFAULT_PROCESS_PHASE_TITLES) {
        const definition = { title, instructions: '', steps: [] };
        const template = await ProcessLibraryTemplate.findOneAndUpdate(
            mongoose.trusted({
                workspace: workspaceId,
                dossier: null,
                kind: PROCESS_LIBRARY_KIND.PHASE,
                normalizedTitle: normalizedTitle(title),
            }),
            {
                $setOnInsert: {
                    title,
                    definition,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    status: PROCESS_LIBRARY_STATUS.ACTIVE,
                    revision: 0,
                    createdBy: actorId,
                    updatedBy: actorId,
                },
            },
            { upsert: true, new: true, session, setDefaultsOnInsert: true, timestamps: false },
        );
        // Create the initial snapshot for new/default revision-zero models.
        // Never fabricate revision zero from the *current* content of an
        // existing model that may already have been revised.
        if (template.revision === 0) {
            await ProcessLibraryRevision.updateOne(
                mongoose.trusted({ template: template._id, revision: 0 }),
                {
                    $setOnInsert: {
                        workspace: workspaceId,
                        dossier: null,
                        kind: PROCESS_LIBRARY_KIND.PHASE,
                        definition: template.definition,
                        createdBy: template.createdBy,
                    },
                },
                { upsert: true, session },
            );
        }
        result.push(template);
    }
    return result;
};

const ensureWorkspaceProcessPhases = async ({ workspaceId }) => {
    const workspace = await Workspace.findById(workspaceId)
        .select('createdBy').lean();
    if (!workspace?.createdBy) {
        throw new Error('Workspace sans propriétaire initial pour le catalogue M-006.');
    }
    // Concurrent first reads can race on the unique Workspace/title index.
    // Retry the whole transaction, never an individual partial insert.
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            return await mongoose.connection.transaction((session) =>
                ensureDefaultProcessPhases({
                    workspaceId, actorId: workspace.createdBy, session,
                }));
        } catch (error) {
            if (![11000, 112].includes(error?.code) || attempt === 2) {
                throw error;
            }
        }
    }
};

const listWorkspacePhaseTitles = async ({ workspaceId }) => {
    // Safe to replay: insert only absent defaults, never overwrite a user's
    // archived/revised phase. Also initializes Workspaces created after a deploy.
    await ensureWorkspaceProcessPhases({ workspaceId });
    const templates = await ProcessLibraryTemplate.find(mongoose.trusted({
        workspace: workspaceId,
        dossier: null,
        kind: PROCESS_LIBRARY_KIND.PHASE,
        status: PROCESS_LIBRARY_STATUS.ACTIVE,
    })).select('_id title').sort({ title: 1, _id: 1 }).lean();
    return templates.map((template) => ({
        id: template._id.toString(),
        title: template.title,
    }));
};

const createWorkspacePhaseTitle = ({ workspaceId, actorId, title }) =>
    createTemplate({
        workspaceId, actorId,
        kind: PROCESS_LIBRARY_KIND.PHASE,
        definition: { title, instructions: '', steps: [] },
    });

export {
    DEFAULT_PROCESS_PHASE_TITLES,
    createWorkspacePhaseTitle,
    ensureDefaultProcessPhases,
    ensureWorkspaceProcessPhases,
    listWorkspacePhaseTitles,
};
