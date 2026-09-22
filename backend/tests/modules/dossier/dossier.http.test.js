import '../../setup.js';

import request from 'supertest';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { app } from '../../../app.js';
import {
    DOSSIER_PERMISSIONS,
} from '../../../modules/dossier/dossierPermission.registry.js';
import {
    bearer,
    createWorkspaceMemberFixture,
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';


let ownerContext;
let memberContext;

beforeEach(async () => {
    ownerContext =
        await createWorkspaceOwnerFixture();

    memberContext =
        await createWorkspaceMemberFixture({
            workspaceId:
                ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            permissions: DOSSIER_PERMISSIONS,
        });
});

const basePath = () =>
    `/api/workspaces/${ownerContext.workspace._id.toString()}/dossiers`;


describe('M-001 dossier HTTP contract', () => {
    it('couvre les dix endpoints REST du parcours Owner', async () => {
        const ownerHeaders =
            bearer(ownerContext.token);

        const metadataResponse = await request(app)
            .get(`${basePath()}/metadata`)
            .set(ownerHeaders);

        expect(metadataResponse.status).toBe(200);
        expect(
            metadataResponse.body.data.metadata
                .dossierStatuses,
        ).toHaveLength(4);

        const initialListResponse =
            await request(app)
                .get(basePath())
                .set(ownerHeaders);

        expect(initialListResponse.status).toBe(200);

        const createResponse = await request(app)
            .post(basePath())
            .set(ownerHeaders)
            .send({
                name: 'Magasin Nantes',
            });

        expect(createResponse.status).toBe(201);
        const dossierId =
            createResponse.body.data.dossier.id;

        const detailResponse = await request(app)
            .get(`${basePath()}/${dossierId}`)
            .set(ownerHeaders);

        expect(detailResponse.status).toBe(200);

        const activityResponse = await request(app)
            .get(
                `${basePath()}/${dossierId}/activity`,
            )
            .set(ownerHeaders);

        expect(activityResponse.status).toBe(200);

        const updateResponse = await request(app)
            .patch(`${basePath()}/${dossierId}`)
            .set(ownerHeaders)
            .send({
                brand: 'Enseigne test',
            });

        expect(updateResponse.status).toBe(200);

        const statusResponse = await request(app)
            .patch(
                `${basePath()}/${dossierId}/status`,
            )
            .set(ownerHeaders)
            .send({
                status: 'PAUSED',
            });

        expect(statusResponse.status).toBe(200);

        const accessListResponse =
            await request(app)
                .get(
                    `${basePath()}/${dossierId}/access-grants`,
                )
                .set(ownerHeaders);

        expect(accessListResponse.status).toBe(200);

        const grantResponse = await request(app)
            .put(
                `${basePath()}/${dossierId}/access-grants/${memberContext.membership._id.toString()}`,
            )
            .set(ownerHeaders);

        expect(grantResponse.status).toBe(201);

        const revokeResponse = await request(app)
            .delete(
                `${basePath()}/${dossierId}/access-grants/${memberContext.membership._id.toString()}`,
            )
            .set(ownerHeaders);

        expect(revokeResponse.status).toBe(204);
    });

    it('applique validation, RBAC et anti-énumération du scope Dossier', async () => {
        const ownerHeaders =
            bearer(ownerContext.token);

        const invalidResponse = await request(app)
            .get(`${basePath()}/invalid-id`)
            .set(ownerHeaders);

        expect(invalidResponse.status).toBe(400);

        const createResponse = await request(app)
            .post(basePath())
            .set(ownerHeaders)
            .send({
                name: 'Dossier privé',
            });

        const dossierId =
            createResponse.body.data.dossier.id;

        const memberHeaders =
            bearer(memberContext.token);

        const outOfScopeResponse =
            await request(app)
                .get(
                    `${basePath()}/${dossierId}`,
                )
                .set(memberHeaders);

        expect(outOfScopeResponse.status).toBe(404);

        const readOnlyMember =
            await createWorkspaceMemberFixture({
                workspaceId:
                    ownerContext.workspace._id,
                actorId:
                    ownerContext.owner._id,
                permissions: [
                    'dossier:read',
                ],
            });

        const forbiddenCreate =
            await request(app)
                .post(basePath())
                .set(
                    bearer(readOnlyMember.token),
                )
                .send({
                    name: 'Interdit',
                });

        expect(forbiddenCreate.status).toBe(403);
    });
});
