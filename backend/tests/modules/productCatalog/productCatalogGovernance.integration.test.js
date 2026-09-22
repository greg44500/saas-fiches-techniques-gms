import '../../setup.js';

import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    approveProduct,
    approveVariant,
    createCategory,
    rejectProduct,
    updateCategoryStatus,
    updateProduct,
    updateProductStatus,
} from '../../../modules/productCatalog/productCatalogGovernance.service.js';
import {
    attachVariantToWorkspace,
    createProductContribution,
} from '../../../modules/productCatalog/productCatalog.service.js';
import {
    CanonicalProduct,
} from '../../../modules/productCatalog/canonicalProduct.model.js';
import {
    ProductVariant,
} from '../../../modules/productCatalog/productVariant.model.js';
import {
    WorkspaceProduct,
} from '../../../modules/productCatalog/workspaceProduct.model.js';
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
    it('exige une catégorie active avant validation globale', async () => {
        const contribution = await createProductContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            name: 'Courgette',
            variant: { referenceUnit: 'KG' },
        });

        await expect(approveProduct({
            actorId: ownerContext.owner._id,
            productId: contribution.product.id,
        })).rejects.toMatchObject({ statusCode: 409 });

        const category = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Légumes',
        });

        await updateProduct({
            actorId: ownerContext.owner._id,
            productId: contribution.product.id,
            categoryId: category.id,
        });

        const product = await approveProduct({
            actorId: ownerContext.owner._id,
            productId: contribution.product.id,
        });
        const variant = await approveVariant({
            actorId: ownerContext.owner._id,
            productId: contribution.product.id,
            variantId: contribution.variant.id,
        });

        expect(product.status).toBe('ACTIVE');
        expect(variant.status).toBe('ACTIVE');

        await expect(updateCategoryStatus({
            actorId: ownerContext.owner._id,
            categoryId: category.id,
            status: 'ARCHIVED',
        })).rejects.toMatchObject({ statusCode: 409 });

        await updateProductStatus({
            actorId: ownerContext.owner._id,
            productId: product.id,
            status: 'ARCHIVED',
        });

        await expect(updateCategoryStatus({
            actorId: ownerContext.owner._id,
            categoryId: category.id,
            status: 'ARCHIVED',
        })).resolves.toMatchObject({ status: 'ARCHIVED' });
    });

    it('repoint un rattachement PENDING rejeté comme doublon', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Carotte',
        });
        const pending = await createProductContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            name: 'Carote',
            reviewedCandidateIds: [reference.product._id.toString()],
            variant: { referenceUnit: 'KG' },
        });

        await rejectProduct({
            actorId: ownerContext.owner._id,
            productId: pending.product.id,
            reason: 'DUPLICATE',
            replacementVariantId: reference.variant._id,
        });

        const rejectedProduct = await CanonicalProduct.findById(
            pending.product.id,
        ).lean();
        const rejectedVariant = await ProductVariant.findById(
            pending.variant.id,
        ).lean();

        expect(rejectedProduct.status).toBe('REJECTED');
        expect(rejectedProduct.identityActive).toBe(false);
        expect(rejectedVariant.status).toBe('REJECTED');

        const replacementEntry = await WorkspaceProduct.findOne({
            workspace: ownerContext.workspace._id,
            productVariant: reference.variant._id,
        }).lean();
        const sourceEntry = await WorkspaceProduct.findOne({
            workspace: ownerContext.workspace._id,
            productVariant: pending.variant.id,
        }).lean();

        expect(replacementEntry.status).toBe('ACTIVE');
        expect(sourceEntry.status).toBe('ARCHIVED');
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
