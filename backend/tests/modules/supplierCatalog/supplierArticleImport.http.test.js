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
import { SUPPLIER_CATALOG_PERMISSION } from '../../../modules/supplierCatalog/supplierCatalogPermission.registry.js';
import { findApplicableSupplierTariff } from '../../../modules/supplierCatalog/supplierPricing.service.js';
import {
    bearer, createWorkspaceMemberFixture, createWorkspaceOwnerFixture,
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
    it('importe un tarif annuel sans créer de catalogue et expose son prix au kilo', async () => {
        await enableImport();
        const file = [
            'Reference;Designation;Prix;Base;Contenant;Nombre;Quantite;Unite',
            'REF2027;Farine test;40.625;carton;Carton;2;5;kg',
        ].join('\n');
        const inspected = await inspect(file);
        expect(inspected.status).toBe(201);
        const proposed = await request(app)
            .post(basePath() + '/imports/' + inspected.body.data.importId + '/preview')
            .set(auth())
            .send({
                supplierId,
                mapping: {
                    supplierReference: 0, designation: 1, priceAmount: 2,
                    priceBasis: 3, containerType: 4, unitCount: 5,
                    quantityPerUnit: 6, unit: 7,
                },
                priceList: {
                    name: 'Prix annuels 2026',
                    validFrom: '2026-01-01', validTo: '2027-12-31',
                    source: 'Liste reçue par courriel',
                    defaultPriceBasis: 'PACKAGE',
                },
            });
        expect(proposed.status).toBe(200);
        expect(proposed.body.data.counts.CREATE).toBe(1);
        expect(proposed.body.data.rows[0].sourcePriceLabel)
            .toContain('40,625');

        const confirmed = await commit(inspected.body.data.importId);
        expect(confirmed.status).toBe(200);
        expect(confirmed.body.data.priced).toBe(1);
        expect(await SupplierCatalogEdition.countDocuments({ supplier: supplierId })).toBe(0);
        expect(await SupplierCatalogLine.countDocuments({ workspace: context.workspace._id })).toBe(0);

        const tariff = await SupplierTariff.findOne({ sourceKind: 'PRICE_LIST' });
        expect(tariff).not.toBeNull();
        expect(tariff.catalogEdition).toBeNull();
        expect(tariff.sourceLabel).toBe('Prix annuels 2026');
        expect(tariff.sourceAmount.toString()).toBe('40.625');

        const listed = await request(app).get(basePath()).set(auth());
        expect(listed.status).toBe(200);
        const article = listed.body.data.articles.find((item) =>
            item.supplierReference === 'REF2027');
        expect(article.packagingLabel).toBe('Carton · 2 × 5 kg');
        expect(article.associationStatus).toBe('PENDING');
        expect(article.supplierTariffStatus).toBe('AVAILABLE');
        expect(article.supplierTariff.packagePriceLabel).toContain('40,625');
        expect(article.supplierTariff.unitPriceLabel).toContain('4,063');
        const reader = await createWorkspaceMemberFixture({
            workspaceId: context.workspace._id,
            actorId: context.owner._id,
            permissions: [SUPPLIER_CATALOG_PERMISSION.ARTICLE_READ],
        });
        const limited = await request(app)
            .get(basePath()).set(bearer(reader.token));
        expect(limited.status).toBe(200);
        expect(limited.body.data.articles[0].supplierTariff).toBeNull();
        expect(limited.body.data.articles[0].supplierTariffStatus).toBe('RESTRICTED');
        const applicable = await findApplicableSupplierTariff({
            workspaceId: context.workspace._id,
            articleId: article.id,
            atDate: new Date('2026-10-13T12:00:00.000Z'),
        });
        expect(applicable.sourceKind).toBe('PRICE_LIST');
        const expired = await findApplicableSupplierTariff({
            workspaceId: context.workspace._id,
            articleId: article.id,
            atDate: new Date('2028-01-01T12:00:00.000Z'),
        });
        expect(expired).toBeNull();
    });

    it('date une liste sans période au moment de la confirmation et sans expiration', async () => {
        await enableImport();
        const inspected = await inspect(
            'Reference;Designation;Prix;Base\nSANS-FIN;Huile;12;carton',
        );
        expect(inspected.status).toBe(201);
        const body = {
            supplierId,
            mapping: {
                supplierReference: 0, designation: 1,
                priceAmount: 2, priceBasis: 3,
            },
            priceList: {
                validityMode: 'FROM_IMPORT',
                defaultPriceBasis: 'PACKAGE',
            },
        };
        const previewed = await request(app)
            .post(basePath() + '/imports/' + inspected.body.data.importId + '/preview')
            .set(auth()).send(body);
        expect(previewed.status).toBe(200);
        expect(previewed.body.data.counts.CREATE).toBe(1);

        const beforeConfirmation = new Date();
        const finished = await commit(inspected.body.data.importId);
        const afterConfirmation = new Date();
        expect(finished.status).toBe(200);
        expect(finished.body.data.priced).toBe(1);

        const tariff = await SupplierTariff.findOne({
            sourceKind: 'PRICE_LIST',
            sourceImportId: inspected.body.data.importId,
        });
        expect(tariff).not.toBeNull();
        expect(tariff.sourceLabel).toMatch(/^Prix importés le \d{2}\/\d{2}\/\d{4}$/);
        expect(tariff.validFrom.getTime()).toBeGreaterThanOrEqual(
            beforeConfirmation.getTime(),
        );
        expect(tariff.validFrom.getTime()).toBeLessThanOrEqual(
            afterConfirmation.getTime(),
        );
        expect(tariff.validTo).toBeNull();
        expect(tariff.catalogEdition).toBeNull();
    });

    it('refuse une date client imposée dans le mode à partir de l’import', async () => {
        await enableImport();
        const inspected = await inspect('Reference;Designation;Prix\nNO-DATE;Pain;12');
        expect(inspected.status).toBe(201);
        const rejected = await request(app)
            .post(basePath() + '/imports/' + inspected.body.data.importId + '/preview')
            .set(auth())
            .send({
                supplierId,
                mapping: { supplierReference: 0, designation: 1, priceAmount: 2 },
                priceList: {
                    validityMode: 'FROM_IMPORT',
                    validFrom: '2025-01-01',
                    defaultPriceBasis: 'PACKAGE',
                },
            });
        expect(rejected.status).toBe(400);
        expect(await SupplierTariff.countDocuments({
            sourceImportId: inspected.body.data.importId,
        })).toBe(0);
    });

    it('refuse les mercuriales dont les périodes se chevauchent', async () => {
        await enableImport();
        const csv = 'Reference;Designation;Prix;Base\nDUPTAR;Pain;10;carton';
        const first = await inspect(csv);
        const body = (validFrom, validTo) => ({
            supplierId,
            mapping: {
                supplierReference: 0, designation: 1,
                priceAmount: 2, priceBasis: 3,
            },
            priceList: {
                name: 'Liste test', validFrom, validTo,
                source: null, defaultPriceBasis: 'PACKAGE',
            },
        });
        expect((await request(app)
            .post(basePath() + '/imports/' + first.body.data.importId + '/preview')
            .set(auth()).send(body('2026-01-01', '2026-12-31'))).status).toBe(200);
        expect((await commit(first.body.data.importId)).status).toBe(200);

        const second = await inspect(csv);
        const proposed = await request(app)
            .post(basePath() + '/imports/' + second.body.data.importId + '/preview')
            .set(auth()).send(body('2026-06-01', '2027-06-01'));
        expect(proposed.status).toBe(200);
        expect(proposed.body.data.counts.INVALID).toBe(1);
        expect((await commit(second.body.data.importId)).status).toBe(409);
        expect(await SupplierTariff.countDocuments({ sourceKind: 'PRICE_LIST' })).toBe(1);
    });

    it('isole les prix privés de deux Workspaces sur un même Article global', async () => {
        const other = await createWorkspaceOwnerFixture();
        await enableImport();
        await enableImport(other);
        const globalSupplier = await createSupplierService({
            scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
            actorId: context.owner._id,
            data: { name: 'Grossiste commun indépendants' },
        });
        const globalArticle = await SupplierArticle.create({
            scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
            workspace: null,
            supplier: globalSupplier.id,
            productVariant: null,
            supplierReference: 'GLOB-PRIX-1',
            normalizedSupplierReference: 'GLOB-PRIX-1',
            supplierDesignation: 'Article commun',
            createdBy: context.owner._id,
            updatedBy: context.owner._id,
        });
        const body = {
            supplierId: globalSupplier.id,
            mapping: {
                supplierReference: 0, designation: 1,
                priceAmount: 2, priceBasis: 3,
            },
            priceList: {
                name: 'Mercuriale privée',
                validFrom: '2026-01-01', validTo: '2026-12-31',
                source: null, defaultPriceBasis: 'PACKAGE',
            },
        };
        for (const [owner, value] of [[context, '10'], [other, '20']]) {
            const inspected = await inspect(
                'Reference;Designation;Prix;Base\nGLOB-PRIX-1;Article commun;'
                    + value + ';carton', owner,
            );
            expect(inspected.status).toBe(201);
            const proposed = await request(app)
                .post(basePath(owner) + '/imports/' + inspected.body.data.importId + '/preview')
                .set(auth(owner)).send(body);
            expect(proposed.status).toBe(200);
            expect(proposed.body.data.counts.SHARED).toBe(1);
            expect((await commit(inspected.body.data.importId, owner)).status).toBe(200);
        }
        const tariffs = await SupplierTariff.find({
            supplierArticle: globalArticle._id, sourceKind: 'PRICE_LIST',
        });
        expect(tariffs).toHaveLength(2);
        expect(new Set(tariffs.map((tariff) => String(tariff.workspace))).size).toBe(2);
        const listed = await request(app).get(basePath(other)).set(auth(other));
        expect(listed.status).toBe(200);
        const shared = listed.body.data.articles.find((article) =>
            article.supplierReference === 'GLOB-PRIX-1');
        expect(shared.supplierTariff.sourceAmount).toBe('20');
    });

    it('corrige une erreur tarifaire en gardant la révision et son motif', async () => {
        await enableImport();
        const imported = await inspect(
            'Reference;Designation;Prix;Base\nCORR-01;Beurre;10.25;carton',
        );
        expect(imported.status).toBe(201);
        const proposal = await request(app)
            .post(basePath() + '/imports/' + imported.body.data.importId + '/preview')
            .set(auth()).send({
                supplierId,
                mapping: {
                    supplierReference: 0, designation: 1,
                    priceAmount: 2, priceBasis: 3,
                },
                priceList: {
                    validityMode: 'FROM_IMPORT',
                    defaultPriceBasis: 'PACKAGE',
                },
            });
        expect(proposal.status).toBe(200);
        expect((await commit(imported.body.data.importId)).status).toBe(200);

        const listed = await request(app).get(basePath()).set(auth());
        const article = listed.body.data.articles.find((item) =>
            item.supplierReference === 'CORR-01');
        expect(article.supplierTariff.sourceAmount).toBe('10.25');
        const url = basePath() + '/' + article.id + '/tariffs/';
        const changed = await request(app)
            .post(url + article.supplierTariff.id + '/correction')
            .set(auth()).send({
                sourceAmount: '12.50',
                sourceBasis: 'PACKAGE',
                reason: 'Erreur de saisie dans la liste initiale',
            });
        expect(changed.status).toBe(200);
        expect(changed.body.data.tariff.revision).toBe(2);
        expect(changed.body.data.tariff.correctionReason)
            .toBe('Erreur de saisie dans la liste initiale');

        const oldTariff = await SupplierTariff.findById(article.supplierTariff.id);
        expect(oldTariff.isCurrent).toBe(false);
        expect(oldTariff.sourceAmount.toString()).toBe('10.25');
        const updatedList = await request(app).get(basePath()).set(auth());
        const latest = updatedList.body.data.articles.find((item) =>
            item.supplierReference === 'CORR-01');
        expect(Number(latest.supplierTariff.sourceAmount)).toBe(12.5);
        const history = await request(app).get(url).set(auth());
        expect(history.status).toBe(200);
        expect(history.body.data.tariffs).toHaveLength(2);
        expect(history.body.data.tariffs.map((entry) => entry.isCurrent).sort())
            .toEqual([false, true]);
        expect(history.body.data.tariffs.some((entry) => entry.correctionReason
            === 'Erreur de saisie dans la liste initiale')).toBe(true);

        const stale = await request(app)
            .post(url + article.supplierTariff.id + '/correction')
            .set(auth()).send({
                sourceAmount: '15',
                sourceBasis: 'PACKAGE',
                reason: 'Nouvelle tentative sur ancienne révision',
            });
        expect(stale.status).toBe(409);
        expect(await SupplierTariff.countDocuments({
            sourceImportId: imported.body.data.importId,
        })).toBe(2);

        const nextCorrection = await request(app)
            .post(url + changed.body.data.tariff.id + '/correction')
            .set(auth()).send({
                sourceAmount: '13.75',
                sourceBasis: 'PACKAGE',
            });
        expect(nextCorrection.status).toBe(200);
        expect(nextCorrection.body.data.tariff.revision).toBe(3);
        expect(nextCorrection.body.data.tariff.correctionReason).toBeNull();
        expect(nextCorrection.body.data.tariff.replacesTariffId)
            .toBe(changed.body.data.tariff.id);
        const revisions = await SupplierTariff.find({
            sourceImportId: imported.body.data.importId,
        }).sort({ revision: 1 });
        expect(revisions.map((item) => item.revision)).toEqual([1, 2, 3]);
        expect(revisions.map((item) => item.isCurrent)).toEqual([false, false, true]);
        expect(revisions.map((item) => item.sourceAmount.toString()))
            .toEqual(['10.25', '12.50', '13.75']);
    });

    it('protège la correction et la lecture tarifaire entre Workspaces et rôles', async () => {
        await enableImport();
        const imported = await inspect(
            'Reference;Designation;Prix;Base\nPRIVE-01;Lait;6.5;carton',
        );
        expect(imported.status).toBe(201);
        expect((await request(app)
            .post(basePath() + '/imports/' + imported.body.data.importId + '/preview')
            .set(auth()).send({
                supplierId,
                mapping: {
                    supplierReference: 0, designation: 1,
                    priceAmount: 2, priceBasis: 3,
                },
                priceList: {
                    validityMode: 'FROM_IMPORT',
                    defaultPriceBasis: 'PACKAGE',
                },
            })).status).toBe(200);
        expect((await commit(imported.body.data.importId)).status).toBe(200);

        const listed = await request(app).get(basePath()).set(auth());
        const article = listed.body.data.articles.find((item) =>
            item.supplierReference === 'PRIVE-01');
        const relative = '/' + article.id + '/tariffs/';
        const readOnly = await createWorkspaceMemberFixture({
            workspaceId: context.workspace._id,
            actorId: context.owner._id,
            permissions: [SUPPLIER_CATALOG_PERMISSION.ARTICLE_READ],
        });
        const denied = await request(app)
            .post(basePath() + relative + article.supplierTariff.id + '/correction')
            .set(bearer(readOnly.token)).send({
                sourceAmount: '7',
                sourceBasis: 'PACKAGE',
                reason: 'Correction non autorisée',
            });
        expect(denied.status).toBe(403);
        expect((await request(app).get(basePath() + relative)
            .set(bearer(readOnly.token))).status).toBe(403);

        const other = await createWorkspaceOwnerFixture();
        expect((await request(app)
            .get(basePath(other) + relative).set(auth(other))).status).toBe(404);
        expect((await request(app)
            .post(basePath(other) + relative + article.supplierTariff.id + '/correction')
            .set(auth(other)).send({
                sourceAmount: '8',
                sourceBasis: 'PACKAGE',
                reason: 'Tentative autre espace de travail',
            })).status).toBe(404);
        expect(await SupplierTariff.countDocuments({
            sourceImportId: imported.body.data.importId,
        })).toBe(1);
    });

    it('refuse l’inspection du référentiel global sans autorité Application Global', async () => {
        const response = await request(app)
            .post('/api/supplier-reference/articles/imports/inspect')
            .set(auth())
            .attach(
                'file',
                Buffer.from('Reference;Designation\nGLOBAL1;Pain', 'utf8'),
                'articles.csv',
            );
        expect(response.status).toBe(403);
    });

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
        const listed = await request(app)
            .get(basePath()).set(auth());
        expect(listed.status).toBe(200);
        expect(listed.body.data.articles[0].associationStatus).toBe('PENDING');
        expect(article.workspace.toString()).toBe(context.workspace.id);
        expect(await SupplierCatalogEdition.countDocuments({ supplier: supplierId })).toBe(0);
        expect(await SupplierCatalogLine.countDocuments({ workspace: context.workspace.id })).toBe(0);
        expect(await SupplierTariff.countDocuments({ workspace: context.workspace.id })).toBe(0);
        expect(await SupplierArticleImportSession.countDocuments({ _id: id, status: 'COMMITTED' })).toBe(1);
        expect((await commit(id)).status).toBe(404);
    });

    it('signale une référence trop longue avant écriture', async () => {
        await enableImport();
        const inspected = await inspect(
            'Reference;Designation;Marque\n'
            + 'X'.repeat(121) + ';Pain;Bridor',
        );
        const proposed = await preview(inspected.body.data.importId);
        expect(proposed.body.data.counts.INVALID).toBe(1);
        expect((await commit(inspected.body.data.importId)).status).toBe(409);
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
