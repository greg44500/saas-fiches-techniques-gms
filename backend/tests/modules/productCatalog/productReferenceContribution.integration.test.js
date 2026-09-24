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
    submitReferenceContribution,
} from '../../../modules/productCatalog/productReferenceContribution.service.js';
import {
    createProductVariety,
} from '../../../modules/productCatalog/productReferenceDimension.service.js';
import {
    ProductVariety,
} from '../../../modules/productCatalog/productVariety.model.js';
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
                foodRange: 1,
                referenceUnit: 'KG',
            },
        });

        expect(result.classification).toBe('REVIEW_REQUIRED');
        expect(result.contribution.status).toBe('PENDING_REVIEW');
        expect(await CanonicalProduct.countDocuments()).toBe(before);
    });
});
