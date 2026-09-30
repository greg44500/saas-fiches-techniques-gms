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
    createActiveProductReference,
} from '../../helpers/productCatalogTest.fixtures.js';
import {
    bearer,
    createWorkspaceMemberFixture,
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';
import {
    SUPPLIER_CATALOG_PERMISSION,
} from '../../../modules/supplierCatalog/supplierCatalogPermission.registry.js';
import {
    SupplierArticle,
} from '../../../modules/supplierCatalog/supplier.model.js';
import {
    createSupplier,
} from '../../../modules/supplierCatalog/supplierReference.service.js';
import {
    SUPPLIER_SCOPE,
} from '../../../modules/supplierCatalog/supplierCatalog.registry.js';

let ownerA;
let ownerB;
let productReference;

beforeEach(async () => {
    ownerA = await createWorkspaceOwnerFixture();
    ownerB = await createWorkspaceOwnerFixture();
    productReference = await createActiveProductReference({
        actorId: ownerA.owner._id,
        name: 'Carotte fournisseur test',
    });
});

const supplierPath = (context) =>
    '/api/workspaces/' + context.workspace._id.toString() + '/suppliers';

const articlePath = (context) =>
    '/api/workspaces/' + context.workspace._id.toString() + '/supplier-articles';

describe('M-003 supplier/article HTTP contract', () => {
    it('isole un Fournisseur privé entre Workspaces', async () => {
        const created = await request(app)
            .post(supplierPath(ownerA))
            .set(bearer(ownerA.token))
            .send({ name: 'Fournisseur privé A' });

        expect(created.status).toBe(201);

        const visibleA = await request(app)
            .get(supplierPath(ownerA))
            .set(bearer(ownerA.token));
        const visibleB = await request(app)
            .get(supplierPath(ownerB))
            .set(bearer(ownerB.token));

        expect(visibleA.status).toBe(200);
        expect(
            visibleA.body.data.suppliers.map(({ name }) => name),
        ).toContain('Fournisseur privé A');
        expect(
            visibleB.body.data.suppliers.map(({ name }) => name),
        ).not.toContain('Fournisseur privé A');
    });

    it('associe plusieurs catégories Produit existantes à un Fournisseur', async () => {
        const categoryId =
            productReference.category._id.toString();

        const metadata = await request(app)
            .get(supplierPath(ownerA) + '/metadata')
            .set(bearer(ownerA.token));

        expect(metadata.status).toBe(200);
        expect(metadata.body.data.metadata.categories).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: categoryId,
                    name: 'Légumes',
                }),
            ]),
        );

        const created = await request(app)
            .post(supplierPath(ownerA))
            .set(bearer(ownerA.token))
            .send({
                name: 'Fournisseur catégorisé',
                categoryIds: [categoryId],
            });

        expect(created.status).toBe(201);
        expect(created.body.data.supplier.categories).toEqual([
            expect.objectContaining({
                id: categoryId,
                name: 'Légumes',
            }),
        ]);

        const visible = await request(app)
            .get(supplierPath(ownerA))
            .set(bearer(ownerA.token));

        expect(visible.status).toBe(200);
        expect(visible.body.data.suppliers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'Fournisseur catégorisé',
                    categories: [
                        expect.objectContaining({
                            id: categoryId,
                            name: 'Légumes',
                        }),
                    ],
                }),
            ]),
        );

        const updated = await request(app)
            .patch(
                supplierPath(ownerA)
                + '/'
                + created.body.data.supplier.id,
            )
            .set(bearer(ownerA.token))
            .send({ categoryIds: [] });

        expect(updated.status).toBe(200);
        expect(updated.body.data.supplier.categories).toEqual([]);
    });

    it('rend un Fournisseur global visible dans plusieurs Workspaces', async () => {
        const globalSupplier = await createSupplier({
            scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
            actorId: ownerA.owner._id,
            data: { name: 'Fournisseur partagé' },
        });

        const [visibleA, visibleB] = await Promise.all([
            request(app)
                .get(supplierPath(ownerA))
                .set(bearer(ownerA.token)),
            request(app)
                .get(supplierPath(ownerB))
                .set(bearer(ownerB.token)),
        ]);

        for (const response of [visibleA, visibleB]) {
            expect(response.status).toBe(200);
            expect(response.body.data.suppliers).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: globalSupplier.id,
                        scope: 'GLOBAL_SHARED',
                    }),
                ]),
            );
        }
    });

    it('liste actifs et archivés avec le filtre Fournisseurs ALL', async () => {
        const created = await request(app)
            .post(supplierPath(ownerA))
            .set(bearer(ownerA.token))
            .send({ name: 'Fournisseur archivé visible' });

        expect(created.status).toBe(201);

        const archived = await request(app)
            .patch(
                supplierPath(ownerA)
                + '/'
                + created.body.data.supplier.id
                + '/status',
            )
            .set(bearer(ownerA.token))
            .send({ status: 'ARCHIVED' });

        expect(archived.status).toBe(200);

        const activeOnly = await request(app)
            .get(supplierPath(ownerA))
            .set(bearer(ownerA.token));

        expect(
            activeOnly.body.data.suppliers
                .map(({ name }) => name),
        ).not.toContain('Fournisseur archivé visible');

        const allStatuses = await request(app)
            .get(supplierPath(ownerA) + '?status=ALL')
            .set(bearer(ownerA.token));

        expect(allStatuses.status).toBe(200);
        expect(allStatuses.body.data.suppliers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'Fournisseur archivé visible',
                    status: 'ARCHIVED',
                }),
            ]),
        );
    });

    it('applique le RBAC Workspace aux écritures Fournisseur', async () => {
        const member = await createWorkspaceMemberFixture({
            workspaceId: ownerA.workspace._id,
            actorId: ownerA.owner._id,
            permissions: [
                SUPPLIER_CATALOG_PERMISSION.SUPPLIER_READ,
            ],
        });

        const response = await request(app)
            .post(supplierPath(ownerA))
            .set(bearer(member.token))
            .send({ name: 'Interdit' });

        expect(response.status).toBe(403);
    });

    it('applique positivement un rôle personnalisé M-003', async () => {
        const member = await createWorkspaceMemberFixture({
            workspaceId: ownerA.workspace._id,
            actorId: ownerA.owner._id,
            permissions: [
                SUPPLIER_CATALOG_PERMISSION.SUPPLIER_READ,
                SUPPLIER_CATALOG_PERMISSION.SUPPLIER_MANAGE,
            ],
        });

        const response = await request(app)
            .post(supplierPath(ownerA))
            .set(bearer(member.token))
            .send({ name: 'Fournisseur rôle personnalisé' });

        expect(response.status).toBe(201);
        expect(response.body.data.supplier.name)
            .toBe('Fournisseur rôle personnalisé');
    });

    it('filtre les Articles par Produit sans requête par Référence', async () => {
        const secondProduct =
            await createActiveProductReference({
                actorId: ownerA.owner._id,
                name: 'Poire fournisseur test',
            });

        const supplier = await request(app)
            .post(supplierPath(ownerA))
            .set(bearer(ownerA.token))
            .send({ name: 'Grossiste filtrage Produit' });

        for (const [variant, supplierReference] of [
            [productReference.variant, 'CAR-001'],
            [secondProduct.variant, 'POI-001'],
        ]) {
            await request(app)
                .post(articlePath(ownerA))
                .set(bearer(ownerA.token))
                .send({
                    supplierId: supplier.body.data.supplier.id,
                    productVariantId: variant._id.toString(),
                    supplierReference,
                })
                .expect(201);
        }

        const response = await request(app)
            .get(articlePath(ownerA))
            .query({
                productId: productReference.product._id.toString(),
                limit: 100,
            })
            .set(bearer(ownerA.token));

        expect(response.status).toBe(200);
        expect(
            response.body.data.articles.map(
                ({ supplierReference }) => supplierReference,
            ),
        ).toEqual(['CAR-001']);
    });

    it('refuse un doublon Article variant seulement par casse et espaces', async () => {
        const supplier = await request(app)
            .post(supplierPath(ownerA))
            .set(bearer(ownerA.token))
            .send({ name: 'Grossiste articles' });

        const baseBody = {
            supplierId: supplier.body.data.supplier.id,
            productVariantId: productReference.variant._id.toString(),
            supplierDesignation: 'Carotte sac',
        };

        const first = await request(app)
            .post(articlePath(ownerA))
            .set(bearer(ownerA.token))
            .send({
                ...baseBody,
                supplierReference: ' sys - 123 ',
            });

        const duplicate = await request(app)
            .post(articlePath(ownerA))
            .set(bearer(ownerA.token))
            .send({
                ...baseBody,
                supplierReference: 'SYS-123',
            });

        expect(first.status).toBe(201);
        expect(duplicate.status).toBe(409);
    });

    it('archive l ancien Article et trace replacedBy lors d un remplacement', async () => {
        const supplier = await request(app)
            .post(supplierPath(ownerA))
            .set(bearer(ownerA.token))
            .send({ name: 'Grossiste remplacement' });

        const created = await request(app)
            .post(articlePath(ownerA))
            .set(bearer(ownerA.token))
            .send({
                supplierId: supplier.body.data.supplier.id,
                productVariantId:
                    productReference.variant._id.toString(),
                supplierReference: 'OLD-001',
            });

        const replaced = await request(app)
            .post(
                articlePath(ownerA)
                + '/'
                + created.body.data.article.id
                + '/replacement',
            )
            .set(bearer(ownerA.token))
            .send({ supplierReference: 'NEW-001' });

        expect(replaced.status).toBe(201);

        const previous = await SupplierArticle.findById(
            created.body.data.article.id,
        ).lean();

        expect(previous.status).toBe('ARCHIVED');
        expect(previous.replacedBy.toString())
            .toBe(replaced.body.data.replacement.id);
    });

    it('ne donne pas l autorité globale à un Workspace Owner', async () => {
        const response = await request(app)
            .get('/api/supplier-reference/suppliers')
            .set(bearer(ownerA.token));

        expect(response.status).toBe(403);
    });
});
