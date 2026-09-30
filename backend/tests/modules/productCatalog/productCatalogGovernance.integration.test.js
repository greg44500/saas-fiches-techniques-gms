import '../../setup.js';

import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

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
    createCategory,
    createGlobalProduct,
    createGlobalVariant,
    listCategories,
    updateCategoryStatus,
    updateProductStatus,
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
            .toMatchObject({ activeProductCount: 1 });
        expect(categories.find(({ id }) => id === emptyCategory.id))
            .toMatchObject({ activeProductCount: 0 });

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
