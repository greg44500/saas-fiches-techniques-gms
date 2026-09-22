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
    PRODUCT_CATALOG_PERMISSION,
} from '../../../modules/productCatalog/productCatalogPermission.registry.js';
import {
    bearer,
    createWorkspaceMemberFixture,
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';

let ownerContext;

beforeEach(async () => {
    ownerContext = await createWorkspaceOwnerFixture();
});

const basePath = () =>
    `/api/workspaces/${ownerContext.workspace._id.toString()}/products`;

describe('M-002 product catalog HTTP contract', () => {
    it('expose metadata, contribution, recherche et détail au Owner', async () => {
        const headers = bearer(ownerContext.token);

        const metadata = await request(app)
            .get(`${basePath()}/metadata`)
            .set(headers);

        expect(metadata.status).toBe(200);
        expect(
            metadata.body.data.metadata.referenceUnits,
        ).toHaveLength(6);

        const contribution = await request(app)
            .post(`${basePath()}/contributions`)
            .set(headers)
            .send({
                name: 'Lentille verte',
                variant: {
                    referenceUnit: 'KG',
                },
            });

        expect(contribution.status).toBe(201);
        expect(contribution.body.data.product.status).toBe(
            'PENDING_REVIEW',
        );

        const search = await request(app)
            .get(`${basePath()}/search?scope=REFERENCE`)
            .set(headers);

        expect(search.status).toBe(200);
        expect(search.body.data.results).toHaveLength(1);

        const detail = await request(app)
            .get(
                `${basePath()}/${contribution.body.data.product.id}`,
            )
            .set(headers);

        expect(detail.status).toBe(200);
        expect(detail.body.data.product.name).toBe('Lentille verte');
    });

    it('applique RBAC et validation des ObjectIds', async () => {
        const member = await createWorkspaceMemberFixture({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            permissions: [PRODUCT_CATALOG_PERMISSION.READ],
        });

        const forbidden = await request(app)
            .post(`${basePath()}/contributions`)
            .set(bearer(member.token))
            .send({
                name: 'Interdit',
                variant: { referenceUnit: 'KG' },
            });

        expect(forbidden.status).toBe(403);

        const invalid = await request(app)
            .get(`${basePath()}/invalid-id`)
            .set(bearer(ownerContext.token));

        expect(invalid.status).toBe(400);
    });

    it('inspecte et prévisualise un CSV temporaire', async () => {
        const headers = bearer(ownerContext.token);
        const inspect = await request(app)
            .post(`${basePath()}/imports/inspect`)
            .set(headers)
            .attach(
                'file',
                Buffer.from('Produit\nHaricot blanc', 'utf8'),
                'produits.csv',
            );

        expect(inspect.status).toBe(201);
        expect(inspect.body.data.rowCount).toBe(1);

        const preview = await request(app)
            .post(
                `${basePath()}/imports/${inspect.body.data.importId}/preview`,
            )
            .set(headers)
            .send({
                mapping: { name: 0 },
                defaults: { referenceUnit: 'KG' },
            });

        expect(preview.status).toBe(200);
        expect(preview.body.data.counts.PROPOSE_PRODUCT).toBe(1);
    });
});
