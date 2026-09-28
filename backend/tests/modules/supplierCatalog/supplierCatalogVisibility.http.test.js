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
    bearer,
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';

let ownerA;
let ownerB;

const suppliersPath = (context) =>
    '/api/workspaces/'
    + context.workspace._id.toString()
    + '/suppliers';

const catalogsPath = (context) =>
    '/api/workspaces/'
    + context.workspace._id.toString()
    + '/supplier-catalogs';

beforeEach(async () => {
    ownerA = await createWorkspaceOwnerFixture();
    ownerB = await createWorkspaceOwnerFixture();
});

describe('M-003 supplier catalog visibility', () => {
    it('rend un catalogue privé invisible hors de son Workspace', async () => {
        const supplier = await request(app)
            .post(suppliersPath(ownerA))
            .set(bearer(ownerA.token))
            .send({
                name:
                    'Fournisseur catalogue privé A',
            });

        expect(supplier.status).toBe(201);

        const catalog = await request(app)
            .post(catalogsPath(ownerA))
            .set(bearer(ownerA.token))
            .send({
                supplierId:
                    supplier.body.data.supplier.id,
                name:
                    'Catalogue privé A',
                validFrom:
                    '2026-09-01T00:00:00.000Z',
            });

        expect(catalog.status).toBe(201);

        const [visibleA, visibleB] =
            await Promise.all([
                request(app)
                    .get(catalogsPath(ownerA))
                    .set(bearer(ownerA.token)),
                request(app)
                    .get(catalogsPath(ownerB))
                    .set(bearer(ownerB.token)),
            ]);

        expect(visibleA.status).toBe(200);
        expect(
            visibleA.body.data.catalogs.map(
                ({ name }) => name,
            ),
        ).toContain('Catalogue privé A');

        expect(visibleB.status).toBe(200);
        expect(
            visibleB.body.data.catalogs.map(
                ({ name }) => name,
            ),
        ).not.toContain('Catalogue privé A');
    });
});
