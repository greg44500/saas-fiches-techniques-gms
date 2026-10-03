import '../../setup.js';

import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    PRODUCT_CHARACTERISTIC_KIND,
    PRODUCT_REVIEW_QUEUE_TYPE,
} from '../../../modules/productCatalog/productCatalog.registry.js';
import {
    createGlobalVariant,
    updateVariant,
} from '../../../modules/productCatalog/productCatalogGovernance.service.js';
import {
    createWorkspaceVariant,
} from '../../../modules/productCatalog/productCatalog.service.js';
import {
    createProductVariety,
} from '../../../modules/productCatalog/productReferenceDimension.service.js';
import {
    reviewReferenceContribution,
    submitReferenceContribution,
} from '../../../modules/productCatalog/productReferenceContribution.service.js';
import {
    listProductReviewQueue,
} from '../../../modules/productCatalog/productReferenceReviewQueue.service.js';
import {
    markProductDimensionReviewed,
} from '../../../modules/productCatalog/productReferenceReview.service.js';
import {
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';
import {
    createActiveProductReference,
} from '../../helpers/productCatalogTest.fixtures.js';

let ownerContext;
let otherContext;

beforeEach(async () => {
    ownerContext = await createWorkspaceOwnerFixture();
    otherContext = await createWorkspaceOwnerFixture();
});

describe('M-002 unified product review queue', () => {
    it('agrège les Contributions et Dimensions à vérifier sans doublonner une valeur provisoire', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Pomme gouvernance file',
        });

        const variety = await createProductVariety({
            actorId: ownerContext.owner._id,
            workspaceId: ownerContext.workspace._id,
            productId: reference.product._id,
            name: 'Gala locale',
        });

        const contribution = await submitReferenceContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            type: 'CHARACTERISTIC',
            productId: reference.product._id,
            characteristicKind:
                PRODUCT_CHARACTERISTIC_KIND.QUALITY_DESIGNATION,
            value: 'Qualité pilote',
        });

        expect(contribution.classification).toBe('PROVISIONAL');

        const result = await listProductReviewQueue({});

        expect(result.summary).toEqual({
            total: 2,
            productCount: 0,
            referenceCount: 0,
            dimensionCount: 2,
        });
        expect(result.items).toHaveLength(2);

        expect(result.items).toEqual(expect.arrayContaining([
            expect.objectContaining({
                type: PRODUCT_REVIEW_QUEUE_TYPE.DIMENSION_REVIEW,
                sourceId: variety.id,
                targetId: variety.id,
                dataType: 'DIMENSION',
                dimensionType: 'VARIETY',
                value: 'Gala locale',
                product: expect.objectContaining({
                    name: 'Pomme gouvernance file',
                }),
                workspace: expect.objectContaining({
                    id: ownerContext.workspace._id.toString(),
                }),
            }),
            expect.objectContaining({
                type: PRODUCT_REVIEW_QUEUE_TYPE.CONTRIBUTION,
                sourceId: contribution.contribution.id,
                targetId: contribution.provisionalReference.id,
                dataType: 'DIMENSION',
                contributionType: 'CHARACTERISTIC',
                value: 'Qualité pilote',
            }),
        ]));

        expect(result.items).not.toEqual(expect.arrayContaining([
            expect.objectContaining({
                type: PRODUCT_REVIEW_QUEUE_TYPE.DIMENSION_REVIEW,
                value: 'Qualité pilote',
            }),
        ]));
    });

    it('relie une proposition de nouveau Produit à son Produit provisoire', async () => {
        const categoryReference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Produit témoin file nouveau Produit',
        });

        const submitted = await submitReferenceContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            type: 'CANONICAL_PRODUCT',
            value: 'Betterave file provisoire',
            categoryId: categoryReference.category._id,
            variant: {
                name: 'Betterave file provisoire',
                conservationType: 'FRAIS',
                foodRange: 1,
                referenceUnit: 'KG',
            },
        });

        const result = await listProductReviewQueue({
            type: PRODUCT_REVIEW_QUEUE_TYPE.CONTRIBUTION,
        });

        expect(result.items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    sourceId: submitted.contribution.id,
                    targetId: submitted.provisionalReference.id,
                    dataType: 'PRODUCT',
                    value: 'Betterave file provisoire',
                    productId: submitted.provisionalReference.id,
                    product: expect.objectContaining({
                        id: submitted.provisionalReference.id,
                        name: 'Betterave file provisoire',
                    }),
                }),
            ]),
        );
    });

    it('présente une nouvelle Référence Workspace comme donnée à contrôler avec son rapprochement', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Pomme gouvernance Référence',
        });

        const gala = await createGlobalVariant({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            variant: {
                name: 'Gala',
                conservationType: 'FRAIS',
                foodRange: 1,
                referenceUnit: 'KG',
                characteristicIds: [],
            },
        });

        const warning = await createWorkspaceVariant({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            variant: {
                name: 'Galla',
                conservationType: 'FRAIS',
                foodRange: 1,
                referenceUnit: 'KG',
                characteristicIds: [],
            },
        });

        expect(warning).toMatchObject({
            classification: 'USER_CONFIRMATION_REQUIRED',
            candidates: [
                expect.objectContaining({
                    id: gala.id,
                    name: 'Gala',
                }),
            ],
        });

        const created = await createWorkspaceVariant({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            forceCreate: true,
            reviewedCandidateIds: [gala.id],
            variant: {
                name: 'Galla',
                conservationType: 'FRAIS',
                foodRange: 1,
                referenceUnit: 'KG',
                characteristicIds: [],
            },
        });

        expect(created).toMatchObject({
            classification: 'PROVISIONAL',
            variant: {
                name: 'Galla',
                governanceStatus: 'PROVISIONAL',
            },
            contribution: {
                type: 'VARIANT',
                status: 'PENDING_REVIEW',
            },
        });

        const queue = await listProductReviewQueue({});
        expect(queue.items).toEqual(expect.arrayContaining([
            expect.objectContaining({
                sourceId: created.contribution.id,
                targetId: created.variant.id,
                dataType: 'REFERENCE',
                value: 'Galla',
                productId: reference.product._id.toString(),
                candidates: [
                    expect.objectContaining({
                        id: gala.id,
                        name: 'Gala',
                    }),
                ],
            }),
        ]));

        await updateVariant({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            variantId: created.variant.id,
            changes: {
                name: 'Galla corrigée',
            },
        });

        const correctedQueue = await listProductReviewQueue({});
        expect(correctedQueue.items).toEqual(expect.arrayContaining([
            expect.objectContaining({
                sourceId: created.contribution.id,
                value: 'Galla corrigée',
            }),
        ]));

        await reviewReferenceContribution({
            contributionId: created.contribution.id,
            actorId: ownerContext.owner._id,
            decision: 'MERGE',
            targetReferenceId: gala.id,
        });

        expect((await listProductReviewQueue({})).items)
            .not.toEqual(expect.arrayContaining([
                expect.objectContaining({
                    sourceId: created.contribution.id,
                }),
            ]));
    });

    it('filtre par type et Workspace avec une pagination serveur', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Produit file filtrée',
        });

        await createProductVariety({
            actorId: ownerContext.owner._id,
            workspaceId: ownerContext.workspace._id,
            productId: reference.product._id,
            name: 'Variété A',
        });
        await createProductVariety({
            actorId: otherContext.owner._id,
            workspaceId: otherContext.workspace._id,
            productId: reference.product._id,
            name: 'Variété B',
        });

        const result = await listProductReviewQueue({
            type: PRODUCT_REVIEW_QUEUE_TYPE.DIMENSION_REVIEW,
            workspaceId: ownerContext.workspace._id,
            page: 1,
            limit: 1,
        });

        expect(result.summary).toMatchObject({
            total: 1,
            productCount: 0,
            referenceCount: 0,
            dimensionCount: 1,
        });
        expect(result.pagination).toEqual({
            page: 1,
            limit: 1,
            total: 1,
            totalPages: 1,
        });
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toMatchObject({
            value: 'Variété A',
            workspaceId: ownerContext.workspace._id.toString(),
        });
        expect(result.origins).toEqual(expect.arrayContaining([
            expect.objectContaining({
                id: ownerContext.workspace._id.toString(),
                count: 1,
            }),
            expect.objectContaining({
                id: otherContext.workspace._id.toString(),
                count: 1,
            }),
        ]));
    });

    it('retire une Dimension de la file après sa revue', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Produit revue directe',
        });
        const variety = await createProductVariety({
            actorId: ownerContext.owner._id,
            workspaceId: ownerContext.workspace._id,
            productId: reference.product._id,
            name: 'Variété à valider',
        });

        expect((await listProductReviewQueue({})).summary.total).toBe(1);

        await markProductDimensionReviewed({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            type: 'VARIETY',
            dimensionId: variety.id,
        });

        expect((await listProductReviewQueue({})).summary.total).toBe(0);
    });

    it('refuse une seconde décision sur une Contribution déjà traitée', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Produit décision terminale',
        });
        const submitted = await submitReferenceContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            type: 'CHARACTERISTIC',
            productId: reference.product._id,
            characteristicKind:
                PRODUCT_CHARACTERISTIC_KIND.QUALITY_DESIGNATION,
            value: 'Qualité terminale',
        });

        await reviewReferenceContribution({
            contributionId: submitted.contribution.id,
            actorId: ownerContext.owner._id,
            decision: 'APPROVE',
        });

        await expect(
            reviewReferenceContribution({
                contributionId: submitted.contribution.id,
                actorId: ownerContext.owner._id,
                decision: 'REJECT',
            }),
        ).rejects.toThrow(/Contribution à examiner introuvable/);
    });

    it('retire une Contribution de la file après décision', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Produit contribution traitée',
        });
        const submitted = await submitReferenceContribution({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            type: 'CHARACTERISTIC',
            productId: reference.product._id,
            characteristicKind:
                PRODUCT_CHARACTERISTIC_KIND.QUALITY_DESIGNATION,
            value: 'Qualité à traiter',
        });

        expect((await listProductReviewQueue({})).summary.total).toBe(1);

        await reviewReferenceContribution({
            contributionId: submitted.contribution.id,
            actorId: ownerContext.owner._id,
            decision: 'APPROVE',
        });

        expect((await listProductReviewQueue({})).summary.total).toBe(0);
    });
});
