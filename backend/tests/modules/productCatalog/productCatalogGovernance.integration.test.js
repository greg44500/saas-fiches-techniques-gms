import '../../setup.js';

import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { findCategoryNameSuggestions } from '../../../modules/productCatalog/productCategorySuggestions.service.js';
import {
    CanonicalProduct,
} from '../../../modules/productCatalog/canonicalProduct.model.js';
import {
    ProductCharacteristic,
} from '../../../modules/productCatalog/productCharacteristic.model.js';
import {
    ProductReferenceEvent,
} from '../../../modules/productCatalog/productReferenceEvent.model.js';
import {
    ProductVariant,
} from '../../../modules/productCatalog/productVariant.model.js';
import {
    TechnicalSheetDraft,
} from '../../../modules/technicalSheet/technicalSheetDraft.model.js';
import {
    SupplierArticle,
} from '../../../modules/supplierCatalog/supplier.model.js';
import {
    NegotiatedPrice,
} from '../../../modules/supplierCatalog/supplierPricing.model.js';
import {
    createCategory,
    deleteCategory,
    createGlobalProduct,
    createGlobalVariant,
    listCategories,
    mergeCategories,
    updateCategory,
    updateCategoryStatus,
    updateProductStatus,
    updateVariant,
} from '../../../modules/productCatalog/productCatalogGovernance.service.js';
import {
    attachVariantToWorkspace,
    getProductMetadata,
} from '../../../modules/productCatalog/productCatalog.service.js';
import {
    reviewReferenceContribution,
    submitReferenceContribution,
} from '../../../modules/productCatalog/productReferenceContribution.service.js';
import {
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';
import {
    createActiveProductReference,
} from '../../helpers/productCatalogTest.fixtures.js';

let ownerContext;

beforeEach(async () => {
    ownerContext = await createWorkspaceOwnerFixture();
});

describe('M-002 product reference governance', () => {
    it('bloque toute modification d’unité d’une Référence liée à un Article, même g vers kg', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Produit déjà lié à un Article',
            referenceUnit: 'G',
        });
        await SupplierArticle.create({
            scope: 'WORKSPACE_PRIVATE',
            workspace: ownerContext.workspace._id,
            supplier: ownerContext.owner._id,
            productVariant: reference.variant._id,
            supplierReference: 'COU-001',
            normalizedSupplierReference: 'cou-001',
            createdBy: ownerContext.owner._id,
            updatedBy: ownerContext.owner._id,
        });
        for (const unit of ['UNIT', 'KG']) {
            await expect(updateVariant({
                actorId: ownerContext.owner._id,
                productId: reference.product._id,
                variantId: reference.variant._id,
                changes: { referenceUnit: unit },
            })).rejects.toMatchObject({ statusCode: 409 });
        }
        expect((await ProductVariant.findById(reference.variant._id)).referenceUnit)
            .toBe('G');
    });


    it('corrige une unité sur la même Référence avec Articles fournisseur, après confirmation explicite', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Croissant de test avec erreur d’unité',
            referenceUnit: 'KG',
        });
        const article = await SupplierArticle.create({
            scope: 'WORKSPACE_PRIVATE',
            workspace: ownerContext.workspace._id,
            supplier: ownerContext.owner._id,
            productVariant: reference.variant._id,
            supplierReference: 'CRO-CORRECTION',
            normalizedSupplierReference: 'cro-correction',
            packaging: {
                containerType: 'Carton',
                unitCount: 36,
                quantityPerUnit: '120',
                unit: 'G',
                totalQuantity: '4320',
            },
            recipeUnitEquivalence: {
                unitsPerPackage: 36,
                packagingSignature: 'ancienne-preuve',
                productVariant: reference.variant._id,
                verifiedBy: ownerContext.owner._id,
                verifiedAt: new Date(),
            },
            createdBy: ownerContext.owner._id,
            updatedBy: ownerContext.owner._id,
        });
        const changed = await updateVariant({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            variantId: reference.variant._id,
            changes: {
                referenceUnit: 'UNIT',
                countUnitLabelSingular: 'pièce',
                countUnitLabelPlural: 'pièces',
                confirmSupplierArticleRevaluation: true,
            },
        });
        expect(changed.id).toBe(reference.variant._id.toString());
        expect(changed.referenceUnit).toBe('UNIT');
        const sameArticle = await SupplierArticle.findById(article._id);
        expect(sameArticle.productVariant.toString())
            .toBe(reference.variant._id.toString());
        expect(sameArticle.recipeUnitEquivalence).toBeNull();
        expect(sameArticle.packaging.unitCount).toBe(36);
        expect(sameArticle.packaging.totalQuantity.toString()).toBe('4320');

        const event = await ProductReferenceEvent.findOne({
            entityId: reference.variant._id,
            action: 'VARIANT_UPDATED',
        }).sort({ createdAt: -1 });
        expect(event.metadata).toMatchObject({
            previousReferenceUnit: 'KG',
            nextReferenceUnit: 'UNIT',
            confirmedSupplierArticleRevaluation: true,
        });
    });

    it('interdit de réécrire une unité liée à un Prix négocié archivé', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Produit prix négocié à préserver',
            referenceUnit: 'G',
        });
        const article = await SupplierArticle.create({
            scope: 'WORKSPACE_PRIVATE',
            workspace: ownerContext.workspace._id,
            supplier: ownerContext.owner._id,
            productVariant: reference.variant._id,
            supplierReference: 'P-HISTO',
            normalizedSupplierReference: 'p-histo',
            createdBy: ownerContext.owner._id,
            updatedBy: ownerContext.owner._id,
        });
        await NegotiatedPrice.create({
            workspace: ownerContext.workspace._id,
            dossier: ownerContext.workspace._id,
            supplierArticle: article._id,
            sourceAmount: '6.50',
            sourceBasis: 'PACKAGE',
            normalizedAmount: '0.0015',
            normalizedUnit: 'G',
            validFrom: new Date('2026-01-01'),
            status: 'ARCHIVED',
            createdBy: ownerContext.owner._id,
            updatedBy: ownerContext.owner._id,
        });
        await expect(updateVariant({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            variantId: reference.variant._id,
            changes: {
                referenceUnit: 'UNIT',
                confirmSupplierArticleRevaluation: true,
            },
        })).rejects.toMatchObject({ statusCode: 409 });
        expect((await ProductVariant.findById(reference.variant._id)).referenceUnit)
            .toBe('G');
    });

    it('refuse la correction confirmée si une Fiche technique dépend encore de la Référence', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Produit protégé malgré confirmation',
            referenceUnit: 'G',
        });
        await TechnicalSheetDraft.create({
            workspace: ownerContext.workspace._id,
            dossier: reference.product._id,
            technicalSheet: reference.variant._id,
            lines: [{
                kind: 'INGREDIENT',
                productVariant: reference.variant._id,
                netQuantity: '1',
                inputUnit: 'G',
                order: 0,
            }],
            createdBy: ownerContext.owner._id,
            updatedBy: ownerContext.owner._id,
        });
        await expect(updateVariant({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            variantId: reference.variant._id,
            changes: {
                referenceUnit: 'UNIT',
                confirmSupplierArticleRevaluation: true,
            },
        })).rejects.toMatchObject({ statusCode: 409 });
    });

    it('refuse une requalification gramme vers pièce lorsqu’un brouillon utilise la Référence', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Croissant protégé pour changement de dimension',
            referenceUnit: 'G',
        });
        await TechnicalSheetDraft.create({
            workspace: ownerContext.workspace._id,
            dossier: reference.product._id,
            technicalSheet: reference.variant._id,
            lines: [{
                kind: 'INGREDIENT',
                productVariant: reference.variant._id,
                netQuantity: '1',
                inputUnit: 'G',
                order: 0,
            }],
            createdBy: ownerContext.owner._id,
            updatedBy: ownerContext.owner._id,
        });
        await expect(updateVariant({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            variantId: reference.variant._id,
            changes: { referenceUnit: 'UNIT' },
        })).rejects.toMatchObject({ statusCode: 409 });
        const unchanged = await ProductVariant.findById(reference.variant._id);
        expect(unchanged.referenceUnit).toBe('G');
    });


    it('autorise la correction d’unité pour une Référence encore inutilisée', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Produit non utilisé pour changement unité',
            referenceUnit: 'G',
        });
        const updated = await updateVariant({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            variantId: reference.variant._id,
            changes: { referenceUnit: 'KG' },
        });
        expect(updated.referenceUnit).toBe('KG');
    });

    it('autorise une catégorie facultative mais refuse une catégorie fournie invalide', async () => {
        await expect(createGlobalProduct({
            actorId: ownerContext.owner._id,
            name: 'Courgette',
            categoryId: ownerContext.workspace._id,
            variant: {
                name: 'Courgette',
                conservationType: 'FRAIS',
                referenceUnit: 'KG',
            },
        })).rejects.toMatchObject({ statusCode: 409 });

        const category = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Légumes',
        });

        const created = await createGlobalProduct({
            actorId: ownerContext.owner._id,
            name: 'Courgette',
            categoryId: category.id,
            variant: {
                name: 'Courgette',
                conservationType: 'FRAIS',
                referenceUnit: 'KG',
            },
        });

        expect(created.product.status).toBe('ACTIVE');
        expect(created.variant.status).toBe('ACTIVE');

        await expect(updateCategoryStatus({
            actorId: ownerContext.owner._id,
            categoryId: category.id,
            status: 'ARCHIVED',
        })).rejects.toMatchObject({ statusCode: 409 });

        await updateProductStatus({
            actorId: ownerContext.owner._id,
            productId: created.product.id,
            status: 'ARCHIVED',
        });

        await expect(updateCategoryStatus({
            actorId: ownerContext.owner._id,
            categoryId: category.id,
            status: 'ARCHIVED',
        })).resolves.toMatchObject({ status: 'ARCHIVED' });
    });

    it('compte uniquement les Produits actifs identitaires par catégorie', async () => {
        const usedCategory = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Catégorie comptée',
        });
        const emptyCategory = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Catégorie vide',
        });

        await createGlobalProduct({
            actorId: ownerContext.owner._id,
            name: 'Produit actif compté',
            categoryId: usedCategory.id,
        });
        const archived = await createGlobalProduct({
            actorId: ownerContext.owner._id,
            name: 'Produit archivé non compté',
            categoryId: usedCategory.id,
        });
        const identityInactive = await createGlobalProduct({
            actorId: ownerContext.owner._id,
            name: 'Produit identité inactive non compté',
            categoryId: usedCategory.id,
        });

        await updateProductStatus({
            actorId: ownerContext.owner._id,
            productId: archived.product.id,
            status: 'ARCHIVED',
        });
        await CanonicalProduct.updateOne(
            { _id: identityInactive.product.id },
            { $set: { identityActive: false } },
        );

        const categories = await listCategories();
        expect(categories.find(({ id }) => id === usedCategory.id))
            .toMatchObject({ activeProductCount: 1, totalProductCount: 3 });
        expect(categories.find(({ id }) => id === emptyCategory.id))
            .toMatchObject({ activeProductCount: 0, totalProductCount: 0 });

        const globalMetadata = await getProductMetadata({
            includeArchivedCategories: true,
            includeCategoryUsage: true,
        });
        expect(
            globalMetadata.categories.find(({ id }) => id === usedCategory.id),
        ).toMatchObject({ activeProductCount: 1 });

        const workspaceMetadata = await getProductMetadata();
        expect(
            workspaceMetadata.categories.find(({ id }) => id === usedCategory.id),
        ).not.toHaveProperty('activeProductCount');
    });

    it('suggère les catégories proches et exige une confirmation avant création distincte', async () => {
        const first = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Épicerie',
        });
        const suggestions = await findCategoryNameSuggestions({ name: 'Épiserie' });
        expect(suggestions.exactMatch).toBeNull();
        expect(suggestions.candidates).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: first.id, name: 'Épicerie' }),
        ]));
        await expect(createCategory({
            actorId: ownerContext.owner._id,
            name: 'Épiserie',
        })).rejects.toMatchObject({ statusCode: 409 });
        const confirmed = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Épiserie',
            reviewedCandidateIds: [first.id],
        });
        expect(confirmed.name).toBe('Épiserie');
    });

    it('réexamine les doublons proches au renommage, y compris archivés', async () => {
        const source = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Conditionnements',
        });
        const target = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Autre famille',
        });
        await updateCategoryStatus({
            actorId: ownerContext.owner._id,
            categoryId: source.id,
            status: 'ARCHIVED',
        });
        const suggestions = await findCategoryNameSuggestions({
            name: 'Conditionnement',
            excludeCategoryId: target.id,
        });
        expect(suggestions.candidates).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: source.id, status: 'ARCHIVED' }),
        ]));
        await expect(updateCategory({
            actorId: ownerContext.owner._id,
            categoryId: target.id,
            name: 'Conditionnement',
        })).rejects.toMatchObject({ statusCode: 409 });
        const renamed = await updateCategory({
            actorId: ownerContext.owner._id,
            categoryId: target.id,
            name: 'Conditionnement',
            reviewedCandidateIds: [source.id],
        });
        expect(renamed.name).toBe('Conditionnement');
    });

    it('supprime une catégorie vide et conserve la trace de suppression', async () => {
        const empty = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Catégorie temporaire vide',
        });
        const removed = await deleteCategory({
            actorId: ownerContext.owner._id,
            categoryId: empty.id,
        });
        expect(removed.id).toBe(empty.id);
        expect((await listCategories()).some(({ id }) => id === empty.id)).toBe(false);
        const event = await ProductReferenceEvent.findOne({
            entityId: empty.id,
            action: 'CATEGORY_DELETED',
        });
        expect(event).toMatchObject({
            metadata: { name: 'Catégorie temporaire vide' },
        });
        await expect(deleteCategory({
            actorId: ownerContext.owner._id,
            categoryId: empty.id,
        })).rejects.toMatchObject({ statusCode: 404 });
    });

    it('interdit de supprimer une catégorie avec un Produit archivé ou historique', async () => {
        const category = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Catégorie anciennement utilisée',
        });
        const product = await createGlobalProduct({
            actorId: ownerContext.owner._id,
            name: 'Produit historique avec catégorie',
            categoryId: category.id,
        });
        await updateProductStatus({
            actorId: ownerContext.owner._id,
            productId: product.product.id,
            status: 'ARCHIVED',
        });
        expect((await listCategories()).find(({ id }) => id === category.id))
            .toMatchObject({ activeProductCount: 0, totalProductCount: 1 });
        await expect(deleteCategory({
            actorId: ownerContext.owner._id,
            categoryId: category.id,
        })).rejects.toMatchObject({ statusCode: 409 });
        await CanonicalProduct.updateOne(
            { _id: product.product.id },
            { $set: { identityActive: false } },
        );
        await expect(deleteCategory({
            actorId: ownerContext.owner._id,
            categoryId: category.id,
        })).rejects.toMatchObject({ statusCode: 409 });
    });

    it('fusionne les catégories en conservant l’identité cible et tous les Produits', async () => {
        const source = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Fruits de saison',
        });
        const target = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Fruits',
            reviewedCandidateIds: [source.id],
        });
        const first = await createGlobalProduct({
            actorId: ownerContext.owner._id,
            name: 'Pomme de saison à fusionner',
            categoryId: source.id,
        });
        const second = await createGlobalProduct({
            actorId: ownerContext.owner._id,
            name: 'Prune de saison à fusionner',
            categoryId: source.id,
        });
        await updateProductStatus({
            actorId: ownerContext.owner._id,
            productId: second.product.id,
            status: 'ARCHIVED',
        });

        const merged = await mergeCategories({
            actorId: ownerContext.owner._id,
            sourceCategoryId: source.id,
            targetCategoryId: target.id,
        });
        expect(merged).toMatchObject({
            sourceCategoryId: source.id,
            target: { id: target.id, name: 'Fruits' },
            movedProductCount: 2,
        });
        expect((await listCategories()).some(({ id }) => id === source.id)).toBe(false);
        expect((await listCategories()).find(({ id }) => id === target.id))
            .toMatchObject({ totalProductCount: 2, activeProductCount: 1 });
        for (const id of [first.product.id, second.product.id]) {
            expect((await CanonicalProduct.findById(id)).category.toString())
                .toBe(target.id);
        }
        const event = await ProductReferenceEvent.findOne({
            entityId: source.id,
            action: 'CATEGORY_MERGED',
        });
        expect(event).toMatchObject({
            metadata: {
                sourceName: 'Fruits de saison',
                targetCategoryId: target.id,
                targetName: 'Fruits',
                movedProductCount: 2,
            },
        });
        const renamed = await updateCategory({
            actorId: ownerContext.owner._id,
            categoryId: target.id,
            name: 'Fruits regroupés',
        });
        expect(renamed).toMatchObject({
            id: target.id,
            name: 'Fruits regroupés',
        });
    });

    it('refuse fusion identique, cible archivée ou catégorie inexistante sans déplacer les Produits', async () => {
        const source = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Source garde-fou',
        });
        const target = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Cible archivée garde-fou',
        });
        const product = await createGlobalProduct({
            actorId: ownerContext.owner._id,
            name: 'Produit garde-fou fusion catégorie',
            categoryId: source.id,
        });
        await updateCategoryStatus({
            actorId: ownerContext.owner._id,
            categoryId: target.id,
            status: 'ARCHIVED',
        });

        await expect(mergeCategories({
            actorId: ownerContext.owner._id,
            sourceCategoryId: source.id,
            targetCategoryId: source.id,
        })).rejects.toMatchObject({ statusCode: 400 });
        await expect(mergeCategories({
            actorId: ownerContext.owner._id,
            sourceCategoryId: source.id,
            targetCategoryId: target.id,
        })).rejects.toMatchObject({ statusCode: 409 });
        await expect(mergeCategories({
            actorId: ownerContext.owner._id,
            sourceCategoryId: source.id,
            targetCategoryId: ownerContext.workspace._id,
        })).rejects.toMatchObject({ statusCode: 404 });
        expect((await CanonicalProduct.findById(product.product.id)).category.toString())
            .toBe(source.id);
    });

    it('convertit la Présentation initiale en Caractéristique structurée', async () => {
        const category = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Légumes structurés',
        });

        const created = await createGlobalProduct({
            actorId: ownerContext.owner._id,
            name: 'Carotte structurée',
            categoryId: category.id,
            variant: {
                name: 'Carotte structurée râpée',
                presentation: 'Râpée',
                conservationType: 'FRAIS',
                foodRange: 1,
                referenceUnit: 'KG',
            },
        });

        const [presentation, persistedVariant] = await Promise.all([
            ProductCharacteristic.findOne({
                canonicalProduct: created.product.id,
                kind: 'PRESENTATION',
                normalizedName: 'rapee',
                identityActive: true,
            }).lean(),
            ProductVariant.findById(created.variant.id).lean(),
        ]);

        expect(presentation).not.toBeNull();
        expect(presentation.name).toBe('Râpée');
        expect(
            persistedVariant.characteristics.map((value) => value.toString()),
        ).toContain(presentation._id.toString());
        expect(ProductVariant.schema.path('presentation')).toBeUndefined();
        expect(persistedVariant.presentation).toBeUndefined();
    });

    it('ajoute directement une référence active au référentiel global', async () => {
        const category = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Épicerie',
        });
        const created = await createGlobalProduct({
            actorId: ownerContext.owner._id,
            name: 'Riz',
            categoryId: category.id,
            variant: {
                name: 'Riz',
                conservationType: 'SEC',
                referenceUnit: 'KG',
            },
        });

        const variant = await createGlobalVariant({
            actorId: ownerContext.owner._id,
            productId: created.product.id,
            variant: {
                name: 'Riz sous-vide cuit',
                conservationType: 'REFRIGERE',
                foodRange: 5,
                processingState: 'Sous-vide cuit',
                referenceUnit: 'KG',
            },
        });

        expect(variant.status).toBe('ACTIVE');
        expect(variant.processingState).toBe('Sous-vide cuit');
        expect(variant.foodRange).toBe(5);
    });

    it('conserve l origine Workspace après approbation sans en faire un ownership', async () => {
        const category = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Fruits',
        });
        const submitted = await submitReferenceContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            type: 'CANONICAL_PRODUCT',
            value: 'Pomme',
            categoryId: category.id,
            variant: {
                name: 'Pomme',
                conservationType: 'FRAIS',
                referenceUnit: 'KG',
            },
        });

        expect(submitted.classification).toBe('PROVISIONAL');
        expect(submitted.provisionalReference).toMatchObject({
            name: 'Pomme',
            governanceStatus: 'PROVISIONAL',
        });

        const approved = await reviewReferenceContribution({
            contributionId: submitted.contribution.id,
            actorId: ownerContext.owner._id,
            decision: 'APPROVE',
        });
        const persisted = await CanonicalProduct
            .findById(approved.resolutionEntityId)
            .lean();

        expect(
            persisted.contributedFromWorkspace.toString(),
        ).toBe(ownerContext.workspace._id.toString());
        expect(CanonicalProduct.schema.path('workspace')).toBeUndefined();
        expect(persisted.workspace).toBeUndefined();

        const [productEvent, variantEvent] = await Promise.all([
            ProductReferenceEvent.findOne({
                entityType: 'PRODUCT',
                entityId: persisted._id,
                action: 'PRODUCT_CREATED',
            }).lean(),
            ProductReferenceEvent.findOne({
                entityType: 'VARIANT',
                action: 'VARIANT_CREATED',
                'metadata.productId': persisted._id.toString(),
            }).lean(),
        ]);

        expect(productEvent.workspace.toString()).toBe(
            ownerContext.workspace._id.toString(),
        );
        expect(productEvent.metadata.source).toBe('WORKSPACE_CONTRIBUTION');
        expect(variantEvent.workspace.toString()).toBe(
            ownerContext.workspace._id.toString(),
        );
        expect(variantEvent.metadata.source).toBe('WORKSPACE_CONTRIBUTION');
    });

    it('n autorise pas un rattachement global archivé comme nouvelle référence', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Semoule',
        });

        await updateProductStatus({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            status: 'ARCHIVED',
        });

        await expect(attachVariantToWorkspace({
            workspaceId: ownerContext.workspace._id,
            variantId: reference.variant._id,
            actorId: ownerContext.owner._id,
        })).rejects.toMatchObject({ statusCode: 409 });
    });
});
