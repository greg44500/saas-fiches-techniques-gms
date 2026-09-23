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
    createCategory,
    updateProductStatus,
} from '../../../modules/productCatalog/productCatalogGovernance.service.js';
import {
    archiveVariantFromWorkspace,
    attachVariantToWorkspace,
    createWorkspaceProduct,
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
let category;

beforeEach(async () => {
    ownerContext = await createWorkspaceOwnerFixture();
    category = await createCategory({
        actorId: ownerContext.owner._id,
        name: 'Légumes',
    });
});

const createWorkspaceReference = (overrides = {}) => createWorkspaceProduct({
    workspaceId: ownerContext.workspace._id,
    actorId: ownerContext.owner._id,
    name: 'Carotte',
    aliases: ['Carottes'],
    categoryId: category.id,
    variant: { foodRange: 1, referenceUnit: 'KG' },
    ...overrides,
});

describe('M-002 product catalog services', () => {
    it('crée atomiquement Produit, Déclinaison et rattachement ACTIVE', async () => {
        const created = await createWorkspaceReference({
            variant: {
                presentation: 'râpée',
                foodRange: 1,
                referenceUnit: 'KG',
                yieldPercent: 100,
            },
        });

        expect(created.product.status).toBe('ACTIVE');
        expect(created.variant.status).toBe('ACTIVE');
        expect(created.variant.presentation).toBe('râpée');
        expect(created.variant.processingState).toBe('Produit frais');
        expect(created.variant.foodRange).toBe(1);
        expect(created.workspaceEntry.status).toBe('ACTIVE');

        const actions = (
            await BusinessActivityEvent.find({
                workspace: ownerContext.workspace._id,
            }).lean()
        ).map(({ action }) => action);

        expect(actions).toContain(
            BUSINESS_ACTIVITY_ACTION.PRODUCT_REFERENCE_CREATED,
        );
    });

    it('rollback toute la création si la déclinaison échoue', async () => {
        await expect(createWorkspaceReference({
            name: 'Produit rollback',
            variant: { referenceUnit: 'INVALID' },
        })).rejects.toThrow();

        const { CanonicalProduct } = await import(
            '../../../modules/productCatalog/canonicalProduct.model.js'
        );

        expect(
            await CanonicalProduct.countDocuments({
                name: 'Produit rollback',
            }),
        ).toBe(0);
    });

    it('refuse un doublon exact normalisé', async () => {
        await createWorkspaceReference();

        await expect(createWorkspaceReference({
            name: ' CAROTTE ',
            aliases: [],
        })).rejects.toMatchObject({
            statusCode: 409,
            code: 'PRODUCT_EXACT_DUPLICATE',
        });
    });

    it('exige une revue explicite des Produits proches', async () => {
        const first = await createWorkspaceReference();

        await expect(createWorkspaceReference({
            name: 'Carote',
            aliases: [],
        })).rejects.toMatchObject({
            statusCode: 409,
            code: 'PRODUCT_DUPLICATE_REVIEW_REQUIRED',
        });

        const second = await createWorkspaceReference({
            name: 'Carote',
            aliases: [],
            reviewedCandidateIds: [first.product.id],
        });

        expect(second.product.name).toBe('Carote');
        expect(second.product.status).toBe('ACTIVE');
    });

    it('rend immédiatement une nouvelle identité visible aux autres Workspaces', async () => {
        await createWorkspaceReference({
            name: 'Topinambour',
            aliases: [],
        });
        const other = await createWorkspaceOwnerFixture();

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

    it('conserve une référence globale archivée déjà rattachée au Workspace', async () => {
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

        expect(workspaceSearch.results).toHaveLength(1);
        expect(workspaceSearch.results[0].product.status).toBe('ARCHIVED');
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
