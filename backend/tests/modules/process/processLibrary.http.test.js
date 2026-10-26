import '../../setup.js';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { app } from '../../../app.js';
import { Dossier } from '../../../modules/dossier/dossier.model.js';
import { grantDossierAccess } from '../../../modules/dossier/dossierAccess.service.js';
import {
    PROCESS_LIBRARY_PERMISSION,
} from '../../../modules/process/processLibrary.registry.js';
import {
    ProcessLibraryRevision,
    ProcessLibraryTemplate,
} from '../../../modules/process/processLibrary.model.js';
import {
    bearer,
    createWorkspaceMemberFixture,
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';

let owner;
let dossier;
const workspacePath = () =>
    '/api/workspaces/' + owner.workspace._id + '/process-library';
const dossierPath = (dossierId = dossier._id) =>
    '/api/workspaces/' + owner.workspace._id
    + '/dossiers/' + dossierId + '/process-library';

const step = (title = 'Cuisson au four') => ({
    title,
    instructions: 'Préchauffer le four et contrôler la cuisson.',
    duration: { treatmentMinutes: 20 },
    equipment: ['Four'],
});

beforeEach(async () => {
    owner = await createWorkspaceOwnerFixture();
    dossier = await Dossier.create({
        workspace: owner.workspace._id,
        name: 'Magasin process',
        statusChangedBy: owner.owner._id,
        createdBy: owner.owner._id,
        updatedBy: owner.owner._id,
    });
});

describe('M-006 — bibliothèques de fabrication', () => {
    it('versionne les étapes sans modifier les anciennes révisions', async () => {
        const path = workspacePath() + '/steps';
        const created = await request(app).post(path)
            .set(bearer(owner.token))
            .send({ definition: step() }).expect(201);
        const initial = created.body.data.template;
        expect(initial.revision).toBe(0);

        const updated = await request(app).put(path + '/' + initial.id)
            .set(bearer(owner.token))
            .send({
                expectedRevision: 0,
                definition: step('Cuisson contrôlée'),
            }).expect(200);
        expect(updated.body.data.template.revision).toBe(1);

        await request(app).put(path + '/' + initial.id)
            .set(bearer(owner.token))
            .send({ expectedRevision: 0, definition: step('Ancien') })
            .expect(409);

        const history = await request(app).get(path + '/' + initial.id + '/revisions')
            .set(bearer(owner.token)).expect(200);
        expect(history.body.data.revisions.map((item) => item.revision))
            .toEqual([1, 0]);
        expect(history.body.data.revisions[1].definition.title)
            .toBe('Cuisson au four');
        expect(await ProcessLibraryRevision.countDocuments({
            template: initial.id,
        })).toBe(2);
    });

    it('archive et réactive un modèle sans effacer son historique', async () => {
        const path = workspacePath() + '/steps';
        const created = await request(app).post(path)
            .set(bearer(owner.token))
            .send({ definition: step() }).expect(201);
        const id = created.body.data.template.id;
        const archived = await request(app).post(path + '/' + id + '/archive')
            .set(bearer(owner.token))
            .send({ expectedRevision: 0 }).expect(200);
        expect(archived.body.data.template.status).toBe('ARCHIVED');

        await request(app).put(path + '/' + id)
            .set(bearer(owner.token))
            .send({ expectedRevision: 1, definition: step('Non autorisé') })
            .expect(409);
        const reactivated = await request(app)
            .post(path + '/' + id + '/reactivate')
            .set(bearer(owner.token))
            .send({ expectedRevision: 1 }).expect(200);
        expect(reactivated.body.data.template.status).toBe('ACTIVE');
        expect(await ProcessLibraryRevision.countDocuments({ template: id }))
            .toBe(3);
    });

    it('isole les modèles locaux par Dossier et permet la publication autorisée', async () => {
        const otherDossier = await Dossier.create({
            workspace: owner.workspace._id,
            name: 'Magasin voisin',
            statusChangedBy: owner.owner._id,
            createdBy: owner.owner._id,
            updatedBy: owner.owner._id,
        });
        const localPath = dossierPath() + '/phases';
        const definition = {
            title: 'Cuisson',
            instructions: 'Surveiller',
            steps: [step('Cuire'), step('Contrôler')],
        };
        const created = await request(app).post(localPath)
            .set(bearer(owner.token))
            .send({ definition }).expect(201);
        const template = created.body.data.template;

        const other = await request(app).get(
            dossierPath(otherDossier._id) + '/phases',
        ).set(bearer(owner.token)).expect(200);
        expect(other.body.data.templates).toEqual([]);

        const sharedBefore = await request(app).get(workspacePath() + '/phases')
            .set(bearer(owner.token)).expect(200);
        expect(sharedBefore.body.data.templates).toEqual([]);

        await request(app).get(
            dossierPath(otherDossier._id) + '/phases/' + template.id,
        ).set(bearer(owner.token)).expect(404);

        const published = await request(app)
            .post(localPath + '/' + template.id + '/publish')
            .set(bearer(owner.token))
            .send({ expectedRevision: 0 }).expect(201);
        expect(published.body.data.template.dossierId).toBeNull();
        expect(published.body.data.template.id).not.toBe(template.id);

        const shared = await request(app).get(workspacePath() + '/phases')
            .set(bearer(owner.token)).expect(200);
        expect(shared.body.data.templates).toHaveLength(1);
        expect(await ProcessLibraryTemplate.countDocuments()).toBe(2);
    });

    it('rejette un champ photographie et les doublons dans le même scope', async () => {
        const path = workspacePath() + '/steps';
        await request(app).post(path).set(bearer(owner.token))
            .send({ definition: { ...step(), photoUrl: 'https://example.org/a.jpg' } })
            .expect(400);
        await request(app).post(path).set(bearer(owner.token))
            .send({ definition: step() }).expect(201);
        await request(app).post(path).set(bearer(owner.token))
            .send({ definition: step('CUISSON AU FOUR') }).expect(409);
    });

    it('conserve les snapshots lorsque le statut évolue', async () => {
        const path = workspacePath() + '/steps';
        const created = await request(app).post(path)
            .set(bearer(owner.token))
            .send({ definition: step() }).expect(201);
        const id = created.body.data.template.id;
        await request(app).post(path + '/' + id + '/archive')
            .set(bearer(owner.token))
            .send({ expectedRevision: 0 }).expect(200);
        await request(app).post(path + '/' + id + '/reactivate')
            .set(bearer(owner.token))
            .send({ expectedRevision: 1 }).expect(200);
        const history = await request(app).get(path + '/' + id + '/revisions')
            .set(bearer(owner.token)).expect(200);
        expect(history.body.data.revisions.map((r) => r.revision))
            .toEqual([2, 1, 0]);
        expect(history.body.data.revisions.every(
            (r) => r.definition.title === 'Cuisson au four',
        )).toBe(true);
    });

    it('applique RBAC et accès Dossier aux modèles locaux', async () => {
        const member = await createWorkspaceMemberFixture({
            workspaceId: owner.workspace._id,
            actorId: owner.owner._id,
            permissions: [
                PROCESS_LIBRARY_PERMISSION.READ,
                PROCESS_LIBRARY_PERMISSION.MANAGE_LOCAL,
            ],
        });
        const otherDossier = await Dossier.create({
            workspace: owner.workspace._id,
            name: 'Magasin sans affectation',
            statusChangedBy: owner.owner._id,
            createdBy: owner.owner._id,
            updatedBy: owner.owner._id,
        });
        await grantDossierAccess({
            workspaceId: owner.workspace._id,
            dossierId: dossier._id,
            membershipId: member.membership._id,
            actorId: owner.owner._id,
        });

        const localPath = dossierPath() + '/steps';
        const created = await request(app).post(localPath)
            .set(bearer(member.token))
            .send({ definition: step('Découpe') }).expect(201);
        await request(app).get(localPath)
            .set(bearer(member.token)).expect(200);
        await request(app).get(dossierPath(otherDossier._id) + '/steps')
            .set(bearer(member.token)).expect(404);
        await request(app).post(
            localPath + '/' + created.body.data.template.id + '/publish',
        ).set(bearer(member.token))
            .send({ expectedRevision: 0 }).expect(403);
        await request(app).post(workspacePath() + '/steps')
            .set(bearer(member.token))
            .send({ definition: step('Global interdit') }).expect(403);
    });

    it('refuse la lecture cross-Workspace', async () => {
        const foreign = await createWorkspaceOwnerFixture();
        await request(app).get(
            '/api/workspaces/' + foreign.workspace._id + '/process-library/steps',
        ).set(bearer(owner.token)).expect(403);
    });
});
