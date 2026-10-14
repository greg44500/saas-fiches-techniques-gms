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

        const variant = await request(app)
            .post(pathFor() + '/' + parentId + '/variants')
            .set(bearer(ownerA.token))
            .send({
                name: 'Croissant individuel prêt à cuire pour test',
                conservationType: 'SURGELE',
                referenceUnit: 'UNIT',
                countUnitLabelSingular: 'croissant',
                countUnitLabelPlural: 'croissants',
            });
        expect(variant.status).toBe(201);
        expect(variant.body.data.classification).toBe('PROVISIONAL');
        expect(variant.body.data.variant.id).toBeTruthy();
    });
});
