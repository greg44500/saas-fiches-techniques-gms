import '../../setup.js';

import mongoose from 'mongoose';

import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    ProductReferenceEvent,
} from '../../../modules/productCatalog/productReferenceEvent.model.js';
import {
    ProductVariant,
} from '../../../modules/productCatalog/productVariant.model.js';
import {
    WorkspaceProduct,
} from '../../../modules/productCatalog/workspaceProduct.model.js';
import {
    createGlobalVariant,
} from '../../../modules/productCatalog/productCatalogGovernance.service.js';
import {
    mergeProductVariants,
    previewProductVariantMerge,
} from '../../../modules/productCatalog/productVariantMerge.service.js';
import {
    Supplier,
    SupplierArticle,
} from '../../../modules/supplierCatalog/supplier.model.js';
import {
    SupplierCatalogLine,
} from '../../../modules/supplierCatalog/supplierCatalog.model.js';
import {
    IndicativePrice,
} from '../../../modules/supplierCatalog/supplierPricing.model.js';
import {
    setIndicativePrice,
} from '../../../modules/supplierCatalog/supplierPricing.service.js';
import {
    TechnicalSheetDraft,
} from '../../../modules/technicalSheet/technicalSheetDraft.model.js';
import {
    TechnicalSheetValidation,
} from '../../../modules/technicalSheet/technicalSheetValidation.model.js';
import {
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';
import {
    createActiveProductReference,
} from '../../helpers/productCatalogTest.fixtures.js';

let actorContext;

const decimal = (value) => mongoose.Types.Decimal128.fromString(value);

const createMergePair = async ({
    retainedName = 'Amande poudre blanche fusion',
    replacedName = 'Amande poudre brute fusion',
    retainedYield = 100,
    replacedYield = 100,
    retainedUnit = 'KG',
    replacedUnit = 'KG',
} = {}) => {
    const base = await createActiveProductReference({
        actorId: actorContext.owner._id,
        name: 'Amande fusion contrôlée',
        referenceName: retainedName,
        referenceUnit: retainedUnit,
        yieldPercent: retainedYield,
        conservationType: 'SEC',
    });

    const replaced = await createGlobalVariant({
        actorId: actorContext.owner._id,
        productId: base.product._id,
        variant: {
            name: replacedName,
            conservationType: 'SEC',
            referenceUnit: replacedUnit,
            yieldPercent: replacedYield,
        },
    });

    return {
        product: base.product,
        retained: base.variant,
        replaced,
    };
};

beforeEach(async () => {
    actorContext = await createWorkspaceOwnerFixture();
});

describe('M-002 fusion contrôlée des Références Produit', () => {
    it('prévisualise puis fusionne deux Références compatibles sans supprimer la source', async () => {
        const pair = await createMergePair();

        const preview = await previewProductVariantMerge({
            productId: pair.product._id,
            retainedVariantId: pair.retained._id,
            replacedVariantId: pair.replaced.id,
            targetName: 'Poudre d’amandes fusion',
        });

        expect(preview.canMerge).toBe(true);
        expect(preview.conflicts).toEqual([]);
        expect(preview.retained.id).toBe(pair.retained._id.toString());
        expect(preview.replaced.id).toBe(pair.replaced.id);
        expect(preview.previewFingerprint).toMatch(/^[a-f\d]{64}$/);

        const result = await mergeProductVariants({
            actorId: actorContext.owner._id,
            productId: pair.product._id,
            retainedVariantId: pair.retained._id,
            replacedVariantId: pair.replaced.id,
            targetName: 'Poudre d’amandes fusion',
            previewFingerprint: preview.previewFingerprint,
        });

        expect(result.retained).toMatchObject({
            id: pair.retained._id.toString(),
            name: 'Poudre d’amandes fusion',
            status: 'ACTIVE',
            governanceStatus: 'APPROVED',
        });

        const [retained, replaced, event] = await Promise.all([
            ProductVariant.findById(pair.retained._id).lean(),
            ProductVariant.findById(pair.replaced.id).lean(),
            ProductReferenceEvent.findOne({
                action: 'VARIANT_MERGED',
                entityId: pair.product._id,
            }).lean(),
        ]);

        expect(retained).toMatchObject({
            name: 'Poudre d’amandes fusion',
            identityActive: true,
            status: 'ACTIVE',
        });
        expect(replaced).toMatchObject({
            identityActive: false,
            status: 'ARCHIVED',
            governanceStatus: 'RESOLVED',
            replacementVariant: pair.retained._id,
        });
        expect(event.metadata).toMatchObject({
            retainedVariantId: pair.retained._id.toString(),
            replacedVariantId: pair.replaced.id,
        });

        await expect(previewProductVariantMerge({
            productId: pair.product._id,
            retainedVariantId: pair.retained._id,
            replacedVariantId: pair.replaced.id,
        })).rejects.toMatchObject({ statusCode: 409 });
    });

    it('bloque une fusion qui modifierait l’unité ou le rendement', async () => {
        const pair = await createMergePair({
            retainedYield: 100,
            replacedYield: 80,
        });

        const preview = await previewProductVariantMerge({
            productId: pair.product._id,
            retainedVariantId: pair.retained._id,
            replacedVariantId: pair.replaced.id,
        });

        expect(preview.canMerge).toBe(false);
        expect(preview.conflicts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    code: 'CALCULATION_IDENTITY_MISMATCH',
                    field: 'yieldPercent',
                }),
            ]),
        );
    });

    it('refuse une confirmation devenue obsolète après modification concurrente', async () => {
        const pair = await createMergePair();

        const preview = await previewProductVariantMerge({
            productId: pair.product._id,
            retainedVariantId: pair.retained._id,
            replacedVariantId: pair.replaced.id,
        });

        const retained = await ProductVariant.findById(pair.retained._id);
        retained.processingState = 'Contrôle concurrence';
        retained.normalizedProcessingState = 'controle concurrence';
        retained.updatedBy = actorContext.owner._id;
        await retained.save();

        await expect(mergeProductVariants({
            actorId: actorContext.owner._id,
            productId: pair.product._id,
            retainedVariantId: pair.retained._id,
            replacedVariantId: pair.replaced.id,
            previewFingerprint: preview.previewFingerprint,
        })).rejects.toMatchObject({
            statusCode: 409,
            code: 'PRODUCT_VARIANT_MERGE_STALE_PREVIEW',
        });
    });

    it('réconcilie les dépendances actives et laisse les validations historiques inchangées', async () => {
        const pair = await createMergePair();
        const actorId = actorContext.owner._id;

        await WorkspaceProduct.create({
            workspace: actorContext.workspace._id,
            productVariant: pair.replaced.id,
            status: 'ACTIVE',
            createdBy: actorId,
            updatedBy: actorId,
        });

        const supplier = await Supplier.create({
            scope: 'GLOBAL_SHARED',
            workspace: null,
            name: 'Fournisseur fusion',
            normalizedName: 'fournisseur fusion',
            createdBy: actorId,
            updatedBy: actorId,
        });

        const article = await SupplierArticle.create({
            scope: 'GLOBAL_SHARED',
            workspace: null,
            supplier: supplier._id,
            productVariant: pair.replaced.id,
            supplierReference: 'REF-FUSION-001',
            normalizedSupplierReference: 'ref fusion 001',
            supplierDesignation: 'Amande poudre fournisseur',
            packaging: {
                containerType: 'Sac',
                totalQuantity: decimal('5'),
                unit: 'KG',
                supplierLabel: 'Sac de 5 kg',
            },
            createdBy: actorId,
            updatedBy: actorId,
        });

        const catalogLineId = new mongoose.Types.ObjectId();
        await SupplierCatalogLine.collection.insertOne({
            _id: catalogLineId,
            productVariant: new mongoose.Types.ObjectId(pair.replaced.id),
            designation: 'Ligne catalogue à préserver',
            createdBy: actorId,
            updatedBy: actorId,
        });

        await setIndicativePrice({
            productVariantId: pair.replaced.id,
            actorId,
            sourceAmount: '9.50',
            sourceBasis: 'KG',
            currency: 'EUR',
            source:
                'Référentiel de démonstration — corpus professionnel · '
                + 'm003-global-indicative-v3',
        });

        const dossierId = new mongoose.Types.ObjectId();
        const technicalSheetId = new mongoose.Types.ObjectId();
        const draft = await TechnicalSheetDraft.create({
            workspace: actorContext.workspace._id,
            dossier: dossierId,
            technicalSheet: technicalSheetId,
            revision: 4,
            lines: [{
                kind: 'INGREDIENT',
                productVariant: pair.replaced.id,
                netQuantity: decimal('1'),
                inputUnit: 'KG',
                order: 0,
                selectedSupplierArticle: article._id,
                valuation: {
                    status: 'VALUED',
                    supplierArticleId: article._id,
                    applicableSource: 'INDICATIVE_GLOBAL',
                    applicableSourceId: 'price-before-merge',
                    normalizedAmount: decimal('9.50'),
                    normalizedUnit: 'KG',
                    lineCostHt: decimal('9.50'),
                    sourceFingerprint: 'before-merge',
                },
            }],
            valuationStatus: 'COMPLETE',
            valuedAt: new Date('2026-10-08T08:00:00.000Z'),
            valuationFingerprint: 'draft-before-merge',
            economicSnapshot: {
                sentinel: 'must-be-cleared-on-draft',
            },
            createdBy: actorId,
            updatedBy: actorId,
        });

        const validationId = new mongoose.Types.ObjectId();
        await TechnicalSheetValidation.collection.insertOne({
            _id: validationId,
            linesSnapshot: [{
                productVariantId:
                    new mongoose.Types.ObjectId(pair.replaced.id),
                productVariantName: pair.replaced.name,
            }],
            sentinel: 'historique-intact',
        });

        const preview = await previewProductVariantMerge({
            productId: pair.product._id,
            retainedVariantId: pair.retained._id,
            replacedVariantId: pair.replaced.id,
        });

        expect(preview.dependencies).toMatchObject({
            supplierArticles: 1,
            supplierCatalogLines: 1,
            workspaceFavorites: 1,
            indicativePrices: 1,
            technicalSheetDrafts: 1,
            technicalSheetLines: 1,
            validatedTechnicalSheets: 1,
        });

        await mergeProductVariants({
            actorId,
            productId: pair.product._id,
            retainedVariantId: pair.retained._id,
            replacedVariantId: pair.replaced.id,
            previewFingerprint: preview.previewFingerprint,
        });

        const [
            sourceFavorite,
            targetFavorite,
            persistedArticle,
            persistedCatalogLine,
            sourcePrices,
            targetPrices,
            persistedDraft,
            historicalValidation,
        ] = await Promise.all([
            WorkspaceProduct.findOne({
                workspace: actorContext.workspace._id,
                productVariant: pair.replaced.id,
            }).lean(),
            WorkspaceProduct.findOne({
                workspace: actorContext.workspace._id,
                productVariant: pair.retained._id,
            }).lean(),
            SupplierArticle.findById(article._id).lean(),
            SupplierCatalogLine.findById(catalogLineId).lean(),
            IndicativePrice.find({
                productVariant: pair.replaced.id,
            }).lean(),
            IndicativePrice.find({
                productVariant: pair.retained._id,
            }).lean(),
            TechnicalSheetDraft.findById(draft._id).lean(),
            TechnicalSheetValidation.collection.findOne({
                _id: validationId,
            }),
        ]);

        expect(sourceFavorite.status).toBe('ARCHIVED');
        expect(targetFavorite.status).toBe('ACTIVE');

        expect(persistedArticle.productVariant.toString())
            .toBe(pair.retained._id.toString());
        expect(persistedArticle.supplierReference).toBe('REF-FUSION-001');
        expect(persistedArticle.packaging.supplierLabel).toBe('Sac de 5 kg');

        expect(persistedCatalogLine.productVariant.toString())
            .toBe(pair.retained._id.toString());
        expect(persistedCatalogLine.designation)
            .toBe('Ligne catalogue à préserver');

        expect(sourcePrices).toEqual([
            expect.objectContaining({
                status: 'ARCHIVED',
                source: expect.stringContaining('Référentiel de démonstration'),
            }),
        ]);
        expect(targetPrices).toEqual([
            expect.objectContaining({
                status: 'ACTIVE',
                source: expect.stringContaining('Référentiel de démonstration'),
            }),
        ]);
        expect(targetPrices[0].sourceAmount.toString()).toBe('9.50');

        expect(persistedDraft.revision).toBe(5);
        expect(persistedDraft.valuationStatus).toBe('STALE');
        expect(persistedDraft.valuationFingerprint).toBeNull();
        expect(persistedDraft.economicSnapshot).toBeNull();
        expect(persistedDraft.lines[0].productVariant.toString())
            .toBe(pair.retained._id.toString());
        expect(persistedDraft.lines[0].valuation.status).toBe('STALE');
        expect(persistedDraft.lines[0].valuation.sourceFingerprint).toBeNull();

        expect(
            historicalValidation.linesSnapshot[0]
                .productVariantId.toString(),
        ).toBe(pair.replaced.id);
        expect(historicalValidation.sentinel).toBe('historique-intact');
    });

    it('bloque la fusion quand deux Prix indicatifs actifs couvrent le même périmètre', async () => {
        const pair = await createMergePair();
        const actorId = actorContext.owner._id;

        await setIndicativePrice({
            productVariantId: pair.retained._id,
            actorId,
            sourceAmount: '9.10',
            sourceBasis: 'KG',
        });
        await setIndicativePrice({
            productVariantId: pair.replaced.id,
            actorId,
            sourceAmount: '9.50',
            sourceBasis: 'KG',
        });

        const preview = await previewProductVariantMerge({
            productId: pair.product._id,
            retainedVariantId: pair.retained._id,
            replacedVariantId: pair.replaced.id,
        });

        expect(preview.canMerge).toBe(false);
        expect(preview.conflicts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    code: 'INDICATIVE_PRICE_COLLISION',
                    count: 1,
                }),
            ]),
        );
    });
});
