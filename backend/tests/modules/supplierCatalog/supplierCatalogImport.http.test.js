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
                scannedAt:
                    new Date(
                        '2026-09-27T18:00:00.000Z',
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
    SUPPLIER_CATALOG_FEATURE,
} from '../../../modules/supplierCatalog/supplierCatalogCapability.registry.js';
import {
    SupplierCatalogEdition,
    SupplierCatalogImportSession,
    SupplierCatalogLine,
    SupplierTariff,
} from '../../../modules/supplierCatalog/supplierCatalog.model.js';
import {
    SupplierArticle,
} from '../../../modules/supplierCatalog/supplier.model.js';
import {
    createSupplier as createSupplierService,
    createSupplierArticle,
} from '../../../modules/supplierCatalog/supplierReference.service.js';
import {
    SUPPLIER_SCOPE,
} from '../../../modules/supplierCatalog/supplierCatalog.registry.js';
import {
    createActiveProductReference,
} from '../../helpers/productCatalogTest.fixtures.js';
import {
    bearer,
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';
import mongoose from 'mongoose';

let ownerContext;
let productReference;
let supplierId;

const basePath = () =>
    '/api/workspaces/'
    + ownerContext.workspace._id.toString()
    + '/supplier-catalogs';

const enableImportFeature = async () =>
    EntitlementOverride.create({
        workspace:
            ownerContext.workspace._id,
        targetType:
            ENTITLEMENT_OVERRIDE_TARGET
                .FEATURE,
        featureKey:
            SUPPLIER_CATALOG_FEATURE
                .CATALOG_IMPORT,
        featureEnabled: true,
        source:
            ENTITLEMENT_OVERRIDE_SOURCE
                .ADMINISTRATIVE,
        startsAt:
            new Date(Date.now() - 1000),
        reason:
            'Activation test M-003',
        grantedBy:
            ownerContext.owner._id,
    });

const createSupplier = async () => {
    const response = await request(app)
        .post(
            '/api/workspaces/'
            + ownerContext.workspace._id
                .toString()
            + '/suppliers',
        )
        .set(
            bearer(
                ownerContext.token,
            ),
        )
        .send({
            name:
                'Fournisseur import M003',
        });

    expect(response.status).toBe(201);

    return response.body.data
        .supplier.id;
};

const inspectPreviewCommit = async () => {
    const csv = [
        'Reference;Designation;Unites;Quantite;Unite;Prix;Base',
        'CAR-25;Carotte import M003;1;25;kg;40,625;sac',
    ].join('\n');

    const inspect = await request(app)
        .post(
            basePath()
            + '/imports/inspect',
        )
        .set(
            bearer(
                ownerContext.token,
            ),
        )
        .attach(
            'file',
            Buffer.from(csv, 'utf8'),
            'catalogue.csv',
        );

    expect(inspect.status).toBe(201);

    const preview = await request(app)
        .post(
            basePath()
            + '/imports/'
            + inspect.body.data.importId
            + '/preview',
        )
        .set(
            bearer(
                ownerContext.token,
            ),
        )
        .send({
            supplierId,
            edition: {
                name:
                    'Catalogue septembre 2026',
                editionDate:
                    '2026-09-01T00:00:00.000Z',
                validFrom:
                    '2026-09-01T00:00:00.000Z',
                validTo:
                    '2026-09-30T23:59:59.000Z',
            },
            mapping: {
                supplierReference: 0,
                designation: 1,
                unitCount: 2,
                quantityPerUnit: 3,
                unit: 4,
                priceAmount: 5,
                priceBasis: 6,
            },
            defaults: {
                currency: 'EUR',
            },
        });

    expect(preview.status).toBe(200);

    const commit = await request(app)
        .post(
            basePath()
            + '/imports/'
            + inspect.body.data.importId
            + '/commit',
        )
        .set(
            bearer(
                ownerContext.token,
            ),
        );

    expect(commit.status).toBe(200);

    return { preview, commit };
};

beforeEach(async () => {
    ownerContext =
        await createWorkspaceOwnerFixture();
    productReference =
        await createActiveProductReference({
            actorId:
                ownerContext.owner._id,
            name:
                'Carotte import M003',
            referenceName:
                'Carotte import M003',
        });
    supplierId =
        await createSupplier();
});

describe('M-003 supplier catalog import HTTP', () => {
    it('refuse l import privé sans capability commerciale', async () => {
        const response = await request(app)
            .post(
                basePath()
                + '/imports/inspect',
            )
            .set(
                bearer(
                    ownerContext.token,
                ),
            )
            .attach(
                'file',
                Buffer.from(
                    'Reference;Designation\nX;Y',
                    'utf8',
                ),
                'catalogue.csv',
            );

        expect(response.status).toBe(403);
    });

    it('préserve les lignes ambiguës et non rapprochées sans créer par approximation', async () => {
        await enableImportFeature();

        const globalSupplier = await createSupplierService({
            scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
            actorId: ownerContext.owner._id,
            data: { name: 'Fournisseur ambigu M003' },
        });

        await createSupplierArticle({
            scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
            actorId: ownerContext.owner._id,
            data: {
                supplierId: globalSupplier.id,
                productVariantId: productReference.variant._id,
                supplierReference: 'AMB-001',
            },
        });

        await createSupplierArticle({
            scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            data: {
                supplierId: globalSupplier.id,
                productVariantId: productReference.variant._id,
                supplierReference: 'AMB-001',
            },
        });

        const csv = [
            'Reference;Designation',
            'AMB-001;Carotte import M003',
            'UNKNOWN-999;Produit totalement inconnu M003',
        ].join('\n');

        const inspect = await request(app)
            .post(basePath() + '/imports/inspect')
            .set(bearer(ownerContext.token))
            .attach(
                'file',
                Buffer.from(csv, 'utf8'),
                'catalogue.csv',
            );

        expect(inspect.status).toBe(201);

        const preview = await request(app)
            .post(
                basePath()
                + '/imports/'
                + inspect.body.data.importId
                + '/preview',
            )
            .set(bearer(ownerContext.token))
            .send({
                supplierId: globalSupplier.id,
                edition: {
                    name: 'Catalogue ambigu M003',
                },
                mapping: {
                    supplierReference: 0,
                    designation: 1,
                },
                defaults: {
                    currency: 'EUR',
                },
            });

        expect(preview.status).toBe(200);
        expect(preview.body.data.counts).toEqual(
            expect.objectContaining({
                AMBIGUOUS: 1,
                UNMATCHED: 1,
            }),
        );

        const commit = await request(app)
            .post(
                basePath()
                + '/imports/'
                + inspect.body.data.importId
                + '/commit',
            )
            .set(bearer(ownerContext.token));

        expect(commit.status).toBe(200);
        expect(commit.body.data.createdArticles).toBe(0);

        const lines = await SupplierCatalogLine
            .find({ isCurrent: true })
            .sort({ sourceRowNumber: 1 })
            .lean();

        expect(lines.map(({ matchStatus }) => matchStatus))
            .toEqual(['AMBIGUOUS', 'UNMATCHED']);
    });

    it('rollback toutes les écritures si une ligne échoue pendant le commit', async () => {
        await enableImportFeature();

        const csv = [
            'Reference;Designation',
            'ROLL-001;Carotte import M003',
        ].join('\n');

        const inspect = await request(app)
            .post(basePath() + '/imports/inspect')
            .set(bearer(ownerContext.token))
            .attach(
                'file',
                Buffer.from(csv, 'utf8'),
                'catalogue.csv',
            );

        const preview = await request(app)
            .post(
                basePath()
                + '/imports/'
                + inspect.body.data.importId
                + '/preview',
            )
            .set(bearer(ownerContext.token))
            .send({
                supplierId,
                edition: {
                    name: 'Catalogue rollback M003',
                },
                mapping: {
                    supplierReference: 0,
                    designation: 1,
                },
                defaults: {
                    currency: 'EUR',
                },
            });

        expect(preview.status).toBe(200);
        expect(preview.body.data.rows[0].classification)
            .toBe('CREATE_ARTICLE');

        const session = await SupplierCatalogImportSession.findById(
            inspect.body.data.importId,
        );

        session.preview.push({
            rowNumber: 3,
            supplierReference: 'ROLL-BAD',
            normalizedSupplierReference: 'ROLL-BAD',
            designation: 'Ligne volontairement invalide au commit',
            normalizedDesignation:
                'ligne volontairement invalide au commit',
            brand: null,
            packaging: null,
            sourcePrice: null,
            errors: [],
            classification: 'CREATE_ARTICLE',
            matchStatus: 'MATCHED',
            supplierArticleId: null,
            productVariantId:
                new mongoose.Types.ObjectId().toString(),
            lineIdentityKey: 'ref:ROLL-BAD',
        });
        await session.save();

        const commit = await request(app)
            .post(
                basePath()
                + '/imports/'
                + inspect.body.data.importId
                + '/commit',
            )
            .set(bearer(ownerContext.token));

        expect(commit.status).toBe(409);
        expect(commit.body.message)
            .toMatch(/Référence Produit indisponible/i);
        expect(
            await SupplierArticle.countDocuments({
                supplier: supplierId,
            }),
        ).toBe(0);
        expect(
            await SupplierCatalogEdition.countDocuments({
                workspace: ownerContext.workspace._id,
                name: 'Catalogue rollback M003',
            }),
        ).toBe(0);

        const rolledBackSession =
            await SupplierCatalogImportSession.findById(
                inspect.body.data.importId,
            ).lean();

        expect(rolledBackSession.status).toBe('PREVIEWED');
    });

    it('importe, normalise le prix et réimporte la même édition sans doublon', async () => {
        await enableImportFeature();

        const first =
            await inspectPreviewCommit();

        expect(
            first.preview.body.data.rows[0],
        ).toEqual(
            expect.objectContaining({
                classification:
                    'CREATE_ARTICLE',
                productVariantId:
                    productReference.variant
                        ._id.toString(),
            }),
        );
        expect(
            first.commit.body.data,
        ).toEqual(
            expect.objectContaining({
                catalogCreated: true,
                createdArticles: 1,
                changedLines: 1,
            }),
        );

        const tariff =
            await SupplierTariff.findOne({
                isCurrent: true,
            }).lean();

        expect(
            tariff.normalizedAmount
                .toString(),
        ).toBe('1.625');
        expect(
            tariff.normalizedUnit,
        ).toBe('KG');

        const second =
            await inspectPreviewCommit();

        expect(
            second.preview.body.data.rows[0],
        ).toEqual(
            expect.objectContaining({
                classification:
                    'MATCHED',
            }),
        );
        expect(
            second.commit.body.data,
        ).toEqual(
            expect.objectContaining({
                catalogCreated: false,
                createdArticles: 0,
                changedLines: 0,
                unchangedLines: 1,
            }),
        );
        expect(
            await SupplierTariff.countDocuments(),
        ).toBe(1);
    });
});
