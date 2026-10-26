import '../../setup.js';
import '../../../config/applicationCapability.registry.js';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { app } from '../../../app.js';
import { Dossier } from '../../../modules/dossier/dossier.model.js';
import { TechnicalSheet } from '../../../modules/technicalSheet/technicalSheet.model.js';
import { TechnicalSheetRange } from '../../../modules/technicalSheet/technicalSheetRange.model.js';
import {
    createTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheet.service.js';
import {
    deleteTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheetLifecycle.service.js';
import {
    bearer,
    createWorkspaceMemberFixture,
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';
import {
    TECHNICAL_SHEET_PERMISSION,
} from '../../../modules/technicalSheet/technicalSheetPermission.registry.js';
import { grantDossierAccess } from '../../../modules/dossier/dossierAccess.service.js';

let owner;
let dossier;

const rangesPath = () =>
    '/api/workspaces/' + owner.workspace._id.toString() + '/technical-sheets/ranges';
const sheetPath = (sheetId) =>
    '/api/workspaces/' + owner.workspace._id.toString()
    + '/dossiers/' + dossier._id.toString()
    + '/technical-sheets/' + sheetId;

const createSheet = (data = {}) => createTechnicalSheet({
    workspaceId: owner.workspace._id,
    dossierId: dossier._id,
    actorId: owner.owner._id,
    data: {
        name: 'Fiche essai Gammes',
        productionQuantity: '10',
        productionUnit: 'UNIT',
        vatRateBasisPoints: 550,
        ...data,
    },
});

beforeEach(async () => {
    owner = await createWorkspaceOwnerFixture();
    dossier = await Dossier.create({
        workspace: owner.workspace._id,
        name: 'Magasin Gammes',
        technicalSheetSettings: { defaultTargetMarginBasisPoints: 4000 },
        statusChangedBy: owner.owner._id,
        createdBy: owner.owner._id,
        updatedBy: owner.owner._id,
    });
});

describe('M-004 Gammes — HTTP, permissions et isolation', () => {
    it('crée, liste, renomme, archive et réactive une Gamme commune', async () => {
        const created = await request(app).post(rangesPath())
            .set(bearer(owner.token)).send({ name: ' Snacking  ' }).expect(201);
        const range = created.body.data.range;
        expect(range.name).toBe('Snacking');
        const duplicate = await request(app).post(rangesPath())
            .set(bearer(owner.token)).send({ name: '  SNACKING ' }).expect(409);
        expect(duplicate.body.status).not.toBe('success');

        const read = await request(app).get(rangesPath())
            .set(bearer(owner.token)).expect(200);
        expect(read.body.data.ranges.map((item) => item.id)).toContain(range.id);

        const renamed = await request(app).patch(rangesPath() + '/' + range.id)
            .set(bearer(owner.token))
            .send({ expectedRevision: range.revision, name: 'Traiteur' }).expect(200);
        const archived = await request(app).post(rangesPath() + '/' + range.id + '/archive')
            .set(bearer(owner.token))
            .send({ expectedRevision: renamed.body.data.range.revision }).expect(200);
        expect(archived.body.data.range.status).toBe('ARCHIVED');
        const restored = await request(app).post(rangesPath() + '/' + range.id + '/reactivate')
            .set(bearer(owner.token))
            .send({ expectedRevision: archived.body.data.range.revision }).expect(200);
        expect(restored.body.data.range.status).toBe('ACTIVE');
    });


    it('propose les doublons et les noms proches, archivés compris, avant la création', async () => {
        const base = (await request(app).post(rangesPath())
            .set(bearer(owner.token)).send({ name: 'Snacking' }).expect(201)).body.data.range;

        const suggestions = await request(app)
            .get(rangesPath() + '/suggestions')
            .query({ name: 'Snackin' })
            .set(bearer(owner.token)).expect(200);
        expect(suggestions.body.data.suggestions).toMatchObject({
            exactMatch: null,
            candidates: [expect.objectContaining({ id: base.id, name: 'Snacking' })],
        });

        await request(app).post(rangesPath())
            .set(bearer(owner.token)).send({ name: 'Snackin' }).expect(409);
        const distinct = await request(app).post(rangesPath())
            .set(bearer(owner.token)).send({
                name: 'Snackin', reviewedCandidateIds: [base.id],
            }).expect(201);
        expect(distinct.body.data.range.name).toBe('Snackin');

        const identical = await request(app)
            .get(rangesPath() + '/suggestions')
            .query({ name: ' SNACKING ' })
            .set(bearer(owner.token)).expect(200);
        expect(identical.body.data.suggestions.exactMatch)
            .toMatchObject({ id: base.id, name: 'Snacking' });

        await request(app).post(rangesPath())
            .set(bearer(owner.token)).send({
                name: 'SNACKING', reviewedCandidateIds: [base.id],
            }).expect(409);
    });

    it('ne compare les suggestions qu’aux Gammes du Workspace autorisé', async () => {
        const foreign = await createWorkspaceOwnerFixture();
        const foreignUrl = '/api/workspaces/' + foreign.workspace._id
            + '/technical-sheets/ranges';

        await request(app).post(foreignUrl)
            .set(bearer(foreign.token)).send({ name: 'Boulangerie' }).expect(201);

        const ours = await request(app)
            .get(rangesPath() + '/suggestions')
            .query({ name: 'Boulangerie' })
            .set(bearer(owner.token)).expect(200);
        expect(ours.body.data.suggestions)
            .toEqual({ exactMatch: null, candidates: [] });

        await request(app).get(foreignUrl + '/suggestions')
            .query({ name: 'Boulangerie' })
            .set(bearer(owner.token)).expect(403);
    });

    it('propose aussi une Gamme archivée et vérifie les noms lors du renommage', async () => {
        const range = (await request(app).post(rangesPath())
            .set(bearer(owner.token)).send({ name: 'Traiteur' }).expect(201)).body.data.range;
        await request(app).post(rangesPath() + '/' + range.id + '/archive')
            .set(bearer(owner.token)).send({ expectedRevision: range.revision })
            .expect(200);
        const candidates = await request(app).get(rangesPath() + '/suggestions')
            .query({ name: 'Traiteurr' }).set(bearer(owner.token)).expect(200);
        expect(candidates.body.data.suggestions.candidates).toContainEqual(
            expect.objectContaining({ id: range.id, status: 'ARCHIVED' }),
        );

        const editable = (await request(app).post(rangesPath())
            .set(bearer(owner.token)).send({ name: 'Charcuterie' }).expect(201)).body.data.range;
        const response = await request(app).patch(rangesPath() + '/' + editable.id)
            .set(bearer(owner.token)).send({
                expectedRevision: editable.revision, name: 'Traiteurr',
            }).expect(409);
        expect(response.body.status).not.toBe('success');
    });

    it('liste toutes les Gammes actives disponibles sans pagination de tableau', async () => {
        const other = await createWorkspaceOwnerFixture();
        const rows = Array.from({ length: 105 }, (_, index) => ({
            workspace: owner.workspace._id,
            name: 'Gamme ' + String(index).padStart(3, '0'),
            normalizedName: 'gamme ' + String(index).padStart(3, '0'),
            createdBy: owner.owner._id,
            updatedBy: owner.owner._id,
            statusChangedBy: owner.owner._id,
        }));
        await TechnicalSheetRange.insertMany(rows);

        const archived = await request(app).post(rangesPath())
            .set(bearer(owner.token)).send({ name: 'Gamme archivée' }).expect(201);
        await request(app).post(rangesPath() + '/' + archived.body.data.range.id + '/archive')
            .set(bearer(owner.token))
            .send({ expectedRevision: archived.body.data.range.revision })
            .expect(200);
        await TechnicalSheetRange.create({
            workspace: other.workspace._id, name: 'Étrangère',
            normalizedName: 'étrangère',
            createdBy: other.owner._id, updatedBy: other.owner._id,
            statusChangedBy: other.owner._id,
        });

        const result = await request(app).get(rangesPath() + '/options')
            .set(bearer(owner.token)).expect(200);
        expect(result.body.data.ranges).toHaveLength(105);
        expect(result.body.data.ranges[0].name).toBe('Gamme 000');
        expect(result.body.data.ranges).not.toContainEqual(
            expect.objectContaining({ name: 'Gamme archivée' }),
        );
        expect(result.body.data.ranges).not.toContainEqual(
            expect.objectContaining({ name: 'Étrangère' }),
        );

        const filterOptions = await request(app).get(rangesPath() + '/options')
            .query({ includeArchived: 'true' }).set(bearer(owner.token)).expect(200);
        expect(filterOptions.body.data.ranges).toHaveLength(106);
        expect(filterOptions.body.data.ranges).toContainEqual(
            expect.objectContaining({ name: 'Gamme archivée', status: 'ARCHIVED' }),
        );
        expect(filterOptions.body.data.ranges).not.toContainEqual(
            expect.objectContaining({ name: 'Étrangère' }),
        );

        await request(app).get(rangesPath() + '/options')
            .query({ includeArchived: 'invalid' }).set(bearer(owner.token)).expect(400);
    });

    it('classe une Fiche sans générer de brouillon supplémentaire ni nouveau quota', async () => {
        const range = (await request(app).post(rangesPath())
            .set(bearer(owner.token)).send({ name: 'Snacking' }).expect(201)).body.data.range;
        const created = await createSheet();
        const updated = await request(app).patch(sheetPath(created.sheet.id) + '/range')
            .set(bearer(owner.token))
            .send({ expectedRevision: created.sheet.revision, rangeId: range.id })
            .expect(200);
        expect(updated.body.data.sheet.rangeId).toBe(range.id);
        expect(updated.body.data.sheet.revision).toBe(created.sheet.revision + 1);

        const listed = await request(app).get(
            '/api/workspaces/' + owner.workspace._id + '/dossiers/'
            + dossier._id + '/technical-sheets?rangeId=' + range.id,
        ).set(bearer(owner.token)).expect(200);
        expect(listed.body.data.sheets.map((sheet) => sheet.id)).toContain(created.sheet.id);

        await request(app).patch(sheetPath(created.sheet.id) + '/range')
            .set(bearer(owner.token))
            .send({ expectedRevision: updated.body.data.sheet.revision, rangeId: null })
            .expect(200);
        const unassigned = await request(app).get(
            '/api/workspaces/' + owner.workspace._id + '/dossiers/'
            + dossier._id + '/technical-sheets?rangeId=unassigned',
        ).set(bearer(owner.token)).expect(200);
        expect(unassigned.body.data.sheets.map((sheet) => sheet.id))
            .toContain(created.sheet.id);
    });

    it('interdit la suppression de la Gamme liée, même si la Fiche est en corbeille', async () => {
        const range = (await request(app).post(rangesPath())
            .set(bearer(owner.token)).send({ name: 'Pâtisserie' }).expect(201)).body.data.range;
        const sheet = await createSheet({ rangeId: range.id });
        await request(app).delete(rangesPath() + '/' + range.id)
            .set(bearer(owner.token))
            .send({ expectedRevision: range.revision, confirmation: 'DELETE' }).expect(409);
        await deleteTechnicalSheet({
            workspaceId: owner.workspace._id,
            dossierId: dossier._id,
            technicalSheetId: sheet.sheet.id,
            actorId: owner.owner._id,
            expectedRevision: sheet.sheet.revision,
        });
        await request(app).delete(rangesPath() + '/' + range.id)
            .set(bearer(owner.token))
            .send({ expectedRevision: range.revision, confirmation: 'DELETE' }).expect(409);
        expect(await TechnicalSheet.countDocuments({ range: range.id })).toBe(1);
    });

    it('permet la suppression irréversible d’une Gamme sans Fiche, quel que soit son statut', async () => {
        const range = (await request(app).post(rangesPath())
            .set(bearer(owner.token)).send({ name: 'Vide' }).expect(201)).body.data.range;
        await request(app).delete(rangesPath() + '/' + range.id)
            .set(bearer(owner.token))
            .send({ expectedRevision: range.revision, confirmation: 'DELETE' }).expect(200);
        const list = await request(app).get(rangesPath())
            .set(bearer(owner.token)).expect(200);
        expect(list.body.data.ranges).toHaveLength(0);
    });

    it('refuse l’administration à un membre qui peut seulement modifier les Fiches', async () => {
        const member = await createWorkspaceMemberFixture({
            workspaceId: owner.workspace._id,
            actorId: owner.owner._id,
            permissions: [
                TECHNICAL_SHEET_PERMISSION.READ,
                TECHNICAL_SHEET_PERMISSION.UPDATE,
            ],
        });
        await grantDossierAccess({
            workspaceId: owner.workspace._id,
            dossierId: dossier._id,
            membershipId: member.membership._id,
            actorId: owner.owner._id,
        });
        await request(app).post(rangesPath()).set(bearer(member.token))
            .send({ name: 'Gamme interdite' }).expect(403);
        await request(app).get(rangesPath())
            .set(bearer(member.token)).expect(200);
    });

    it('refuse de classer une Fiche avec une Gamme d’un autre Workspace', async () => {
        const foreign = await createWorkspaceOwnerFixture();
        const foreignRange = await request(app).post(
            '/api/workspaces/' + foreign.workspace._id + '/technical-sheets/ranges',
        ).set(bearer(foreign.token)).send({ name: 'Autre organisation' }).expect(201);
        const sheet = await createSheet();
        await request(app).patch(sheetPath(sheet.sheet.id) + '/range')
            .set(bearer(owner.token))
            .send({
                expectedRevision: sheet.sheet.revision,
                rangeId: foreignRange.body.data.range.id,
            }).expect(409);
    });

    it('conserve le classement archivé mais refuse de lui associer une nouvelle Fiche', async () => {
        const range = (await request(app).post(rangesPath())
            .set(bearer(owner.token)).send({ name: 'Traiteur' }).expect(201)).body.data.range;
        const first = await createSheet({ rangeId: range.id });
        const second = await createSheet();
        const archived = (await request(app).post(
            rangesPath() + '/' + range.id + '/archive',
        ).set(bearer(owner.token))
            .send({ expectedRevision: range.revision }).expect(200)).body.data.range;
        expect(archived.status).toBe('ARCHIVED');

        const existing = await request(app).get(sheetPath(first.sheet.id))
            .set(bearer(owner.token)).expect(200);
        expect(existing.body.data.sheet.range).toMatchObject({
            name: 'Traiteur', status: 'ARCHIVED',
        });

        await request(app).patch(sheetPath(second.sheet.id) + '/range')
            .set(bearer(owner.token))
            .send({ expectedRevision: second.sheet.revision, rangeId: range.id })
            .expect(409);

        const unassigned = await request(app).patch(sheetPath(first.sheet.id) + '/range')
            .set(bearer(owner.token))
            .send({ expectedRevision: first.sheet.revision, rangeId: null }).expect(200);
        expect(unassigned.body.data.sheet.rangeId).toBeNull();
    });

    it('ne supprime pas une Gamme utilisée dans un autre Dossier du Workspace', async () => {
        const range = (await request(app).post(rangesPath())
            .set(bearer(owner.token)).send({ name: 'Cuisine chaude' }).expect(201)).body.data.range;
        const anotherDossier = await Dossier.create({
            workspace: owner.workspace._id,
            name: 'Deuxième magasin',
            technicalSheetSettings: { defaultTargetMarginBasisPoints: 4000 },
            statusChangedBy: owner.owner._id,
            createdBy: owner.owner._id,
            updatedBy: owner.owner._id,
        });
        await createTechnicalSheet({
            workspaceId: owner.workspace._id,
            dossierId: anotherDossier._id,
            actorId: owner.owner._id,
            data: {
                name: 'Plat du jour',
                rangeId: range.id,
                productionQuantity: '10',
                productionUnit: 'UNIT',
                vatRateBasisPoints: 550,
            },
        });
        await request(app).delete(rangesPath() + '/' + range.id)
            .set(bearer(owner.token))
            .send({ expectedRevision: range.revision, confirmation: 'DELETE' })
            .expect(409);
    });

    it('sépare le droit de gérer les Gammes du droit de classer une Fiche dans un Dossier', async () => {
        const manager = await createWorkspaceMemberFixture({
            workspaceId: owner.workspace._id,
            actorId: owner.owner._id,
            permissions: [
                TECHNICAL_SHEET_PERMISSION.READ,
                TECHNICAL_SHEET_PERMISSION.RANGE_MANAGE,
            ],
        });
        const created = await request(app).post(rangesPath())
            .set(bearer(manager.token)).send({ name: 'Gamme partagée' }).expect(201);
        const sheet = await createSheet();
        await request(app).patch(sheetPath(sheet.sheet.id) + '/range')
            .set(bearer(manager.token))
            .send({
                expectedRevision: sheet.sheet.revision,
                rangeId: created.body.data.range.id,
            }).expect(403);
    });

});
