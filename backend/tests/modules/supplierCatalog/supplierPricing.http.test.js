import '../../setup.js';

import request from 'supertest';
import mongoose from 'mongoose';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { app } from '../../../app.js';
import {
    bootstrapApplicationGlobalMember,
} from '../../../modules/applicationGlobalAuthorization/applicationGlobalMember.service.js';
import {
    syncApplicationGlobalSystemRole,
} from '../../../modules/applicationGlobalAuthorization/applicationGlobalRole.service.js';
import {
    PRODUCT_CATALOG_GLOBAL_PERMISSION,
} from '../../../modules/productCatalog/productCatalogGlobalPermission.registry.js';
import {
    Dossier,
} from '../../../modules/dossier/dossier.model.js';
import {
    createCatalogEdition,
    upsertCatalogLine,
} from '../../../modules/supplierCatalog/supplierCatalog.service.js';
import { SupplierTariff } from '../../../modules/supplierCatalog/supplierCatalog.model.js';
import {
    SUPPLIER_SCOPE,
} from '../../../modules/supplierCatalog/supplierCatalog.registry.js';
import {
    createSupplier,
    createSupplierArticle,
} from '../../../modules/supplierCatalog/supplierReference.service.js';
import {
    DossierSupplierReference,
    InvoicedPrice,
    NegotiatedPrice,
} from '../../../modules/supplierCatalog/supplierPricing.model.js';
import {
    setIndicativePrice,
} from '../../../modules/supplierCatalog/supplierPricing.service.js';
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

    it('valorise 36 croissants à la pièce seulement après confirmation et pour le conditionnement du tarif', async () => {
        const croissant = await createActiveProductReference({
            actorId: owner.owner._id,
            name: 'Croissant de recette vérifié',
            referenceUnit: 'UNIT',
            countUnitLabelSingular: 'pièce',
            countUnitLabelPlural: 'pièces',
        });
        const created = await createSupplierArticle({
            scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
            workspaceId: owner.workspace._id,
            actorId: owner.owner._id,
            data: {
                supplierId: supplier.id,
                productVariantId: croissant.variant._id,
                supplierReference: 'CRO-43279',
                packaging: {
                    containerType: 'Carton',
                    unitCount: 36,
                    quantityPerUnit: '120',
                    unit: 'G',
                    netWeight: '4320',
                    netWeightUnit: 'G',
                },
            },
        });
        await SupplierTariff.create({
            supplierArticle: created.id,
            scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
            workspace: owner.workspace._id,
            sourceKind: 'PRICE_LIST',
            sourceLabel: 'Tarif croissant',
            sourceImportId: new mongoose.Types.ObjectId(),
            packagingSnapshot: {
                containerType: 'Carton',
                unitCount: 36,
                quantityPerUnit: '120',
                unit: 'G',
                totalQuantity: '4320',
                netWeight: '4320',
                netWeightUnit: 'G',
            },
            isCurrent: true,
            sourceAmount: '6.50',
            sourceBasis: 'PACKAGE',
            currency: 'EUR',
            validFrom: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: owner.owner._id,
            updatedBy: owner.owner._id,
        });
        const articleUrl = '/api/workspaces/'
            + owner.workspace._id + '/supplier-articles/' + created.id;
        const priceUrl = pricingPath(dossierA)
            + '/applicable?articleId=' + created.id;

        const before = await request(app).get(priceUrl).set(bearer(owner.token));
        expect(before.status).toBe(200);
        expect(before.body.data.applicablePrice.price.normalizedAmount).toBeNull();

        const refused = await request(app).patch(articleUrl)
            .set(bearer(owner.token))
            .send({ recipeUnitsPerPackage: 36 });
        expect(refused.status).toBe(400);

        const confirmed = await request(app).patch(articleUrl)
            .set(bearer(owner.token))
            .send({ recipeUnitsPerPackage: 36, confirmRecipeUnits: true });
        expect(confirmed.status).toBe(200);
        expect(confirmed.body.data.article.recipeUnitEquivalence.unitsPerPackage)
            .toBe(36);
        const after = await request(app).get(priceUrl).set(bearer(owner.token));
        expect(after.status).toBe(200);
        // Sans prix négocié, le tarif fournisseur est bien la source utilisée.
        expect(after.body.data.applicablePrice.resolvedSource).toBe('SUPPLIER_TARIFF');
        expect(after.body.data.applicablePrice.price.normalizedUnit).toBe('UNIT');
        expect(Number(after.body.data.applicablePrice.price.normalizedAmount))
            .toBeCloseTo(6.5 / 36, 10);

        // Les nouvelles sources négociées et facturées exploitent la même
        // correspondance vérifiée et figent les données de leur calcul.
        const negotiated = await request(app)
            .post(pricingPath(dossierA) + '/negotiated-prices')
            .set(bearer(owner.token))
            .send({
                articleId: created.id,
                sourceAmount: '6.50',
                sourceBasis: 'PACKAGE',
                validFrom: '2026-01-01T00:00:00.000Z',
            });
        expect(negotiated.status).toBe(201);
        expect(negotiated.body.data.price.normalizedUnit).toBe('UNIT');
        expect(Number(negotiated.body.data.price.normalizedAmount))
            .toBeCloseTo(6.5 / 36, 10);

        const invoiced = await request(app)
            .post(pricingPath(dossierA) + '/invoiced-prices')
            .set(bearer(owner.token))
            .send({
                supplierId: supplier.id,
                articleId: created.id,
                invoiceDate: '2026-10-01T00:00:00.000Z',
                sourceAmount: '6.50',
                sourceBasis: 'PACKAGE',
            });
        expect(invoiced.status).toBe(201);
        expect(invoiced.body.data.price.normalizedUnit).toBe('UNIT');
        expect(Number(invoiced.body.data.price.normalizedAmount))
            .toBeCloseTo(6.5 / 36, 10);

        const changed = await request(app).patch(articleUrl)
            .set(bearer(owner.token))
            .send({
                packaging: {
                    containerType: 'Carton',
                    unitCount: 24,
                    quantityPerUnit: '120',
                    unit: 'G',
                },
            });
        expect(changed.status).toBe(200);
        expect(changed.body.data.article.recipeUnitEquivalence).toBeNull();

        // Politique par défaut : NEGOTIATED_PRICE. Le prix négocié actif,
        // déjà normalisé et historisé, reste légitimement applicable après
        // le changement du colis courant. Il ne faut pas le revaloriser.
        const historicalNegotiated = await request(app)
            .get(priceUrl).set(bearer(owner.token));
        expect(historicalNegotiated.status).toBe(200);
        expect(historicalNegotiated.body.data.applicablePrice)
            .toMatchObject({
                requestedMode: 'NEGOTIATED_PRICE',
                resolvedSource: 'NEGOTIATED_PRICE',
                price: { normalizedUnit: 'UNIT' },
            });
        expect(Number(historicalNegotiated.body.data.applicablePrice.price.normalizedAmount))
            .toBeCloseTo(6.5 / 36, 10);

        // Politique fournisseur : le tarif historique conserve le colis 36
        // mais ne peut plus emprunter l'équivalence invalidée de l'Article 24.
        const policyPath = '/api/workspaces/'
            + owner.workspace._id.toString() + '/supplier-pricing-policy';
        await request(app).put(policyPath)
            .set(bearer(owner.token))
            .send({ mode: 'SUPPLIER_TARIFF' })
            .expect(200);
        const unavailableTariff = await request(app)
            .get(priceUrl).set(bearer(owner.token));
        expect(unavailableTariff.status).toBe(200);
        expect(unavailableTariff.body.data.applicablePrice).toMatchObject({
            requestedMode: 'SUPPLIER_TARIFF',
            resolvedSource: 'SUPPLIER_TARIFF',
        });
        expect(unavailableTariff.body.data.applicablePrice.price.normalizedUnit)
            .toBeNull();
        expect(unavailableTariff.body.data.applicablePrice.price.normalizedAmount)
            .toBeNull();

        // Une facture en attente ne devient pas un Prix applicable. En mode
        // facture, le fallback négocié reste valable pour ce même Dossier.
        await request(app).put(policyPath)
            .set(bearer(owner.token))
            .send({ mode: 'INVOICED_PRICE' })
            .expect(200);
        const pendingInvoice = await request(app)
            .get(priceUrl).set(bearer(owner.token));
        expect(pendingInvoice.status).toBe(200);
        expect(pendingInvoice.body.data.applicablePrice)
            .toMatchObject({
                requestedMode: 'INVOICED_PRICE',
                resolvedSource: 'NEGOTIATED_PRICE',
                fallbackApplied: true,
            });
        expect(pendingInvoice.body.data.applicablePrice.alerts)
            .toContain('NO_VALIDATED_INVOICE');

        // Après validation, seule la facture vérifiée du Dossier prime sur
        // le tarif négocié ; elle garde la photographie des 36 pièces.
        await request(app)
            .patch(pricingPath(dossierA)
                + '/invoiced-prices/' + invoiced.body.data.price.id + '/status')
            .set(bearer(owner.token))
            .send({ status: 'VALIDATED' })
            .expect(200);
        const validatedInvoice = await request(app)
            .get(priceUrl).set(bearer(owner.token));
        expect(validatedInvoice.status).toBe(200);
        expect(validatedInvoice.body.data.applicablePrice)
            .toMatchObject({
                requestedMode: 'INVOICED_PRICE',
                resolvedSource: 'INVOICED_PRICE',
                fallbackApplied: false,
                price: { normalizedUnit: 'UNIT' },
            });
        expect(Number(validatedInvoice.body.data.applicablePrice.price.normalizedAmount))
            .toBeCloseTo(6.5 / 36, 10);

        // Cette preuve ne doit pas être utilisable par un autre Dossier.
        const otherDossier = await request(app)
            .get(pricingPath(dossierB) + '/applicable')
            .query({ articleId: created.id })
            .set(bearer(owner.token));
        expect(otherDossier.status).toBe(200);
        expect(otherDossier.body.data.applicablePrice.resolvedSource)
            .toBe('SUPPLIER_TARIFF');
        expect(otherDossier.body.data.applicablePrice.price.normalizedAmount)
            .toBeNull();

        const [frozenNegotiated, frozenInvoiced] = await Promise.all([
            NegotiatedPrice.findById(negotiated.body.data.price.id).lean(),
            InvoicedPrice.findById(invoiced.body.data.price.id).lean(),
        ]);
        for (const historicalPrice of [frozenNegotiated, frozenInvoiced]) {
            expect(historicalPrice.normalizedUnit).toBe('UNIT');
            expect(Number(historicalPrice.normalizedAmount.toString()))
                .toBeCloseTo(6.5 / 36, 10);
            expect(historicalPrice.packagingSnapshot.unitCount).toBe(36);
            expect(historicalPrice.recipeUnitEquivalenceSnapshot.unitsPerPackage)
                .toBe(36);
        }
    });

    it('expose les sources de Prix applicable depuis le backend', async () => {
        const response = await request(app)
            .get(
                pricingPath(dossierA)
                + '/metadata',
            )
            .set(bearer(owner.token));

        expect(response.status).toBe(200);
        expect(
            response.body.data.metadata
                .applicablePriceSources,
        ).toEqual([
            {
                value: 'SUPPLIER_TARIFF',
                label: 'Tarif fournisseur',
            },
            {
                value: 'NEGOTIATED_PRICE',
                label: 'Tarif négocié',
            },
            {
                value: 'INVOICED_PRICE',
                label: 'Prix facturé',
            },
            {
                value: 'INDICATIVE_DOSSIER',
                label: 'Prix indicatif Dossier',
            },
            {
                value: 'INDICATIVE_WORKSPACE',
                label: 'Prix indicatif espace de travail',
            },
            {
                value: 'INDICATIVE_GLOBAL',
                label: 'Prix repère global',
            },
        ]);
    });

    it('protège la maintenance du Prix repère global par l’autorisation Application Global Produit', async () => {
        const variantId =
            productReference.variant._id.toString();

        await request(app)
            .get('/api/product-reference-pricing/indicative-prices')
            .set(bearer(owner.token))
            .expect(403);

        const role = await syncApplicationGlobalSystemRole({
            roleData: {
                key: 'pricing-product-governor',
                name: 'Gouvernance Produit et Prix repère',
                description:
                    'Administration des Prix repères globaux Produit.',
                permissions: [
                    PRODUCT_CATALOG_GLOBAL_PERMISSION.READ,
                    PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE,
                ],
            },
            actorId: owner.owner._id,
        });

        await bootstrapApplicationGlobalMember({
            userId: owner.owner._id,
            roleId: role.id,
            actorId: owner.owner._id,
        });

        const created = await request(app)
            .put(
                '/api/product-reference-pricing/indicative-prices/'
                + variantId,
            )
            .set(bearer(owner.token))
            .send({
                sourceAmount: '3.25',
                sourceBasis: 'KG',
                source:
                    'Référentiel de démonstration',
            });

        expect(created.status).toBe(200);
        expect(created.body.data.price).toMatchObject({
            workspaceId: null,
            dossierId: null,
            sourceAmount: '3.25',
            normalizedAmount: '3.25',
            normalizedUnit: 'KG',
        });

        const listed = await request(app)
            .get('/api/product-reference-pricing/indicative-prices')
            .query({ productVariantId: variantId })
            .set(bearer(owner.token));

        expect(listed.status).toBe(200);
        expect(listed.body.data.prices).toHaveLength(1);

        await request(app)
            .delete(
                '/api/product-reference-pricing/indicative-prices/'
                + variantId,
            )
            .set(bearer(owner.token))
            .expect(200);
    });

    it('expose au Workspace le Prix repère global en lecture seule avec conditionnement et provenance', async () => {
        const countableReference =
            await createActiveProductReference({
                actorId:
                    owner.owner._id,
                name:
                    'Pain bruschetta Workspace M003',
                referenceName:
                    'Pain bruschetta Workspace M003',
                referenceUnit:
                    'UNIT',
                countUnitLabelSingular:
                    'tranche',
                countUnitLabelPlural:
                    'tranches',
            });
        const variantId =
            countableReference.variant._id.toString();

        await setIndicativePrice({
            workspaceId: null,
            dossierId: null,
            productVariantId:
                countableReference.variant._id,
            actorId:
                owner.owner._id,
            sourceAmount: '16',
            sourceBasis: 'PACKAGE',
            packaging: {
                containerType: 'Carton',
                unitCount: 8,
                quantityPerUnit: '4',
                unit: 'UNIT',
                supplierLabel:
                    '1 carton = 8 paquets × 4 tranches',
            },
            source: 'Relevé documenté',
            sourceOrganization:
                'Catalogue professionnel vérifié',
            sourceUrl:
                'https://example.test/catalogue',
            observedAt:
                new Date('2026-10-05T00:00:00.000Z'),
        });

        const response = await request(app)
            .get(
                '/api/workspaces/'
                + owner.workspace._id.toString()
                + '/supplier-pricing/global-indicative-prices',
            )
            .query({ productVariantId: variantId })
            .set(bearer(owner.token));

        expect(response.status).toBe(200);
        expect(response.body.data.prices).toEqual([
            expect.objectContaining({
                workspaceId: null,
                dossierId: null,
                sourceAmount: '16',
                sourceBasis: 'PACKAGE',
                normalizedAmount: '0.5',
                normalizedUnit: 'UNIT',
                sourceOrganization:
                    'Catalogue professionnel vérifié',
                sourceUrl:
                    'https://example.test/catalogue',
                packaging: expect.objectContaining({
                    unitCount: 8,
                    quantityPerUnit: '4',
                    totalQuantity: '32',
                    unit: 'UNIT',
                }),
                productVariant: expect.objectContaining({
                    id: variantId,
                    referenceUnit: 'UNIT',
                    countUnitLabelSingular: 'tranche',
                    countUnitLabelPlural: 'tranches',
                }),
            }),
        ]);

        await request(app)
            .put(
                '/api/workspaces/'
                + owner.workspace._id.toString()
                + '/supplier-pricing/global-indicative-prices/'
                + variantId,
            )
            .set(bearer(owner.token))
            .send({
                sourceAmount: '18',
                sourceBasis: 'PACKAGE',
            })
            .expect(404);
    });

    it('utilise le Prix repère global en dernier recours sans Article fournisseur', async () => {
        const orphanReference =
            await createActiveProductReference({
                actorId:
                    owner.owner._id,
                name:
                    'Produit Prix repère global M003',
                referenceName:
                    'Produit Prix repère global M003',
                referenceUnit:
                    'KG',
            });

        await setIndicativePrice({
            workspaceId: null,
            dossierId: null,
            productVariantId:
                orphanReference.variant._id,
            actorId:
                owner.owner._id,
            sourceAmount: '2.75',
            sourceBasis: 'KG',
            source:
                'Référentiel de démonstration',
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

        expect(resolved.status).toBe(200);
        expect(
            resolved.body.data.applicablePrice,
        ).toEqual(
            expect.objectContaining({
                article: null,
                resolvedSource:
                    'INDICATIVE_GLOBAL',
                fallbackApplied: true,
            }),
        );
        expect(
            resolved.body.data.applicablePrice
                .price.normalizedAmount,
        ).toBe('2.75');
        expect(
            resolved.body.data.applicablePrice
                .price.source,
        ).toBe('INDICATIVE_GLOBAL');
        expect(
            resolved.body.data.applicablePrice
                .price.sourceNote,
        ).toBe('Référentiel de démonstration');
    });

    it('préfère le Prix indicatif Workspace au Prix repère global', async () => {
        const orphanReference =
            await createActiveProductReference({
                actorId:
                    owner.owner._id,
                name:
                    'Produit priorité Workspace global M003',
                referenceName:
                    'Produit priorité Workspace global M003',
                referenceUnit:
                    'KG',
            });
        const variantId =
            orphanReference.variant._id.toString();

        await setIndicativePrice({
            workspaceId: null,
            dossierId: null,
            productVariantId:
                orphanReference.variant._id,
            actorId:
                owner.owner._id,
            sourceAmount: '2.5',
            sourceBasis: 'KG',
        });

        await request(app)
            .put(
                '/api/workspaces/'
                + owner.workspace._id.toString()
                + '/supplier-pricing/indicative-prices/'
                + variantId,
            )
            .set(bearer(owner.token))
            .send({
                sourceAmount: '3.1',
                sourceBasis: 'KG',
            })
            .expect(200);

        const resolved = await request(app)
            .get(
                pricingPath(dossierA)
                + '/applicable',
            )
            .query({ productVariantId: variantId })
            .set(bearer(owner.token));

        expect(resolved.status).toBe(200);
        expect(
            resolved.body.data.applicablePrice.resolvedSource,
        ).toBe('INDICATIVE_WORKSPACE');
        expect(
            resolved.body.data.applicablePrice.price.normalizedAmount,
        ).toBe('3.1');
    });

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

        const listed = await request(app)
            .get(
                pricingPath(dossierA)
                + '/negotiated-prices',
            )
            .set(bearer(owner.token));

        expect(listed.status).toBe(200);
        expect(
            listed.body.data.prices[0]
                .supplierArticle
                .productVariant,
        ).toEqual(
            expect.objectContaining({
                id:
                    productReference.variant
                        ._id.toString(),
                referenceUnit: 'KG',
            }),
        );

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

    it('utilise un Prix indicatif Workspace lorsqu aucun Article fournisseur n existe', async () => {
        const orphanReference =
            await createActiveProductReference({
                actorId:
                    owner.owner._id,
                name:
                    'Produit indicatif Workspace M003',
                referenceName:
                    'Produit indicatif Workspace M003',
                referenceUnit:
                    'KG',
            });

        await request(app)
            .put(
                '/api/workspaces/'
                + owner.workspace._id.toString()
                + '/supplier-pricing/indicative-prices/'
                + orphanReference.variant._id.toString(),
            )
            .set(bearer(owner.token))
            .send({
                sourceAmount: '3.1',
                sourceBasis: 'KG',
                source:
                    'Estimation interne',
            })
            .expect(200);

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

        expect(resolved.status).toBe(200);
        expect(
            resolved.body.data.applicablePrice,
        ).toEqual(
            expect.objectContaining({
                article: null,
                resolvedSource:
                    'INDICATIVE_WORKSPACE',
                fallbackApplied: true,
            }),
        );
        expect(
            resolved.body.data.applicablePrice
                .price.normalizedAmount,
        ).toBe('3.1');
        expect(
            resolved.body.data.applicablePrice
                .price.normalizedUnit,
        ).toBe('KG');
    });

    it('filtre les Prix indicatifs Workspace par Produit', async () => {
        const secondReference =
            await createActiveProductReference({
                actorId:
                    owner.owner._id,
                name:
                    'Poire prix indicatif M003',
                referenceName:
                    'Poire prix indicatif M003',
                referenceUnit:
                    'KG',
            });

        for (const [variant, amount] of [
            [productReference.variant, '3.2'],
            [secondReference.variant, '4.4'],
        ]) {
            await request(app)
                .put(
                    '/api/workspaces/'
                    + owner.workspace._id.toString()
                    + '/supplier-pricing/indicative-prices/'
                    + variant._id.toString(),
                )
                .set(bearer(owner.token))
                .send({
                    sourceAmount: amount,
                    sourceBasis: 'KG',
                })
                .expect(200);
        }

        const response = await request(app)
            .get(
                '/api/workspaces/'
                + owner.workspace._id.toString()
                + '/supplier-pricing/indicative-prices',
            )
            .query({
                productId:
                    productReference.product._id.toString(),
            })
            .set(bearer(owner.token));

        expect(response.status).toBe(200);
        expect(response.body.data.prices).toHaveLength(1);
        expect(
            response.body.data.prices[0].productVariant.id,
        ).toBe(productReference.variant._id.toString());
        expect(
            response.body.data.prices[0].normalizedAmount,
        ).toBe('3.2');
    });

    it('n attribue pas un Prix indicatif à l Article fournisseur unique visible', async () => {
        await request(app)
            .put(
                '/api/workspaces/'
                + owner.workspace._id.toString()
                + '/supplier-pricing/indicative-prices/'
                + productReference.variant._id.toString(),
            )
            .set(bearer(owner.token))
            .send({
                sourceAmount: '2.9',
                sourceBasis: 'KG',
            })
            .expect(200);

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

        expect(resolved.status).toBe(200);
        expect(
            resolved.body.data.applicablePrice
                .resolvedSource,
        ).toBe('INDICATIVE_WORKSPACE');
        expect(
            resolved.body.data.applicablePrice
                .article,
        ).toBeNull();
    });

    it('préfère le Prix indicatif Dossier au Prix indicatif Workspace', async () => {
        const orphanReference =
            await createActiveProductReference({
                actorId:
                    owner.owner._id,
                name:
                    'Produit indicatif Dossier M003',
                referenceName:
                    'Produit indicatif Dossier M003',
                referenceUnit:
                    'KG',
            });
        const variantId =
            orphanReference.variant._id.toString();

        await request(app)
            .put(
                '/api/workspaces/'
                + owner.workspace._id.toString()
                + '/supplier-pricing/indicative-prices/'
                + variantId,
            )
            .set(bearer(owner.token))
            .send({
                sourceAmount: '3.1',
                sourceBasis: 'KG',
            })
            .expect(200);

        await request(app)
            .put(
                pricingPath(dossierA)
                + '/indicative-prices/'
                + variantId,
            )
            .set(bearer(owner.token))
            .send({
                sourceAmount: '3.35',
                sourceBasis: 'KG',
            })
            .expect(200);

        const resolved = await request(app)
            .get(
                pricingPath(dossierA)
                + '/applicable',
            )
            .query({
                productVariantId:
                    variantId,
            })
            .set(bearer(owner.token));

        expect(resolved.status).toBe(200);
        expect(
            resolved.body.data.applicablePrice
                .resolvedSource,
        ).toBe('INDICATIVE_DOSSIER');
        expect(
            resolved.body.data.applicablePrice
                .price.normalizedAmount,
        ).toBe('3.35');
    });

    it('ne partage jamais un Prix indicatif Dossier avec un autre Dossier', async () => {
        const orphanReference =
            await createActiveProductReference({
                actorId:
                    owner.owner._id,
                name:
                    'Produit indicatif isolé M003',
                referenceName:
                    'Produit indicatif isolé M003',
                referenceUnit:
                    'KG',
            });
        const variantId =
            orphanReference.variant._id.toString();

        await request(app)
            .put(
                pricingPath(dossierA)
                + '/indicative-prices/'
                + variantId,
            )
            .set(bearer(owner.token))
            .send({
                sourceAmount: '4.2',
                sourceBasis: 'KG',
            })
            .expect(200);

        const resolved = await request(app)
            .get(
                pricingPath(dossierB)
                + '/applicable',
            )
            .query({
                productVariantId:
                    variantId,
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

    it('retombe sur le Tarif fournisseur avant tout Prix indicatif', async () => {
        await request(app)
            .put(
                '/api/workspaces/'
                + owner.workspace._id.toString()
                + '/supplier-pricing/indicative-prices/'
                + productReference.variant._id.toString(),
            )
            .set(bearer(owner.token))
            .send({
                sourceAmount: '19',
                sourceBasis: 'KG',
            })
            .expect(200);

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

    it('valorise avec le dernier tarif expiré en signalant sa date sans le préférer à un tarif valide', async () => {
        const addTariff = async (amount, from, to) => SupplierTariff.create({
            supplierArticle: article.id,
            scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
            workspace: owner.workspace._id,
            sourceKind: 'PRICE_LIST',
            sourceLabel: 'Prix fournisseur historiques',
            sourceImportId: new mongoose.Types.ObjectId(),
            isCurrent: true,
            sourceAmount: amount,
            sourceBasis: 'KG',
            currency: 'EUR',
            validFrom: new Date(from + 'T00:00:00.000Z'),
            validTo: new Date(to + 'T00:00:00.000Z'),
            createdBy: owner.owner._id,
            updatedBy: owner.owner._id,
        });

        await addTariff('8', '2026-01-01', '2026-02-28');
        await addTariff('12', '2026-03-01', '2026-09-30');
        const route = pricingPath(dossierA) + '/applicable';
        const atDate = '2026-10-14T10:00:00.000Z';
        const expired = await request(app).get(route).query({
            articleId: article.id, atDate,
        }).set(bearer(owner.token));
        expect(expired.status).toBe(200);
        expect(expired.body.data.applicablePrice).toMatchObject({
            resolvedSource: 'SUPPLIER_TARIFF',
            fallbackApplied: true,
            fallbackReason: 'LAST_KNOWN_SUPPLIER_TARIFF_EXPIRED',
            price: {
                normalizedAmount: '12',
                validityStatus: 'EXPIRED',
            },
        });
        expect(expired.body.data.applicablePrice.alerts)
            .toContain('LAST_KNOWN_SUPPLIER_TARIFF_EXPIRED');

        await addTariff('14', '2026-10-01', '2026-12-31');
        const valid = await request(app).get(route).query({
            articleId: article.id, atDate,
        }).set(bearer(owner.token));
        expect(valid.status).toBe(200);
        expect(valid.body.data.applicablePrice.price).toMatchObject({
            normalizedAmount: '14',
            validityStatus: 'AVAILABLE',
        });
        expect(valid.body.data.applicablePrice.alerts)
            .not.toContain('LAST_KNOWN_SUPPLIER_TARIFF_EXPIRED');
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
