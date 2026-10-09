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
    it('compte, recherche et filtre les lignes sans exposer un catalogue privé hors Workspace', async () => {
        const supplier = await request(app)
            .post(suppliersPath(ownerA))
            .set(bearer(ownerA.token))
            .send({
                name:
                    'Fournisseur consultation A',
            });

        expect(supplier.status).toBe(201);

        const catalog = await request(app)
            .post(catalogsPath(ownerA))
            .set(bearer(ownerA.token))
            .send({
                supplierId:
                    supplier.body.data.supplier.id,
                name:
                    'Catalogue consultation A',
                validFrom:
                    '2026-10-01T00:00:00.000Z',
            });

        expect(catalog.status).toBe(201);

        const catalogId =
            catalog.body.data.catalog.id;
        const linesPath =
            catalogsPath(ownerA)
            + '/'
            + catalogId
            + '/lines';

        const bacon = await request(app)
            .post(linesPath)
            .set(bearer(ownerA.token))
            .send({
                supplierReference: 'BAC-001',
                designation: 'Bacon fumé',
                brand: 'Maison Test',
                matchStatus: 'UNMATCHED',
            });

        const ignored = await request(app)
            .post(linesPath)
            .set(bearer(ownerA.token))
            .send({
                supplierReference: 'IGN-001',
                designation: 'Ligne ignorée',
                matchStatus: 'IGNORED',
            });

        expect(bacon.status).toBe(201);
        expect(ignored.status).toBe(201);

        const catalogList = await request(app)
            .get(catalogsPath(ownerA))
            .set(bearer(ownerA.token));

        expect(catalogList.status).toBe(200);
        expect(
            catalogList.body.data.catalogs
                .find(({ id }) => id === catalogId)
                .lineCount,
        ).toBe(2);

        const filtered = await request(app)
            .get(linesPath)
            .query({
                search: 'bacon',
                matchStatus: 'UNMATCHED',
            })
            .set(bearer(ownerA.token));

        expect(filtered.status).toBe(200);
        expect(filtered.body.data.catalog).toEqual(
            expect.objectContaining({
                id: catalogId,
                lineCount: 2,
                supplierName:
                    'Fournisseur consultation A',
            }),
        );
        expect(filtered.body.data.pagination.total)
            .toBe(1);
        expect(filtered.body.data.lines).toEqual([
            expect.objectContaining({
                supplierReference: 'BAC-001',
                designation: 'Bacon fumé',
                matchStatus: 'UNMATCHED',
            }),
        ]);

        const brandSearch = await request(app)
            .get(linesPath)
            .query({ search: 'maison test' })
            .set(bearer(ownerA.token));

        expect(brandSearch.status).toBe(200);
        expect(brandSearch.body.data.lines).toEqual([
            expect.objectContaining({
                supplierReference: 'BAC-001',
                brand: 'Maison Test',
            }),
        ]);

        const literalSearch = await request(app)
            .get(linesPath)
            .query({ search: '.*' })
            .set(bearer(ownerA.token));

        expect(literalSearch.status).toBe(200);
        expect(literalSearch.body.data.pagination.total)
            .toBe(0);

        const crossWorkspace = await request(app)
            .get(
                catalogsPath(ownerB)
                + '/'
                + catalogId
                + '/lines',
            )
            .set(bearer(ownerB.token));

        expect(crossWorkspace.status).toBe(404);
    });


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
