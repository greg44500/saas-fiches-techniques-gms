import '../../setup.js';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { app } from '../../../app.js';
import { Dossier } from '../../../modules/dossier/dossier.model.js';
import {
    BUSINESS_ACTIVITY_ACTION,
} from '../../../modules/businessActivity/businessActivity.registry.js';
import {
    BusinessActivityEvent,
} from '../../../modules/businessActivity/businessActivity.model.js';
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

    it('sert les suggestions de phases ACTIVE selon leur Workspace et leur Dossier, avec recherche et pagination', async () => {
        const sharedPath = workspacePath() + '/phases';
        const localPath = dossierPath() + '/phases';
        const create = async (path, title) => {
            const result = await request(app).post(path)
                .set(bearer(owner.token))
                .send({
                    definition: {
                        title, instructions: '',
                        steps: [step('Opération du modèle')],
                    },
                }).expect(201);
            return result.body.data.template;
        };

        // Models shared at the Workspace level are not tied to a Dossier.
        const anotherDossier = await Dossier.create({
            workspace: owner.workspace._id,
            name: 'Autre magasin du Workspace',
            statusChangedBy: owner.owner._id,
            createdBy: owner.owner._id,
            updatedBy: owner.owner._id,
        });
        await create(sharedPath, 'Cuisson');
        await request(app).post(workspacePath() + '/steps')
            .set(bearer(owner.token))
            .send({ definition: step('Contrôle de cuisson') }).expect(201);
        const archived = await create(sharedPath, 'Présentation et dressage');
        await request(app).post(sharedPath + '/' + archived.id + '/archive')
            .set(bearer(owner.token))
            .send({ expectedRevision: archived.revision }).expect(200);

        await create(localPath, 'Préparation du poste');
        await create(localPath, 'Préparations initiales');

        const shared = await request(app).get(sharedPath)
            .query({ status: 'ACTIVE', page: 1, limit: 100 })
            .set(bearer(owner.token)).expect(200);
        expect(shared.body.data.templates.map(({ title }) => title))
            .toEqual(['Cuisson']);
        expect(shared.body.data.templates[0].dossierId).toBeNull();

        // Both dossiers access the same Workspace routes for reusable models.
        const sharedSteps = await request(app).get(workspacePath() + '/steps')
            .query({ status: 'ACTIVE', page: 1, limit: 100 })
            .set(bearer(owner.token)).expect(200);
        expect(sharedSteps.body.data.templates.map(({ title }) => title))
            .toContain('Contrôle de cuisson');
        expect(sharedSteps.body.data.templates[0].dossierId).toBeNull();

        // A Dossier-scoped GET does not pretend to include Workspace models.
        // The frontend composes the two independent backend lists.
        const otherLocal = await request(app).get(
            dossierPath(anotherDossier._id) + '/phases',
        ).query({ status: 'ACTIVE' })
            .set(bearer(owner.token)).expect(200);
        expect(otherLocal.body.data.templates).toEqual([]);
        expect(otherLocal.body.data.pagination.total).toBe(0);

        const firstLocal = await request(app).get(localPath)
            .query({ status: 'ACTIVE', search: 'prépar', page: 1, limit: 1 })
            .set(bearer(owner.token)).expect(200);
        expect(firstLocal.body.data.pagination).toMatchObject({
            page: 1, limit: 1, total: 2, totalPages: 2,
        });
        expect(firstLocal.body.data.templates).toHaveLength(1);
        expect(firstLocal.body.data.templates[0].dossierId)
            .toBe(dossier._id.toString());

        const secondLocal = await request(app).get(localPath)
            .query({ status: 'ACTIVE', search: 'prépar', page: 2, limit: 1 })
            .set(bearer(owner.token)).expect(200);
        expect(secondLocal.body.data.pagination).toMatchObject({
            page: 2, limit: 1, total: 2, totalPages: 2,
        });
        expect(new Set([
            firstLocal.body.data.templates[0].title,
            secondLocal.body.data.templates[0].title,
        ])).toEqual(new Set(['Préparation du poste', 'Préparations initiales']));

        const localOnly = await request(app).get(localPath)
            .query({ status: 'ACTIVE', search: 'Cuisson' })
            .set(bearer(owner.token)).expect(200);
        expect(localOnly.body.data.templates).toEqual([]);

        const cannotReadWithoutAuthentication = await request(app)
            .get(localPath).query({ status: 'ACTIVE' }).expect(401);
        expect(cannotReadWithoutAuthentication.body.status).not.toBe('success');
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

    it('expose les routes métier et rejette méthodes, kinds et identifiants invalides', async () => {
        const path = workspacePath();
        await request(app).get(path + '/steps')
            .set(bearer(owner.token)).expect(200);
        await request(app).get(dossierPath() + '/phases')
            .set(bearer(owner.token)).expect(200);
        await request(app).get(path + '/invalid')
            .set(bearer(owner.token)).expect(400);
        await request(app).get(path + '/steps/not-an-id')
            .set(bearer(owner.token)).expect(400);
        await request(app).get(path + '/steps/aaaaaaaaaaaaaaaaaaaaaaaa')
            .set(bearer(owner.token)).expect(404);
        await request(app).get(path + '/steps')
            .query({ limit: 101 }).set(bearer(owner.token)).expect(400);
        await request(app).get(path + '/steps').expect(401);
    });

    it('refuse les définitions incohérentes, durées invalides et tout média', async () => {
        const workspace = workspacePath();
        const invalidSteps = [
            { ...step(), photoUrl: '/photo.png' },
            { ...step(), duration: { activeMinutes: -1 } },
            { ...step(), duration: { restMinutes: 10081 } },
            { ...step(), sanitaryControls: [{ instruction: '' }] },
            { ...step(), qualityControls: [{ instruction: 'OK', photoId: 'test' }] },
            { title: 'Phase au lieu d’étape', steps: [step()] },
        ];
        for (const definition of invalidSteps) {
            await request(app).post(workspace + '/steps')
                .set(bearer(owner.token)).send({ definition }).expect(400);
        }
        await request(app).post(workspace + '/phases')
            .set(bearer(owner.token))
            .send({ definition: step() }).expect(400);
        await request(app).post(workspace + '/phases')
            .set(bearer(owner.token))
            .send({ definition: { title: 'Phase vide', steps: [] } })
            .expect(400);
        await request(app).post(workspace + '/steps')
            .set(bearer(owner.token))
            .send({ definition: step(), unknownField: 'ignored?' })
            .expect(400);
        expect(await ProcessLibraryTemplate.countDocuments({
            workspace: owner.workspace._id,
        })).toBe(0);
    });

    it('filtre et pagine sans interpréter la recherche comme une regex', async () => {
        const path = workspacePath() + '/steps';
        for (const title of ['Cuisson', 'C++', 'Sauce']) {
            await request(app).post(path)
                .set(bearer(owner.token))
                .send({ definition: step(title) }).expect(201);
        }
        const literalSearch = await request(app).get(path)
            .query({ search: 'C++' })
            .set(bearer(owner.token)).expect(200);
        expect(literalSearch.body.data.templates.map((item) => item.title))
            .toEqual(['C++']);

        const firstPage = await request(app).get(path)
            .query({ limit: 2, page: 1 })
            .set(bearer(owner.token)).expect(200);
        const nextPage = await request(app).get(path)
            .query({ limit: 2, page: 2 })
            .set(bearer(owner.token)).expect(200);
        expect(firstPage.body.data.pagination.total).toBe(3);
        expect(firstPage.body.data.pagination.totalPages).toBe(2);
        expect(firstPage.body.data.templates).toHaveLength(2);
        expect(nextPage.body.data.templates).toHaveLength(1);
    });

    it('refuse les révisions obsolètes et garde toutes les versions et audits', async () => {
        const path = workspacePath() + '/steps';
        const created = (await request(app).post(path)
            .set(bearer(owner.token))
            .send({ definition: step('Fermentation') }).expect(201)
        ).body.data.template;
        const next = (await request(app).put(path + '/' + created.id)
            .set(bearer(owner.token))
            .send({
                definition: step('Fermentation lente'),
                expectedRevision: 0,
            }).expect(200)).body.data.template;
        await request(app).post(path + '/' + created.id + '/archive')
            .set(bearer(owner.token))
            .send({ expectedRevision: 0 }).expect(409);
        await request(app).put(path + '/' + created.id)
            .set(bearer(owner.token))
            .send({
                definition: step('Ancienne version'),
                expectedRevision: 0,
            }).expect(409);

        const current = await request(app).get(path + '/' + created.id)
            .set(bearer(owner.token)).expect(200);
        expect(current.body.data.template).toMatchObject({
            revision: next.revision,
            title: 'Fermentation lente',
            status: 'ACTIVE',
        });
        const history = await request(app).get(path + '/' + created.id + '/revisions')
            .set(bearer(owner.token)).expect(200);
        expect(history.body.data.revisions.map((v) => v.definition.title))
            .toEqual(['Fermentation lente', 'Fermentation']);
        const actions = await BusinessActivityEvent.find({
            workspace: owner.workspace._id,
            entityId: created.id,
        }).lean();
        expect(actions.map(({ action }) => action).sort()).toEqual([
            BUSINESS_ACTIVITY_ACTION.PROCESS_LIBRARY_CREATED,
            BUSINESS_ACTIVITY_ACTION.PROCESS_LIBRARY_REVISED,
        ].sort());
    });

    it('refuse une publication sur modèle archivé et garantit le rollback sur doublon', async () => {
        const localPath = dossierPath() + '/steps';
        const globalPath = workspacePath() + '/steps';
        const source = (await request(app).post(localPath)
            .set(bearer(owner.token))
            .send({ definition: step('Pétrissage') }).expect(201)
        ).body.data.template;
        await request(app).post(globalPath)
            .set(bearer(owner.token))
            .send({ definition: step('Pétrissage') }).expect(201);
        await request(app).post(localPath + '/' + source.id + '/publish')
            .set(bearer(owner.token))
            .send({ expectedRevision: 0 }).expect(409);
        const unchanged = await ProcessLibraryTemplate.findById(source.id);
        expect(unchanged.assignmentVersion).toBe(0);
        expect(unchanged.revision).toBe(0);
        expect(await ProcessLibraryTemplate.countDocuments({
            workspace: owner.workspace._id,
        })).toBe(2);
        expect(await ProcessLibraryRevision.countDocuments({
            workspace: owner.workspace._id,
        })).toBe(2);
        const archived = (await request(app).post(
            localPath + '/' + source.id + '/archive',
        ).set(bearer(owner.token))
            .send({ expectedRevision: 0 }).expect(200)).body.data.template;
        await request(app).post(localPath + '/' + source.id + '/publish')
            .set(bearer(owner.token))
            .send({ expectedRevision: archived.revision }).expect(409);
    });

    it('refuse les ressources de bibliothèque locales appartenant à un autre Dossier', async () => {
        const second = await Dossier.create({
            workspace: owner.workspace._id,
            name: 'Dossier second',
            statusChangedBy: owner.owner._id,
            createdBy: owner.owner._id,
            updatedBy: owner.owner._id,
        });
        const path = dossierPath() + '/steps';
        const template = (await request(app).post(path)
            .set(bearer(owner.token))
            .send({ definition: step('Découpe') }).expect(201)
        ).body.data.template;
        const otherPath = dossierPath(second._id) + '/steps/' + template.id;
        await request(app).get(otherPath)
            .set(bearer(owner.token)).expect(404);
        await request(app).get(otherPath + '/revisions')
            .set(bearer(owner.token)).expect(404);
        await request(app).put(otherPath)
            .set(bearer(owner.token))
            .send({ expectedRevision: 0, definition: step('Intrusion') })
            .expect(409);
        await request(app).get(path + '/' + template.id)
            .set(bearer(owner.token)).expect(200);
    });

    it('refuse la lecture cross-Workspace', async () => {
        const foreign = await createWorkspaceOwnerFixture();
        await request(app).get(
            '/api/workspaces/' + foreign.workspace._id + '/process-library/steps',
        ).set(bearer(owner.token)).expect(403);
    });
});
