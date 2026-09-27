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
    reviewReferenceContribution,
    submitReferenceContribution,
} from '../../../modules/productCatalog/productReferenceContribution.service.js';
import {
    createProductCharacteristic,
    createProductVariety,
} from '../../../modules/productCatalog/productReferenceDimension.service.js';
import {
    createCategory,
    updateCategoryStatus,
} from '../../../modules/productCatalog/productCatalogGovernance.service.js';
import {
    ProductVariety,
} from '../../../modules/productCatalog/productVariety.model.js';
import {
    ProductCharacteristic,
} from '../../../modules/productCatalog/productCharacteristic.model.js';
import {
    ReferenceContribution,
} from '../../../modules/productCatalog/referenceContribution.model.js';
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

describe('M-002 contribution semi-automatique', () => {
    it('classe une faute mineure de Variété comme EXISTING sans la persister', async () => {
        const reference = await createActiveProductReference({
            name: 'Pomme contribution typo',
        });
        const reinette = await createProductVariety({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            name: 'Reinette',
        });

        const result = await submitReferenceContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            type: 'VARIETY',
            productId: reference.product._id,
            value: 'Reinnette',
        });

        expect(result.classification).toBe('EXISTING');
        expect(result.existingReference.id).toBe(reinette.id);
        expect(await ReferenceContribution.countDocuments()).toBe(0);
        expect(await ProductVariety.countDocuments({
            canonicalProduct: reference.product._id,
        })).toBe(1);
    });

    it('auto-publie une nouvelle Variété non conflictuelle', async () => {
        const reference = await createActiveProductReference({
            name: 'Pomme contribution auto',
        });

        const result = await submitReferenceContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            type: 'VARIETY',
            productId: reference.product._id,
            value: 'Gala',
        });

        expect(result.classification).toBe('AUTO_PUBLISHABLE');
        expect(result.publishedReference).toMatchObject({
            type: 'VARIETY',
            name: 'Gala',
        });
        expect(await ReferenceContribution.countDocuments()).toBe(0);
    });

    it('envoie une désignation de qualité en revue au lieu de créer une référence', async () => {
        const reference = await createActiveProductReference({
            name: 'Carotte contribution revue',
        });

        const result = await submitReferenceContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            type: 'CHARACTERISTIC',
            productId: reference.product._id,
            characteristicKind: 'QUALITY_DESIGNATION',
            value: 'Carottes des sables',
        });

        expect(result.classification).toBe('REVIEW_REQUIRED');
        expect(result.contribution).toMatchObject({
            status: 'PENDING_REVIEW',
            characteristicKind: 'QUALITY_DESIGNATION',
        });
        expect(await ReferenceContribution.countDocuments()).toBe(1);
    });

    it('envoie un nouveau CanonicalProduct en revue sans le publier', async () => {
        const reference = await createActiveProductReference({
            name: 'Produit témoin contribution',
        });
        const before = await CanonicalProduct.countDocuments();

        const result = await submitReferenceContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            type: 'CANONICAL_PRODUCT',
            value: 'Betterave Chioggia',
            categoryId: reference.category._id,
            variant: {
                name: 'Betterave Chioggia',
                conservationType: 'FRAIS',
                foodRange: 1,
                referenceUnit: 'KG',
            },
        });

        expect(result.classification).toBe('REVIEW_REQUIRED');
        expect(result.contribution.status).toBe('PENDING_REVIEW');
        expect(await CanonicalProduct.countDocuments()).toBe(before);
    });
    it('revalide une contribution avant approbation et réutilise l existant', async () => {
        const reference = await createActiveProductReference({
            name: 'Carotte contribution concurrence',
        });
        const submitted = await submitReferenceContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            type: 'CHARACTERISTIC',
            productId: reference.product._id,
            characteristicKind: 'QUALITY_DESIGNATION',
            value: 'Carottes des sables',
        });

        const existing = await createProductCharacteristic({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            kind: 'QUALITY_DESIGNATION',
            name: 'Carottes des sables',
        });

        const approved = await reviewReferenceContribution({
            contributionId: submitted.contribution.id,
            actorId: ownerContext.owner._id,
            decision: 'APPROVE',
        });

        expect(approved).toMatchObject({
            status: 'APPROVED',
            resolutionEntityType: 'CHARACTERISTIC',
            resolutionEntityId: existing.id,
        });
        expect(await ProductCharacteristic.countDocuments({
            canonicalProduct: reference.product._id,
            kind: 'QUALITY_DESIGNATION',
        })).toBe(1);
    });

    it('rollback l approbation si le contexte devient invalide', async () => {
        const category = await createCategory({
            actorId: ownerContext.owner._id,
            name: 'Catégorie contribution invalidée',
        });
        const submitted = await submitReferenceContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            type: 'CANONICAL_PRODUCT',
            value: 'Produit à revalider',
            categoryId: category.id,
            variant: {
                name: 'Produit à revalider',
                conservationType: 'FRAIS',
                foodRange: 1,
                referenceUnit: 'KG',
            },
        });

        await updateCategoryStatus({
            actorId: ownerContext.owner._id,
            categoryId: category.id,
            status: 'ARCHIVED',
        });

        await expect(reviewReferenceContribution({
            contributionId: submitted.contribution.id,
            actorId: ownerContext.owner._id,
            decision: 'APPROVE',
        })).rejects.toMatchObject({ statusCode: 409 });

        const contribution = await ReferenceContribution.findById(
            submitted.contribution.id,
        ).lean();

        expect(contribution.status).toBe('PENDING_REVIEW');
        expect(await CanonicalProduct.exists({
            name: 'Produit à revalider',
        })).toBeNull();
    });

});
