import '../../setup.js';

import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../../../app.js';
import {
    ProcessLibraryRevision,
    ProcessLibraryTemplate,
} from '../../../modules/process/processLibrary.model.js';
import { PROCESS_LIBRARY_KIND } from '../../../modules/process/processLibrary.registry.js';
import {
    DEFAULT_PROCESS_PHASE_TITLES,
    ensureWorkspaceProcessPhases,
} from '../../../modules/process/processPhaseTitles.service.js';
import { PROCESS_SHEET_PERMISSION } from '../../../modules/process/processSheetPermission.registry.js';
import {
    bearer, createWorkspaceMemberFixture, createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';

describe('M-006 — Catalogue de titres de phases Workspace', () => {
    it('provisionne les cinq phases une fois et les expose à tous les Dossiers du Workspace', async () => {
        const owner = await createWorkspaceOwnerFixture();
        const path = '/api/workspaces/' + owner.workspace._id + '/process-phase-titles';

        const initial = await request(app).get(path)
            .set(bearer(owner.token)).expect(200);
        expect(initial.body.data.phases.map((phase) => phase.title).sort())
            .toEqual([...DEFAULT_PROCESS_PHASE_TITLES].sort());

        await request(app).get(path).set(bearer(owner.token)).expect(200);
        await ensureWorkspaceProcessPhases({ workspaceId: owner.workspace._id });
        const filter = {
            workspace: owner.workspace._id, dossier: null,
            kind: PROCESS_LIBRARY_KIND.PHASE,
        };
        expect(await ProcessLibraryTemplate.countDocuments(filter)).toBe(5);
        expect(await ProcessLibraryRevision.countDocuments({
            workspace: owner.workspace._id, dossier: null,
            kind: PROCESS_LIBRARY_KIND.PHASE,
        })).toBe(5);
        const templates = await ProcessLibraryTemplate.find(filter).lean();
        expect(templates.every(({ definition }) => definition.steps.length === 0))
            .toBe(true);
        expect(templates.every(({ status }) => status === 'ACTIVE')).toBe(true);

        const readOnly = await createWorkspaceMemberFixture({
            workspaceId: owner.workspace._id,
            actorId: owner.owner._id,
            permissions: [PROCESS_SHEET_PERMISSION.READ],
        });
        const shared = await request(app).get(path)
            .set(bearer(readOnly.token)).expect(200);
        expect(shared.body.data.phases).toEqual(initial.body.data.phases);
        await request(app).post(path).set(bearer(readOnly.token))
            .send({ title: 'Sauté' }).expect(403);
        await request(app).get(path).expect(401);
    });

    it('persiste une phase libre en commun, sans recopier les étapes ni doublonner', async () => {
        const owner = await createWorkspaceOwnerFixture();
        const path = '/api/workspaces/' + owner.workspace._id + '/process-phase-titles';
        const writer = await createWorkspaceMemberFixture({
            workspaceId: owner.workspace._id,
            actorId: owner.owner._id,
            permissions: [
                PROCESS_SHEET_PERMISSION.READ,
                PROCESS_SHEET_PERMISSION.EDIT,
            ],
        });
        const created = await request(app).post(path)
            .set(bearer(writer.token))
            .send({ title: '  Finition personnalisée  ' })
            .expect(201);
        expect(created.body.data.phase.title).toBe('Finition personnalisée');
        const template = await ProcessLibraryTemplate.findById(created.body.data.phase.id);
        expect(template.workspace.toString()).toBe(owner.workspace._id.toString());
        expect(template.dossier).toBeNull();
        expect(template.definition).toMatchObject({
            title: 'Finition personnalisée', steps: [],
        });

        await request(app).post(path)
            .set(bearer(writer.token))
            .send({ title: 'FINITION   PERSONNALISÉE' }).expect(409);
        const fetched = await request(app).get(path)
            .set(bearer(owner.token)).expect(200);
        expect(fetched.body.data.phases.map((phase) => phase.title))
            .toContain('Finition personnalisée');
        expect(await ProcessLibraryTemplate.countDocuments({
            workspace: owner.workspace._id,
            dossier: null, kind: PROCESS_LIBRARY_KIND.PHASE,
        })).toBe(6);
        await request(app).post(path)
            .set(bearer(writer.token))
            .send({ title: '' }).expect(400);
    });

    it('conserve le statut ARCHIVED d’un intitulé par défaut au rejeu du seed', async () => {
        const owner = await createWorkspaceOwnerFixture();
        const path = '/api/workspaces/' + owner.workspace._id + '/process-phase-titles';
        await request(app).get(path).set(bearer(owner.token)).expect(200);
        const template = await ProcessLibraryTemplate.findOne({
            workspace: owner.workspace._id, dossier: null,
            kind: PROCESS_LIBRARY_KIND.PHASE,
            title: 'Cuisson',
        });
        await request(app).post(
            '/api/workspaces/' + owner.workspace._id
            + '/process-library/phases/' + template._id + '/archive',
        ).set(bearer(owner.token))
            .send({ expectedRevision: template.revision }).expect(200);
        await ensureWorkspaceProcessPhases({ workspaceId: owner.workspace._id });
        const fetched = await request(app).get(path).set(bearer(owner.token)).expect(200);
        expect(fetched.body.data.phases.map((phase) => phase.title))
            .not.toContain('Cuisson');
    });

    it('ne divulgue pas le catalogue d’un autre Workspace', async () => {
        const owner = await createWorkspaceOwnerFixture();
        const another = await createWorkspaceOwnerFixture();
        const path = '/api/workspaces/' + another.workspace._id + '/process-phase-titles';
        await request(app).get(path).set(bearer(owner.token)).expect(403);
        await request(app).post(path).set(bearer(owner.token))
            .send({ title: 'Phase interdite' }).expect(403);
    });
});
