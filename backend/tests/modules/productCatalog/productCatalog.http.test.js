import '../../setup.js';

import request from 'supertest';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

vi.mock(
    '../../../services/malwareScan/malwareScan.service.js',
    () => ({
        malwareScanService: {
            scanFile: vi.fn().mockResolvedValue({
                status: 'clean',
                provider: 'test-scanner',
                scannedAt: new Date(
                    '2026-09-22T18:00:00.000Z',
                ),
                threatName: null,
                errorCode: null,
            }),
        },
    }),
);

import { app } from '../../../app.js';
import {
    ENTITLEMENT_OVERRIDE_SOURCE,
    ENTITLEMENT_OVERRIDE_TARGET,
} from '../../../constants/entitlementOverride.constants.js';
import {
    EntitlementOverride,
} from '../../../modules/entitlementOverride/entitlementOverride.model.js';
import {
    PRODUCT_CATALOG_FEATURE,
} from '../../../modules/productCatalog/productCatalogCapability.registry.js';
import {
    PRODUCT_CATALOG_PERMISSION,
} from '../../../modules/productCatalog/productCatalogPermission.registry.js';
import {
    bearer,
    createWorkspaceMemberFixture,
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';

let ownerContext;

const enableProductFeature = async ({
    context,
    featureKey,
}) => EntitlementOverride.create({
    workspace: context.workspace._id,
    targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
    featureKey,
    featureEnabled: true,
    source: ENTITLEMENT_OVERRIDE_SOURCE.ADMINISTRATIVE,
    startsAt: new Date(Date.now() - 1_000),
    reason: 'Activation test M-002',
    grantedBy: context.owner._id,
});

beforeEach(async () => {
    ownerContext = await createWorkspaceOwnerFixture();

    await Promise.all([
        PRODUCT_CATALOG_FEATURE.REFERENCE_ACCESS,
        PRODUCT_CATALOG_FEATURE.CATALOG_IMPORT,
        PRODUCT_CATALOG_FEATURE.CONTRIBUTION,
    ].map((featureKey) =>
        enableProductFeature({
            context: ownerContext,
            featureKey,
        }),
    ));
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
        expect(
            metadata.body.data.metadata.productCategoryStatuses,
        ).toEqual(expect.arrayContaining([
            expect.objectContaining({ value: 'ACTIVE', label: 'Active' }),
            expect.objectContaining({ value: 'ARCHIVED', label: 'Archivée' }),
        ]));

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

        const summary = await request(app)
            .get(`${basePath()}/summary`)
            .set(headers);

        expect(summary.status).toBe(200);
        expect(summary.body.data.summary).toEqual({
            activeCatalogEntries: 0,
            pendingContributions: 1,
        });

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

    it('refuse l’import lorsque la capability commerciale est absente', async () => {
        const restricted = await createWorkspaceOwnerFixture();

        const response = await request(app)
            .post(
                `/api/workspaces/${restricted.workspace._id.toString()}/products/imports/inspect`,
            )
            .set(bearer(restricted.token))
            .attach(
                'file',
                Buffer.from('Produit\nHaricot blanc', 'utf8'),
                'produits.csv',
            );

        expect(response.status).toBe(403);
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
