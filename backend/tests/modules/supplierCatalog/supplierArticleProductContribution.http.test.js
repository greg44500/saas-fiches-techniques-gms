import '../../setup.js';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { app } from '../../../app.js';
import {
    ENTITLEMENT_OVERRIDE_SOURCE,
    ENTITLEMENT_OVERRIDE_TARGET,
} from '../../../constants/entitlementOverride.constants.js';
import { EntitlementOverride } from '../../../modules/entitlementOverride/entitlementOverride.model.js';
import { PRODUCT_CATALOG_FEATURE } from '../../../modules/productCatalog/productCatalogCapability.registry.js';
import { SupplierArticle } from '../../../modules/supplierCatalog/supplier.model.js';
import { SUPPLIER_CATALOG_FEATURE } from '../../../modules/supplierCatalog/supplierCatalogCapability.registry.js';
import { SUPPLIER_SCOPE } from '../../../modules/supplierCatalog/supplierCatalog.registry.js';
import { createSupplier } from '../../../modules/supplierCatalog/supplierReference.service.js';
import {
    bearer, createWorkspaceMemberFixture, createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';
import { SUPPLIER_CATALOG_PERMISSION } from '../../../modules/supplierCatalog/supplierCatalogPermission.registry.js';
import { listProductSearch } from '../../../modules/productCatalog/productCatalog.service.js';
import { createActiveProductReference } from '../../helpers/productCatalogTest.fixtures.js';

let ownerA;
let ownerB;
let article;

const pathFor = (ctx = ownerA, articleId = article._id.toString()) =>
    '/api/workspaces/' + ctx.workspace._id.toString()
    + '/supplier-articles/' + articleId + '/product-contributions';

const feature = (context, key, enabled) => EntitlementOverride.create({
    workspace: context.workspace._id,
    targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
    featureKey: key,
    featureEnabled: enabled,
    source: ENTITLEMENT_OVERRIDE_SOURCE.ADMINISTRATIVE,
    startsAt: new Date(Date.now() - 1000),
    reason: 'Contrôle contribution Article M-003',
    grantedBy: context.owner._id,
});

const newProduct = {
    name: 'Croissant individuel PAI pour test',
    categoryId: null,
    forceCreate: false,
    reviewedCandidateIds: [],
    variant: {
        name: 'Croissant individuel PAI pour test',
        conservationType: 'SURGELE',
        referenceUnit: 'UNIT',
        countUnitLabelSingular: 'croissant',
        countUnitLabelPlural: 'croissants',
    },
};

beforeEach(async () => {
    ownerA = await createWorkspaceOwnerFixture();
    ownerB = await createWorkspaceOwnerFixture();
    const supplier = await createSupplier({
        scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
        workspaceId: ownerA.workspace._id,
        actorId: ownerA.owner._id,
        data: { name: 'BRIDOR parcours contribution' },
    });
    article = await SupplierArticle.create({
        scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
        workspace: ownerA.workspace._id,
        supplier: supplier.id,
        supplierReference: '43279',
        normalizedSupplierReference: '43279',
        supplierDesignation: 'Croissant 120 g',
        provenance: 'Import liste Articles fournisseur',
        createdBy: ownerA.owner._id,
        updatedBy: ownerA.owner._id,
    });
});

describe('M-002/M-003 contribution Produit depuis un Article importé', () => {

    it('autorise la recherche avant création avec import M-003, sans capability Produit', async () => {
        await feature(ownerA, SUPPLIER_CATALOG_FEATURE.CATALOG_IMPORT, true);
        await feature(ownerA, PRODUCT_CATALOG_FEATURE.REFERENCE_ACCESS, false);

        const reference = await createActiveProductReference({
            actorId: ownerA.owner._id,
            name: 'Œufs pasteurisés création fournisseur',
        });
        const base = '/api/workspaces/' + ownerA.workspace._id.toString();
        // La recherche M-002 générale reste protégée par son entitlement.
        await request(app)
            .get(base + '/products/search')
            .query({ scope: 'REFERENCE', q: 'pasteurisés', page: 1, limit: 6 })
            .set(bearer(ownerA.token))
            .expect(403);

        const metadata = await request(app)
            .get(base + '/supplier-articles/product-contributions/metadata')
            .set(bearer(ownerA.token))
            .expect(200);
        expect(metadata.body.data.metadata.referenceUnits).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ value: 'UNIT' }),
            ]),
        );

        const search = await request(app)
            .get(base + '/supplier-articles/product-contributions/search')
            .query({ scope: 'REFERENCE', q: 'pasteurisés', page: 1, limit: 6 })
            .set(bearer(ownerA.token))
            .expect(200);
        expect(search.body.data.results).toEqual(expect.arrayContaining([
            expect.objectContaining({
                variant: expect.objectContaining({
                    id: reference.variant._id.toString(),
                }),
            }),
        ]));
    });

    it('refuse la recherche de pré-création sans capability d’import M-003', async () => {
        await feature(ownerA, SUPPLIER_CATALOG_FEATURE.CATALOG_IMPORT, false);
        const base = '/api/workspaces/' + ownerA.workspace._id.toString()
            + '/supplier-articles/product-contributions';

        await request(app)
            .get(base + '/metadata')
            .set(bearer(ownerA.token))
            .expect(403);
        await request(app)
            .get(base + '/search')
            .query({ scope: 'REFERENCE', q: 'Croissant' })
            .set(bearer(ownerA.token))
            .expect(403);
    });

    it('refuse la recherche avant création sans les permissions M-003 nécessaires', async () => {
        await feature(ownerA, SUPPLIER_CATALOG_FEATURE.CATALOG_IMPORT, true);
        const member = await createWorkspaceMemberFixture({
            workspaceId: ownerA.workspace._id,
            actorId: ownerA.owner._id,
            permissions: [SUPPLIER_CATALOG_PERMISSION.ARTICLE_READ],
        });
        const base = '/api/workspaces/' + ownerA.workspace._id.toString()
            + '/supplier-articles/product-contributions';
        await request(app)
            .get(base + '/metadata')
            .set(bearer(member.token))
            .expect(403);
        await request(app)
            .get(base + '/search')
            .query({ scope: 'REFERENCE', q: 'Croissant' })
            .set(bearer(member.token))
            .expect(403);
    });

    it('n’expose pas les Références provisoires d’un autre Workspace en pré-création', async () => {
        await feature(ownerA, SUPPLIER_CATALOG_FEATURE.CATALOG_IMPORT, true);
        await feature(ownerB, SUPPLIER_CATALOG_FEATURE.CATALOG_IMPORT, true);
        const created = await request(app)
            .post(pathFor())
            .set(bearer(ownerA.token))
            .send(newProduct)
            .expect(201);
        const privateVariantId = created.body.data.provisionalReference.variant.id;

        const searchPath = (workspace) =>
            '/api/workspaces/' + workspace._id.toString()
            + '/supplier-articles/product-contributions/search';
        const query = { scope: 'REFERENCE', q: 'Croissant individuel PAI pour test' };
        const own = await request(app)
            .get(searchPath(ownerA.workspace))
            .query(query)
            .set(bearer(ownerA.token))
            .expect(200);
        expect(own.body.data.results.some(
            ({ variant }) => variant?.id === privateVariantId,
        )).toBe(true);

        const other = await request(app)
            .get(searchPath(ownerB.workspace))
            .query(query)
            .set(bearer(ownerB.token))
            .expect(200);
        expect(other.body.data.results.some(
            ({ variant }) => variant?.id === privateVariantId,
        )).toBe(false);
    });

    it('interdit la création sans capability import fournisseur', async () => {
        await feature(ownerA, SUPPLIER_CATALOG_FEATURE.CATALOG_IMPORT, false);
        const response = await request(app)
            .post(pathFor())
            .set(bearer(ownerA.token))
            .send(newProduct);
        expect(response.status).toBe(403);
    });

    it('refuse un membre sans autorisation RBAC de gestion des Articles', async () => {
        await feature(ownerA, SUPPLIER_CATALOG_FEATURE.CATALOG_IMPORT, true);
        const member = await createWorkspaceMemberFixture({
            workspaceId: ownerA.workspace._id,
            actorId: ownerA.owner._id,
            permissions: [SUPPLIER_CATALOG_PERMISSION.ARTICLE_READ],
        });
        const response = await request(app)
            .post(pathFor())
            .set(bearer(member.token))
            .send(newProduct);
        expect(response.status).toBe(403);
    });

    it('refuse la création sur un Article archivé', async () => {
        await feature(ownerA, SUPPLIER_CATALOG_FEATURE.CATALOG_IMPORT, true);
        article.status = 'ARCHIVED';
        await article.save();
        const response = await request(app)
            .post(pathFor())
            .set(bearer(ownerA.token))
            .send(newProduct);
        expect(response.status).toBe(404);
    });

    it('isole le contexte Article : un autre Workspace ne peut pas contribuer', async () => {
        await feature(ownerB, SUPPLIER_CATALOG_FEATURE.CATALOG_IMPORT, true);
        const response = await request(app)
            .post(pathFor(ownerB))
            .set(bearer(ownerB.token))
            .send(newProduct);
        expect(response.status).toBe(404);
    });

    it('crée une Référence provisoire et autorise son association sans product_contribution', async () => {
        await feature(ownerA, SUPPLIER_CATALOG_FEATURE.CATALOG_IMPORT, true);
        await feature(ownerA, PRODUCT_CATALOG_FEATURE.CONTRIBUTION, false);

        const duplicate = await request(app)
            .post(pathFor() + '/duplicate-check')
            .set(bearer(ownerA.token))
            .send({ name: newProduct.name });
        expect(duplicate.status).toBe(200);

        const created = await request(app)
            .post(pathFor())
            .set(bearer(ownerA.token))
            .send(newProduct);
        expect(created.status).toBe(201);
        expect(created.body.data.classification).toBe('PROVISIONAL');
        const variantId = created.body.data.provisionalReference.variant.id;

        const associate = await request(app)
            .patch('/api/workspaces/' + ownerA.workspace._id.toString()
                + '/supplier-articles/' + article._id.toString())
            .set(bearer(ownerA.token))
            .send({ productVariantId: variantId });
        expect(associate.status).toBe(200);
        expect(associate.body.data.article.productVariant.id).toBe(variantId);

        const other = await listProductSearch({
            workspaceId: ownerB.workspace._id,
            scope: 'REFERENCE',
            q: 'Croissant individuel',
        });
        expect(other.results.some(
            ({ variant }) => variant?.id === variantId,
        )).toBe(false);
    });

    it('crée une Référence sous un Produit parent existant', async () => {
        await feature(ownerA, SUPPLIER_CATALOG_FEATURE.CATALOG_IMPORT, true);
        const created = await request(app)
            .post(pathFor())
            .set(bearer(ownerA.token))
            .send(newProduct);
        expect(created.status).toBe(201);
        const parentId = created.body.data.provisionalReference.id;

        const url = pathFor() + '/' + parentId + '/variants';
        const payload = {
            name: 'Croissant individuel prêt à cuire pour test',
            conservationType: 'SURGELE',
            referenceUnit: 'UNIT',
            countUnitLabelSingular: 'croissant',
            countUnitLabelPlural: 'croissants',
        };
        let variant = await request(app)
            .post(url)
            .set(bearer(ownerA.token))
            .send(payload);
        if (variant.body.data?.classification === 'USER_CONFIRMATION_REQUIRED') {
            variant = await request(app)
                .post(url)
                .set(bearer(ownerA.token))
                .send({
                    ...payload,
                    forceCreate: true,
                    reviewedCandidateIds: variant.body.data.candidates.map(
                        ({ id }) => id,
                    ),
                });
        }
        expect(variant.status).toBe(201);
        expect(variant.body.data.classification).toBe('PROVISIONAL');
        expect(variant.body.data.variant.id).toBeTruthy();
    });
});
