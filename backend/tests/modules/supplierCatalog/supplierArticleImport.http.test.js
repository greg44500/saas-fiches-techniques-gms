import '../../setup.js';

import request from 'supertest';
import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/malwareScan/malwareScan.service.js', () => ({
    malwareScanService: {
        scanFile: vi.fn().mockResolvedValue({
            status: 'clean',
            provider: 'test-scanner',
            scannedAt: new Date('2026-10-09T12:00:00.000Z'),
            threatName: null,
            errorCode: null,
        }),
    },
}));

import { app } from '../../../app.js';
import {
    ENTITLEMENT_OVERRIDE_SOURCE,
    ENTITLEMENT_OVERRIDE_TARGET,
} from '../../../constants/entitlementOverride.constants.js';
import { EntitlementOverride } from '../../../modules/entitlementOverride/entitlementOverride.model.js';
import { SupplierArticle } from '../../../modules/supplierCatalog/supplier.model.js';
import {
    SupplierCatalogEdition, SupplierCatalogLine, SupplierTariff,
} from '../../../modules/supplierCatalog/supplierCatalog.model.js';
import { SUPPLIER_CATALOG_FEATURE } from '../../../modules/supplierCatalog/supplierCatalogCapability.registry.js';
import { SupplierArticleImportSession } from '../../../modules/supplierCatalog/supplierArticleImport.model.js';
import { createSupplier as createSupplierService } from '../../../modules/supplierCatalog/supplierReference.service.js';
import { SUPPLIER_SCOPE } from '../../../modules/supplierCatalog/supplierCatalog.registry.js';
import {
    bearer, createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';

let context;
let supplierId;
const basePath = (owner = context) =>
    '/api/workspaces/' + owner.workspace._id.toString() + '/supplier-articles';
const auth = (owner = context) => bearer(owner.token);

const enableImport = async (owner = context) => EntitlementOverride.create({
    workspace: owner.workspace._id,
    targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
    featureKey: SUPPLIER_CATALOG_FEATURE.CATALOG_IMPORT,
    featureEnabled: true,
    source: ENTITLEMENT_OVERRIDE_SOURCE.ADMINISTRATIVE,
    startsAt: new Date(Date.now() - 1000),
    reason: 'Import Articles M-003',
    grantedBy: owner.owner._id,
});

const inspect = (csv, owner = context) => request(app)
    .post(basePath(owner) + '/imports/inspect')
    .set(auth(owner))
    .attach('file', Buffer.from(csv), 'articles.csv');

const preview = (id, supplier = supplierId, owner = context) => request(app)
    .post(basePath(owner) + '/imports/' + id + '/preview')
    .set(auth(owner))
    .send({
        supplierId: supplier,
        mapping: { supplierReference: 0, designation: 1, brand: 2 },
    });

const commit = (id, owner = context) => request(app)
    .post(basePath(owner) + '/imports/' + id + '/commit')
    .set(auth(owner));

beforeEach(async () => {
    context = await createWorkspaceOwnerFixture();
    const response = await request(app)
        .post('/api/workspaces/' + context.workspace._id.toString() + '/suppliers')
        .set(auth())
        .send({ name: 'Fournisseur liste M003' });
    expect(response.status).toBe(201);
    supplierId = response.body.data.supplier.id;
});

describe('M-003 — import autonome des Articles fournisseur', () => {
    it('exige la capability commerciale pour l’inspection Workspace', async () => {
        const result = await inspect('Reference;Designation;Marque\nREF1;Pain;B');
        expect(result.status).toBe(403);
    });

    it('crée sans catalogue, ignore une référence absente et empêche la double confirmation', async () => {
        await enableImport();
        const inspected = await inspect(
            'Reference;Designation;Marque\nREF001;Pain pur beurre;Bridor\n;Sans référence;Bridor',
        );
        expect(inspected.status).toBe(201);

        const id = inspected.body.data.importId;
        const proposed = await preview(id);
        expect(proposed.status).toBe(200);
        expect(proposed.body.data.counts).toMatchObject({ CREATE: 1, SKIPPED: 1 });

        const result = await commit(id);
        expect(result.status).toBe(200);
        expect(result.body.data.created).toBe(1);
        expect(result.body.data.skipped).toBe(1);

        const article = await SupplierArticle.findOne({
            supplier: new mongoose.Types.ObjectId(supplierId),
        });
        expect(article).not.toBeNull();
        expect(article.productVariant).toBeNull();
        expect(article.supplierReference).toBe('REF001');
        expect(article.scope).toBe('WORKSPACE_PRIVATE');
        expect(article.workspace.toString()).toBe(context.workspace.id);
        expect(await SupplierCatalogEdition.countDocuments({ supplier: supplierId })).toBe(0);
        expect(await SupplierCatalogLine.countDocuments({ workspace: context.workspace.id })).toBe(0);
        expect(await SupplierTariff.countDocuments({ workspace: context.workspace.id })).toBe(0);
        expect(await SupplierArticleImportSession.countDocuments({ _id: id, status: 'COMMITTED' })).toBe(1);
        expect((await commit(id)).status).toBe(404);
    });

    it('met à jour la désignation au réimport sans créer un doublon', async () => {
        await enableImport();
        const initial = await inspect('Reference;Designation;Marque\nREF001;Pain A;Bridor');
        expect((await preview(initial.body.data.importId)).body.data.counts.CREATE).toBe(1);
        expect((await commit(initial.body.data.importId)).status).toBe(200);

        const revised = await inspect('Reference;Designation;Marque\nREF001;Pain B;Bridor');
        const proposed = await preview(revised.body.data.importId);
        expect(proposed.body.data.counts.UPDATE).toBe(1);
        const finished = await commit(revised.body.data.importId);
        expect(finished.status).toBe(200);
        expect(finished.body.data.updated).toBe(1);
        expect(await SupplierArticle.countDocuments({ supplier: supplierId })).toBe(1);
        expect((await SupplierArticle.findOne({ supplier: supplierId })).supplierDesignation)
            .toBe('Pain B');
    });

    it('bloque les références dupliquées dans le fichier', async () => {
        await enableImport();
        const inspected = await inspect(
            'Reference;Designation;Marque\nREF001;Pain A;Bridor\nREF001;Pain B;Bridor',
        );
        const proposed = await preview(inspected.body.data.importId);
        expect(proposed.body.data.counts.INVALID).toBe(1);
        expect((await commit(inspected.body.data.importId)).status).toBe(409);
        expect(await SupplierArticle.countDocuments({ supplier: supplierId })).toBe(0);
    });

    it('interdit de prévisualiser un import privé depuis un autre Workspace', async () => {
        await enableImport();
        const inspected = await inspect('Reference;Designation;Marque\nREF001;Pain;Bridor');
        const other = await createWorkspaceOwnerFixture();
        await enableImport(other);
        const response = await preview(inspected.body.data.importId, supplierId, other);
        expect(response.status).toBe(404);
    });

    it('ne duplique ni ne modifie un Article global dans un Workspace', async () => {
        await enableImport();
        const supplier = await createSupplierService({
            scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
            actorId: context.owner._id,
            data: { name: 'Fournisseur global import liste' },
        });
        const article = await SupplierArticle.create({
            scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
            workspace: null,
            supplier: supplier.id,
            productVariant: null,
            supplierReference: 'GLOBAL-1',
            normalizedSupplierReference: 'GLOBAL-1',
            supplierDesignation: 'Référence globale',
            createdBy: context.owner._id,
            updatedBy: context.owner._id,
        });
        const inspected = await inspect(
            'Reference;Designation;Marque\nGLOBAL-1;Autre nom;Bridor',
        );
        const proposed = await preview(inspected.body.data.importId, supplier.id);
        expect(proposed.body.data.counts.SHARED).toBe(1);
        expect((await commit(inspected.body.data.importId)).status).toBe(200);
        expect((await SupplierArticle.findById(article._id)).supplierDesignation)
            .toBe('Référence globale');
        expect(await SupplierArticle.countDocuments({
            supplier: supplier.id, workspace: context.workspace._id,
        })).toBe(0);
    });
});
