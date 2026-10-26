import '../../setup.js';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { app } from '../../../app.js';
import { Dossier } from '../../../modules/dossier/dossier.model.js';
import {
    grantDossierAccess,
} from '../../../modules/dossier/dossierAccess.service.js';
import {
    createTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheet.service.js';
import {
    TechnicalSheetDraft,
} from '../../../modules/technicalSheet/technicalSheetDraft.model.js';
import {
    TechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheet.model.js';
import {
    bearer, createWorkspaceMemberFixture, createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';
import {
    PROCESS_SHEET_PERMISSION,
} from '../../../modules/process/processSheetPermission.registry.js';

let owner;
let dossier;
let sheet;
let path;

beforeEach(async () => {
    owner = await createWorkspaceOwnerFixture();
    dossier = await Dossier.create({
        workspace: owner.workspace._id,
        name: 'Dossier M-006 composition',
        technicalSheetSettings: { defaultTargetMarginBasisPoints: 4000 },
        statusChangedBy: owner.owner._id,
        createdBy: owner.owner._id,
        updatedBy: owner.owner._id,
    });
    const created = await createTechnicalSheet({
        workspaceId: owner.workspace._id,
        dossierId: dossier._id,
        actorId: owner.owner._id,
        data: {
            name: 'Fiche source M-004',
            productionQuantity: '10',
            productionUnit: 'UNIT',
            vatRateBasisPoints: 550,
        },
    });
    sheet = created.sheet;
    path = '/api/workspaces/' + owner.workspace._id
        + '/dossiers/' + dossier._id
        + '/process-sheets/technical-sheets/' + sheet.id + '/composition';
});

describe('M-006 — lecture sécurisée de la composition M-004', () => {
    it('expose la composition brouillon et pas les calculs économiques', async () => {
        const response = await request(app).get(path)
            .set(bearer(owner.token)).expect(200);
        expect(response.body.data).toMatchObject({
            technicalSheetId: sheet.id,
            technicalSheetStatus: 'ACTIVE',
            currentSourceKind: 'DRAFT',
            validated: null,
            draft: { sourceKind: 'DRAFT', lines: [], groupedIngredients: [] },
        });
        expect(JSON.stringify(response.body.data)).not.toContain('finalPrice');
    });

    it('répond 401 sans jeton et 400 sur identifiant invalide', async () => {
        await request(app).get(path).expect(401);
        await request(app).get(path.replace(sheet.id, 'bad'))
            .set(bearer(owner.token)).expect(400);
    });

    it('interdit les lectures inter-Workspace et inter-Dossier', async () => {
        const foreign = await createWorkspaceOwnerFixture();
        await request(app).get(path.replace(
            owner.workspace._id.toString(),
            foreign.workspace._id.toString(),
        )).set(bearer(owner.token)).expect(403);

        const otherDossier = await Dossier.create({
            workspace: owner.workspace._id,
            name: 'Autre dossier',
            statusChangedBy: owner.owner._id,
            createdBy: owner.owner._id,
            updatedBy: owner.owner._id,
        });
        const otherPath = path.replace(
            dossier._id.toString(),
            otherDossier._id.toString(),
        );
        await request(app).get(otherPath)
            .set(bearer(owner.token)).expect(404);
    });

    it('ne confond pas lecture Workspace et autorisation du Dossier', async () => {
        const member = await createWorkspaceMemberFixture({
            workspaceId: owner.workspace._id,
            actorId: owner.owner._id,
            permissions: [PROCESS_SHEET_PERMISSION.READ],
        });
        await request(app).get(path)
            .set(bearer(member.token)).expect(404);
        await grantDossierAccess({
            workspaceId: owner.workspace._id,
            dossierId: dossier._id,
            membershipId: member.membership._id,
            actorId: owner.owner._id,
        });
        await request(app).get(path)
            .set(bearer(member.token)).expect(200);
    });

    it('refuse la lecture à un rôle sans permission, même avec accès Dossier', async () => {
        const member = await createWorkspaceMemberFixture({
            workspaceId: owner.workspace._id,
            actorId: owner.owner._id,
            permissions: [],
        });
        await grantDossierAccess({
            workspaceId: owner.workspace._id,
            dossierId: dossier._id,
            membershipId: member.membership._id,
            actorId: owner.owner._id,
        });
        await request(app).get(path)
            .set(bearer(member.token)).expect(403);
    });

    it('respecte le statut du parent archivé ou placé en corbeille', async () => {
        await TechnicalSheet.updateOne(
            { _id: sheet.id, workspace: owner.workspace._id },
            { $set: { status: 'ARCHIVED' } },
        );
        const archived = await request(app).get(path)
            .set(bearer(owner.token)).expect(200);
        expect(archived.body.data.technicalSheetStatus).toBe('ARCHIVED');

        await TechnicalSheet.updateOne(
            { _id: sheet.id, workspace: owner.workspace._id },
            { $set: { status: 'DELETED' } },
        );
        await request(app).get(path)
            .set(bearer(owner.token)).expect(404);
    });

    it('ne retourne pas de version validée fantôme ', async () => {
        await TechnicalSheetDraft.deleteOne({
            technicalSheet: sheet.id,
        });
        const result = await request(app).get(path)
            .set(bearer(owner.token)).expect(200);
        expect(result.body.data).toMatchObject({
            currentSourceKind: 'NONE',
            draft: null,
            validated: null,
        });
    });
});
