import '../../setup.js';

import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    updateProductStatus,
} from '../../../modules/productCatalog/productCatalogGovernance.service.js';
import {
    archiveVariantFromWorkspace,
    attachVariantToWorkspace,
    getWorkspaceProductDetail,
    listProductSearch,
} from '../../../modules/productCatalog/productCatalog.service.js';
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

describe('M-002 product catalog services', () => {
    it('trie le référentiel alphabétiquement avant pagination', async () => {
        await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Poire',
        });
        await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Carotte jaune',
        });

        const firstPage = await listProductSearch({
            workspaceId: ownerContext.workspace._id,
            scope: 'REFERENCE',
            page: 1,
            limit: 1,
        });
        const secondPage = await listProductSearch({
            workspaceId: ownerContext.workspace._id,
            scope: 'REFERENCE',
            page: 2,
            limit: 1,
        });

        expect(firstPage.results[0].product.name).toBe('Carotte jaune');
        expect(secondPage.results[0].product.name).toBe('Poire');
    });

    it('rend ajout, retrait et réactivation du catalogue idempotents', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Farine',
        });

        const first = await attachVariantToWorkspace({
            workspaceId: ownerContext.workspace._id,
            variantId: reference.variant._id,
            actorId: ownerContext.owner._id,
        });
        const second = await attachVariantToWorkspace({
            workspaceId: ownerContext.workspace._id,
            variantId: reference.variant._id,
            actorId: ownerContext.owner._id,
        });

        expect(second.id).toBe(first.id);
        expect(
            await WorkspaceProduct.countDocuments({
                workspace: ownerContext.workspace._id,
                productVariant: reference.variant._id,
            }),
        ).toBe(1);

        await archiveVariantFromWorkspace({
            workspaceId: ownerContext.workspace._id,
            variantId: reference.variant._id,
            actorId: ownerContext.owner._id,
        });

        const restored = await attachVariantToWorkspace({
            workspaceId: ownerContext.workspace._id,
            variantId: reference.variant._id,
            actorId: ownerContext.owner._id,
        });

        expect(restored.status).toBe('ACTIVE');
    });

    it('conserve une référence archivée en historique sans l afficher dans les listes opérationnelles', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Riz long',
        });

        await attachVariantToWorkspace({
            workspaceId: ownerContext.workspace._id,
            variantId: reference.variant._id,
            actorId: ownerContext.owner._id,
        });

        await updateProductStatus({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            status: 'ARCHIVED',
        });

        const workspaceSearch = await listProductSearch({
            workspaceId: ownerContext.workspace._id,
            scope: 'WORKSPACE',
        });
        const referenceSearch = await listProductSearch({
            workspaceId: ownerContext.workspace._id,
            scope: 'REFERENCE',
        });

        expect(workspaceSearch.results).toHaveLength(0);
        expect(referenceSearch.results).toHaveLength(0);

        await expect(getWorkspaceProductDetail({
            workspaceId: ownerContext.workspace._id,
            productId: reference.product._id,
        })).resolves.toMatchObject({
            product: { status: 'ARCHIVED' },
        });

        const other = await createWorkspaceOwnerFixture();

        await expect(getWorkspaceProductDetail({
            workspaceId: other.workspace._id,
            productId: reference.product._id,
        })).rejects.toMatchObject({ statusCode: 404 });
    });
});
