import '../../setup.js';

import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    BUSINESS_ACTIVITY_ACTION,
} from '../../../modules/businessActivity/businessActivity.registry.js';
import {
    BusinessActivityEvent,
} from '../../../modules/businessActivity/businessActivity.model.js';
import {
    approveProduct,
    approveVariant,
    createCategory,
    updateProduct,
} from '../../../modules/productCatalog/productCatalogGovernance.service.js';
import {
    archiveVariantFromWorkspace,
    attachVariantToWorkspace,
    createProductContribution,
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
    it('crée atomiquement Produit, Déclinaison et rattachement PENDING', async () => {
        const contribution = await createProductContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            name: 'Carotte',
            aliases: ['Carottes'],
            variant: {
                form: 'râpée',
                preservation: 'fraîche',
                referenceUnit: 'KG',
                yieldPercent: 100,
            },
        });

        expect(contribution.product.status).toBe('PENDING_REVIEW');
        expect(contribution.variant.status).toBe('PENDING_REVIEW');
        expect(contribution.workspaceEntry.status).toBe('ACTIVE');

        const actions = (
            await BusinessActivityEvent.find({
                workspace: ownerContext.workspace._id,
            }).lean()
        ).map(({ action }) => action);

        expect(actions).toContain(
            BUSINESS_ACTIVITY_ACTION.PRODUCT_CONTRIBUTION_SUBMITTED,
        );
    });

    it('refuse un doublon exact normalisé', async () => {
        await createProductContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            name: 'Carotte',
            aliases: ['Carottes'],
            variant: { referenceUnit: 'KG' },
        });

        await expect(createProductContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            name: ' CAROTTE ',
            variant: { referenceUnit: 'KG' },
        })).rejects.toMatchObject({
            statusCode: 409,
            code: 'PRODUCT_EXACT_DUPLICATE',
        });
    });

    it('exige une revue explicite pour un Produit proche', async () => {
        const first = await createProductContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            name: 'Carotte',
            variant: { referenceUnit: 'KG' },
        });

        await expect(createProductContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            name: 'Carote',
            variant: { referenceUnit: 'KG' },
        })).rejects.toMatchObject({
            statusCode: 409,
            code: 'PRODUCT_DUPLICATE_REVIEW_REQUIRED',
        });

        const second = await createProductContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            name: 'Carote',
            reviewedCandidateIds: [first.product.id],
            variant: { referenceUnit: 'KG' },
        });

        expect(second.product.name).toBe('Carote');
    });

    it('n expose pas une contribution PENDING à un autre Workspace', async () => {
        const contribution = await createProductContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            name: 'Topinambour',
            variant: { referenceUnit: 'KG' },
        });

        const other = await createWorkspaceOwnerFixture();

        const hidden = await listProductSearch({
            workspaceId: other.workspace._id,
            scope: 'REFERENCE',
        });
        expect(hidden.results).toHaveLength(0);

        const category = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Légumes',
        });

        await updateProduct({
            actorId: ownerContext.owner._id,
            productId: contribution.product.id,
            categoryId: category.id,
        });
        await approveProduct({
            actorId: ownerContext.owner._id,
            productId: contribution.product.id,
        });
        await approveVariant({
            actorId: ownerContext.owner._id,
            productId: contribution.product.id,
            variantId: contribution.variant.id,
        });

        const visible = await listProductSearch({
            workspaceId: other.workspace._id,
            scope: 'REFERENCE',
        });

        expect(visible.results).toHaveLength(1);
        expect(visible.results[0].product.name).toBe('Topinambour');
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
});
