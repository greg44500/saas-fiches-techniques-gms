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
    createCategory,
    createGlobalProduct,
    createGlobalVariant,
    updateCategoryStatus,
    updateProductStatus,
} from '../../../modules/productCatalog/productCatalogGovernance.service.js';
import {
    attachVariantToWorkspace,
    createWorkspaceProduct,
} from '../../../modules/productCatalog/productCatalog.service.js';
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
    it('exige une catégorie active pour créer une identité globale', async () => {
        await expect(createGlobalProduct({
            actorId: ownerContext.owner._id,
            name: 'Courgette',
            categoryId: ownerContext.workspace._id,
            variant: { foodRange: 1, referenceUnit: 'KG' },
        })).rejects.toMatchObject({ statusCode: 409 });

        const category = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Légumes',
        });

        const created = await createGlobalProduct({
            actorId: ownerContext.owner._id,
            name: 'Courgette',
            categoryId: category.id,
            variant: { foodRange: 1, referenceUnit: 'KG' },
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

    it('ajoute directement une déclinaison active au référentiel global', async () => {
        const category = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Épicerie',
        });
        const created = await createGlobalProduct({
            actorId: ownerContext.owner._id,
            name: 'Riz',
            categoryId: category.id,
            variant: { foodRange: 1, referenceUnit: 'KG' },
        });

        const variant = await createGlobalVariant({
            actorId: ownerContext.owner._id,
            productId: created.product.id,
            variant: {
                foodRange: 5,
                referenceUnit: 'KG',
            },
        });

        expect(variant.status).toBe('ACTIVE');
        expect(variant.processingState).toBe('Sous-vide cuit');
        expect(variant.foodRange).toBe(5);
    });

    it('conserve l origine Workspace sans en faire un ownership du Produit', async () => {
        const category = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Fruits',
        });
        const created = await createWorkspaceProduct({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            name: 'Pomme',
            categoryId: category.id,
            variant: { foodRange: 1, referenceUnit: 'KG' },
        });

        const persisted = await CanonicalProduct
            .findById(created.product.id)
            .lean();

        expect(
            persisted.contributedFromWorkspace.toString(),
        ).toBe(ownerContext.workspace._id.toString());
        expect(CanonicalProduct.schema.path('workspace')).toBeUndefined();

        // L'origine de création reste une donnée interne d'audit.
        expect(created.product.contributedFromWorkspace).toBeUndefined();
        expect(created.product.workspace).toBeUndefined();
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
