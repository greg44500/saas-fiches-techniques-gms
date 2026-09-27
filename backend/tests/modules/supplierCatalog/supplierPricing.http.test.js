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
    Dossier,
} from '../../../modules/dossier/dossier.model.js';
import {
    createCatalogEdition,
    upsertCatalogLine,
} from '../../../modules/supplierCatalog/supplierCatalog.service.js';
import {
    SUPPLIER_SCOPE,
} from '../../../modules/supplierCatalog/supplierCatalog.registry.js';
import {
    createSupplier,
    createSupplierArticle,
} from '../../../modules/supplierCatalog/supplierReference.service.js';
import {
    DossierSupplierReference,
} from '../../../modules/supplierCatalog/supplierPricing.model.js';
import {
    createActiveProductReference,
} from '../../helpers/productCatalogTest.fixtures.js';
import {
    bearer,
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';

let owner;
let productReference;
let supplier;
let article;
let dossierA;
let dossierB;

const pricingPath = (dossier) =>
    '/api/workspaces/'
    + owner.workspace._id.toString()
    + '/dossiers/'
    + dossier._id.toString()
    + '/supplier-pricing';

const createDossier = async (name) =>
    Dossier.create({
        workspace:
            owner.workspace._id,
        name,
        statusChangedBy:
            owner.owner._id,
        createdBy:
            owner.owner._id,
        updatedBy:
            owner.owner._id,
    });

beforeEach(async () => {
    owner =
        await createWorkspaceOwnerFixture();
    productReference =
        await createActiveProductReference({
            actorId:
                owner.owner._id,
            name:
                'Pomme prix M003',
            referenceName:
                'Pomme prix M003',
        });

    supplier =
        await createSupplier({
            scope:
                SUPPLIER_SCOPE
                    .WORKSPACE_PRIVATE,
            workspaceId:
                owner.workspace._id,
            actorId:
                owner.owner._id,
            data: {
                name:
                    'Fournisseur prix M003',
            },
        });

    article =
        await createSupplierArticle({
            scope:
                SUPPLIER_SCOPE
                    .WORKSPACE_PRIVATE,
            workspaceId:
                owner.workspace._id,
            actorId:
                owner.owner._id,
            data: {
                supplierId:
                    supplier.id,
                productVariantId:
                    productReference.variant
                        ._id,
                supplierReference:
                    'POM-001',
                packaging: {
                    unitCount: 1,
                    quantityPerUnit: '10',
                    unit: 'KG',
                },
            },
        });

    dossierA =
        await createDossier(
            'Magasin A',
        );
    dossierB =
        await createDossier(
            'Magasin B',
        );
});

describe('M-003 dossier pricing HTTP', () => {
    it('refuse les périodes négociées qui se chevauchent dans un même Dossier', async () => {
        const first = await request(app)
            .post(
                pricingPath(dossierA)
                + '/negotiated-prices',
            )
            .set(bearer(owner.token))
            .send({
                articleId:
                    article.id,
                sourceAmount: '20',
                sourceBasis: 'KG',
                validFrom:
                    '2026-01-01T00:00:00.000Z',
                validTo:
                    '2026-12-31T23:59:59.000Z',
            });

        expect(first.status).toBe(201);

        const overlap = await request(app)
            .post(
                pricingPath(dossierA)
                + '/negotiated-prices',
            )
            .set(bearer(owner.token))
            .send({
                articleId:
                    article.id,
                sourceAmount: '19',
                sourceBasis: 'KG',
                validFrom:
                    '2026-06-01T00:00:00.000Z',
                validTo:
                    '2027-01-01T00:00:00.000Z',
            });

        expect(overlap.status).toBe(409);
    });

    it('résout par Référence Produit avec exactement un Article visible', async () => {
        const resolved = await request(app)
            .get(
                pricingPath(dossierA)
                + '/applicable',
            )
            .query({
                productVariantId:
                    productReference.variant._id.toString(),
                atDate:
                    '2026-09-27T00:00:00.000Z',
            })
            .set(bearer(owner.token));

        expect(resolved.status).toBe(200);
        expect(
            resolved.body.data.applicablePrice.article.id,
        ).toBe(article.id);
    });

    it('refuse la résolution par Référence Produit sans Article visible', async () => {
        const orphanReference =
            await createActiveProductReference({
                actorId:
                    owner.owner._id,
                name:
                    'Produit sans article M003',
                referenceName:
                    'Produit sans article M003',
            });

        const resolved = await request(app)
            .get(
                pricingPath(dossierA)
                + '/applicable',
            )
            .query({
                productVariantId:
                    orphanReference.variant._id.toString(),
            })
            .set(bearer(owner.token));

        expect(resolved.status).toBe(404);
    });

    it('refuse de choisir automatiquement entre plusieurs Articles visibles', async () => {
        const secondSupplier =
            await createSupplier({
                scope:
                    SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
                workspaceId:
                    owner.workspace._id,
                actorId:
                    owner.owner._id,
                data: {
                    name:
                        'Deuxième fournisseur prix M003',
                },
            });

        await createSupplierArticle({
            scope:
                SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
            workspaceId:
                owner.workspace._id,
            actorId:
                owner.owner._id,
            data: {
                supplierId:
                    secondSupplier.id,
                productVariantId:
                    productReference.variant._id,
                supplierReference:
                    'POM-002',
            },
        });

        const resolved = await request(app)
            .get(
                pricingPath(dossierA)
                + '/applicable',
            )
            .query({
                productVariantId:
                    productReference.variant._id.toString(),
            })
            .set(bearer(owner.token));

        expect(resolved.status).toBe(409);
        expect(resolved.body.message)
            .toMatch(/sélection explicite/i);
    });

    it('n utilise jamais le Tarif négocié d un autre Dossier', async () => {
        await request(app)
            .post(
                pricingPath(dossierA)
                + '/negotiated-prices',
            )
            .set(bearer(owner.token))
            .send({
                articleId:
                    article.id,
                sourceAmount: '18',
                sourceBasis: 'KG',
                validFrom:
                    '2026-01-01T00:00:00.000Z',
            })
            .expect(201);

        const resolved = await request(app)
            .get(
                pricingPath(dossierB)
                + '/applicable',
            )
            .query({
                articleId:
                    article.id,
                atDate:
                    '2026-09-27T00:00:00.000Z',
            })
            .set(bearer(owner.token));

        expect(resolved.status).toBe(200);
        expect(
            resolved.body.data
                .applicablePrice.price,
        ).toBeNull();
        expect(
            resolved.body.data
                .applicablePrice.alerts,
        ).toEqual(
            expect.arrayContaining([
                'NO_VALID_NEGOTIATED_PRICE',
            ]),
        );
    });

    it('n utilise jamais un Prix facturé VALIDATED d un autre Dossier', async () => {
        await request(app)
            .put(
                '/api/workspaces/'
                + owner.workspace._id.toString()
                + '/supplier-pricing-policy',
            )
            .set(bearer(owner.token))
            .send({
                mode: 'INVOICED_PRICE',
            })
            .expect(200);

        const invoice = await request(app)
            .post(
                pricingPath(dossierA)
                + '/invoiced-prices',
            )
            .set(bearer(owner.token))
            .send({
                supplierId:
                    supplier.id,
                articleId:
                    article.id,
                invoiceDate:
                    '2026-09-01T00:00:00.000Z',
                sourceAmount: '14',
                sourceBasis: 'KG',
            });

        await request(app)
            .patch(
                pricingPath(dossierA)
                + '/invoiced-prices/'
                + invoice.body.data.price.id
                + '/status',
            )
            .set(bearer(owner.token))
            .send({
                status: 'VALIDATED',
            })
            .expect(200);

        const resolved = await request(app)
            .get(
                pricingPath(dossierB)
                + '/applicable',
            )
            .query({
                articleId:
                    article.id,
                atDate:
                    '2026-09-27T00:00:00.000Z',
            })
            .set(bearer(owner.token));

        expect(resolved.status).toBe(200);
        expect(
            resolved.body.data.applicablePrice.price,
        ).toBeNull();
        expect(
            resolved.body.data.applicablePrice.alerts,
        ).toContain('NO_VALIDATED_INVOICE');
    });

    it('retombe sur le Tarif fournisseur lorsque le mode standard ne trouve pas de négocié', async () => {
        const catalog =
            await createCatalogEdition({
                scope:
                    SUPPLIER_SCOPE
                        .WORKSPACE_PRIVATE,
                workspaceId:
                    owner.workspace._id,
                actorId:
                    owner.owner._id,
                supplierId:
                    supplier.id,
                data: {
                    name:
                        'Catalogue prix M003',
                    validFrom:
                        new Date(
                            '2026-01-01T00:00:00.000Z',
                        ),
                },
            });

        await upsertCatalogLine({
            scope:
                SUPPLIER_SCOPE
                    .WORKSPACE_PRIVATE,
            workspaceId:
                owner.workspace._id,
            catalogId:
                catalog.catalog.id,
            actorId:
                owner.owner._id,
            row: {
                supplierReference:
                    'POM-001',
                designation:
                    'Pomme prix M003',
                supplierArticleId:
                    article.id,
                sourcePrice: {
                    amount: '15',
                    basis: 'KG',
                    currency: 'EUR',
                },
            },
        });

        const resolved = await request(app)
            .get(
                pricingPath(dossierA)
                + '/applicable',
            )
            .query({
                articleId:
                    article.id,
                atDate:
                    '2026-09-27T00:00:00.000Z',
            })
            .set(bearer(owner.token));

        expect(resolved.status).toBe(200);
        expect(
            resolved.body.data
                .applicablePrice,
        ).toEqual(
            expect.objectContaining({
                requestedMode:
                    'NEGOTIATED_PRICE',
                resolvedSource:
                    'SUPPLIER_TARIFF',
                fallbackApplied: true,
            }),
        );
        expect(
            resolved.body.data
                .applicablePrice.price
                .normalizedAmount,
        ).toBe('15');
    });

    it('écarte un Prix facturé VALIDATED devenu ancien de plus de 12 mois puis utilise le négocié', async () => {
        await request(app)
            .put(
                '/api/workspaces/'
                + owner.workspace._id
                    .toString()
                + '/supplier-pricing-policy',
            )
            .set(bearer(owner.token))
            .send({
                mode:
                    'INVOICED_PRICE',
            })
            .expect(200);

        await request(app)
            .post(
                pricingPath(dossierA)
                + '/negotiated-prices',
            )
            .set(bearer(owner.token))
            .send({
                articleId:
                    article.id,
                sourceAmount: '17',
                sourceBasis: 'KG',
                validFrom:
                    '2025-01-01T00:00:00.000Z',
            })
            .expect(201);

        const invoice = await request(app)
            .post(
                pricingPath(dossierA)
                + '/invoiced-prices',
            )
            .set(bearer(owner.token))
            .send({
                supplierId:
                    supplier.id,
                articleId:
                    article.id,
                invoiceDate:
                    '2025-09-15T00:00:00.000Z',
                sourceAmount: '16',
                sourceBasis: 'KG',
            });

        expect(invoice.status).toBe(201);

        await request(app)
            .patch(
                pricingPath(dossierA)
                + '/invoiced-prices/'
                + invoice.body.data.price.id
                + '/status',
            )
            .set(bearer(owner.token))
            .send({
                status: 'VALIDATED',
            })
            .expect(200);

        const resolved = await request(app)
            .get(
                pricingPath(dossierA)
                + '/applicable',
            )
            .query({
                articleId:
                    article.id,
                atDate:
                    '2026-09-16T00:00:00.000Z',
            })
            .set(bearer(owner.token));

        expect(resolved.status).toBe(200);
        expect(
            resolved.body.data
                .applicablePrice
                .resolvedSource,
        ).toBe('NEGOTIATED_PRICE');
        expect(
            resolved.body.data
                .applicablePrice.alerts,
        ).toContain(
            'LATEST_VALIDATED_INVOICE_STALE',
        );
    });

    it('conserve un favori Dossier sans copier de prix', async () => {
        const added = await request(app)
            .put(
                pricingPath(dossierA)
                + '/references/'
                + article.id,
            )
            .set(bearer(owner.token));

        expect(added.status).toBe(201);

        const stored =
            await DossierSupplierReference
                .findOne({
                    dossier:
                        dossierA._id,
                    supplierArticle:
                        article.id,
                })
                .lean();

        expect(stored).toBeTruthy();
        expect(stored).not.toHaveProperty(
            'price',
        );
        expect(stored).not.toHaveProperty(
            'sourceAmount',
        );
    });
});
