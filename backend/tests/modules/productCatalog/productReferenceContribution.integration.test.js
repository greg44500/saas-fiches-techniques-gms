import '../../setup.js';

import mongoose from 'mongoose';

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
    ProductVariety,
} from '../../../modules/productCatalog/productVariety.model.js';
import {
    ReferenceContribution,
} from '../../../modules/productCatalog/referenceContribution.model.js';
import {
    listReferenceContributions,
    reviewReferenceContribution,
    submitReferenceContribution,
} from '../../../modules/productCatalog/productReferenceContribution.service.js';
import {
    createProductCharacteristic,
    createProductVariety,
    listProductDimensions,
} from '../../../modules/productCatalog/productReferenceDimension.service.js';
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

describe('M-002 contribution gouvernée et non bloquante', () => {
    it('demande une confirmation utilisateur pour une faute mineure sans fusion silencieuse', async () => {
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

        expect(result.classification).toBe('USER_CONFIRMATION_REQUIRED');
        expect(result.candidates).toEqual([
            expect.objectContaining({
                id: reinette.id,
                name: 'Reinette',
            }),
        ]);
        expect(await ReferenceContribution.countDocuments()).toBe(0);
        expect(await ProductVariety.countDocuments({
            canonicalProduct: reference.product._id,
        })).toBe(1);
    });

    it('crée une faute confirmée comme valeur provisoire visible seulement dans le Workspace origine', async () => {
        const otherContext = await createWorkspaceOwnerFixture();
        const reference = await createActiveProductReference({
            name: 'Pomme contribution provisoire',
        });
        await createProductVariety({
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
            forceCreate: true,
        });

        expect(result.classification).toBe('PROVISIONAL');
        expect(result.provisionalReference).toMatchObject({
            type: 'VARIETY',
            name: 'Reinnette',
            governanceStatus: 'PROVISIONAL',
        });
        expect(result.contribution).toMatchObject({
            status: 'PENDING_REVIEW',
            provisionalEntityType: 'VARIETY',
        });

        const originDimensions = await listProductDimensions({
            productId: reference.product._id,
            workspaceId: ownerContext.workspace._id,
        });
        const otherDimensions = await listProductDimensions({
            productId: reference.product._id,
            workspaceId: otherContext.workspace._id,
        });

        expect(originDimensions.varieties).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'Reinnette',
                    governanceStatus: 'PROVISIONAL',
                }),
            ]),
        );
        expect(otherDimensions.varieties).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'Reinnette' }),
            ]),
        );
    });

    it('conserve l auto-publication d une nouvelle Variété non conflictuelle', async () => {
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
            governanceStatus: 'APPROVED',
        });
        expect(await ReferenceContribution.countDocuments()).toBe(0);
    });

    it('traite des calibres numériques différents comme des identités distinctes', async () => {
        const reference = await createActiveProductReference({
            name: 'Crevette calibre contribution',
        });
        await createProductCharacteristic({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            kind: 'SIZE_FORMAT',
            name: '35/40',
        });

        const result = await submitReferenceContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            type: 'CHARACTERISTIC',
            productId: reference.product._id,
            characteristicKind: 'SIZE_FORMAT',
            value: '30/40',
        });

        expect(result.classification).toBe('AUTO_PUBLISHABLE');
        expect(result.publishedReference).toMatchObject({
            name: '30/40',
            governanceStatus: 'APPROVED',
        });
        expect(await ProductCharacteristic.countDocuments({
            canonicalProduct: reference.product._id,
            kind: 'SIZE_FORMAT',
        })).toBe(2);
    });

    it('rend immédiatement utilisable une Désignation de qualité provisoire', async () => {
        const reference = await createActiveProductReference({
            name: 'Carotte contribution provisoire',
        });

        const result = await submitReferenceContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            type: 'CHARACTERISTIC',
            productId: reference.product._id,
            characteristicKind: 'QUALITY_DESIGNATION',
            value: 'Carottes des sables',
        });

        expect(result.classification).toBe('PROVISIONAL');
        expect(result.provisionalReference).toMatchObject({
            type: 'CHARACTERISTIC',
            name: 'Carottes des sables',
            governanceStatus: 'PROVISIONAL',
        });
        expect(result.contribution).toMatchObject({
            status: 'PENDING_REVIEW',
            characteristicKind: 'QUALITY_DESIGNATION',
        });
        expect(await ReferenceContribution.countDocuments()).toBe(1);
    });

    it('crée un nouveau Produit canonique comme provisoire Workspace au lieu de bloquer le travail', async () => {
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

        expect(result.classification).toBe('PROVISIONAL');
        expect(result.contribution.status).toBe('PENDING_REVIEW');
        expect(result.provisionalReference).toMatchObject({
            name: 'Betterave Chioggia',
            governanceStatus: 'PROVISIONAL',
            variant: expect.objectContaining({
                name: 'Betterave Chioggia',
                governanceStatus: 'PROVISIONAL',
            }),
        });
        expect(await CanonicalProduct.countDocuments()).toBe(before + 1);
    });

    it('valide une valeur provisoire sans changer son identifiant', async () => {
        const reference = await createActiveProductReference({
            name: 'Carotte contribution validation',
        });
        const submitted = await submitReferenceContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            type: 'CHARACTERISTIC',
            productId: reference.product._id,
            characteristicKind: 'QUALITY_DESIGNATION',
            value: 'Carottes des sables',
        });

        const provisionalId = submitted.provisionalReference.id;
        const approved = await reviewReferenceContribution({
            contributionId: submitted.contribution.id,
            actorId: ownerContext.owner._id,
            decision: 'APPROVE',
        });

        expect(approved).toMatchObject({
            status: 'APPROVED',
            resolutionEntityType: 'CHARACTERISTIC',
            resolutionEntityId: provisionalId,
        });
        expect(await ProductCharacteristic.findById(provisionalId).lean())
            .toMatchObject({
                governanceStatus: 'APPROVED',
                identityActive: true,
            });
    });

    it('fusionne une valeur provisoire avec la valeur canonique choisie', async () => {
        const reference = await createActiveProductReference({
            name: 'Pomme contribution fusion',
        });
        const canonical = await createProductVariety({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            name: 'Reinette',
        });
        const submitted = await submitReferenceContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            type: 'VARIETY',
            productId: reference.product._id,
            value: 'Reinnette',
            forceCreate: true,
        });

        const provisionalId = submitted.provisionalReference.id;
        const merged = await reviewReferenceContribution({
            contributionId: submitted.contribution.id,
            actorId: ownerContext.owner._id,
            decision: 'MERGE',
            targetReferenceId: canonical.id,
        });

        expect(merged).toMatchObject({
            status: 'APPROVED',
            resolutionEntityType: 'VARIETY',
            resolutionEntityId: canonical.id,
        });
        expect(await ProductVariety.findById(provisionalId).lean())
            .toMatchObject({
                governanceStatus: 'RESOLVED',
                identityActive: false,
            });
    });

    it('liste les contributions même si le Workspace ou l’auteur référencé n’existe plus', async () => {
        await ReferenceContribution.create({
            type: 'CANONICAL_PRODUCT',
            workspace: new mongoose.Types.ObjectId(),
            author: new mongoose.Types.ObjectId(),
            proposedValue: 'Produit orphelin',
            normalizedValue: 'produit orphelin',
            classification: 'PROVISIONAL',
        });

        const result = await listReferenceContributions({});

        expect(result.pagination.total).toBe(1);
        expect(result.contributions).toEqual([
            expect.objectContaining({
                proposedValue: 'Produit orphelin',
                workspaceId: null,
                workspace: null,
                authorId: null,
                author: null,
            }),
        ]);
    });
});
