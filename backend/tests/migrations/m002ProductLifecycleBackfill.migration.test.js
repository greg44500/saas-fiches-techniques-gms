import '../setup.js';

import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    backfillM002LegacyProductLifecycle,
} from '../../migrations/backfillM002LegacyProductLifecycle.migration.js';
import {
    CanonicalProduct,
} from '../../modules/productCatalog/canonicalProduct.model.js';
import {
    ProductCategory,
} from '../../modules/productCatalog/productCategory.model.js';
import {
    ProductVariant,
} from '../../modules/productCatalog/productVariant.model.js';

describe('M-002 legacy product lifecycle migration', () => {
    it('active les contributions complètes et archive les données legacy incomplètes ou rejetées', async () => {
        const actorId = new mongoose.Types.ObjectId();
        const now = new Date();
        const category = await ProductCategory.create({
            name: 'Légumes migration',
            normalizedKey: 'legumes migration',
            status: 'ACTIVE',
            createdBy: actorId,
            updatedBy: actorId,
        });

        const activePendingId = new mongoose.Types.ObjectId();
        const incompletePendingId = new mongoose.Types.ObjectId();
        const rejectedId = new mongoose.Types.ObjectId();

        await CanonicalProduct.collection.insertMany([
            {
                _id: activePendingId,
                name: 'Carotte migration',
                normalizedName: 'carotte migration',
                aliases: [],
                searchKeys: ['carotte migration'],
                searchGrams: ['car'],
                category: category._id,
                status: 'PENDING_REVIEW',
                identityActive: true,
                contributedFromWorkspace: null,
                createdBy: actorId,
                updatedBy: actorId,
                createdAt: now,
                updatedAt: now,
            },
            {
                _id: incompletePendingId,
                name: 'Produit sans catégorie',
                normalizedName: 'produit sans categorie',
                aliases: [],
                searchKeys: ['produit sans categorie'],
                searchGrams: ['pro'],
                category: null,
                status: 'PENDING_REVIEW',
                identityActive: true,
                contributedFromWorkspace: null,
                createdBy: actorId,
                updatedBy: actorId,
                createdAt: now,
                updatedAt: now,
            },
            {
                _id: rejectedId,
                name: 'Ancien doublon',
                normalizedName: 'ancien doublon',
                aliases: [],
                searchKeys: ['ancien doublon'],
                searchGrams: ['anc'],
                category: category._id,
                status: 'REJECTED',
                identityActive: false,
                contributedFromWorkspace: null,
                rejectionReason: 'DUPLICATE',
                createdBy: actorId,
                updatedBy: actorId,
                createdAt: now,
                updatedAt: now,
            },
        ]);

        await ProductVariant.collection.insertMany([
            {
                canonicalProduct: activePendingId,
                name: 'Carotte migration historique',
                normalizedName: 'carotte migration historique',
                conservationType: 'FRAIS',
                normalizedForm: '',
                normalizedProcessingState: '',
                normalizedPreservation: '',
                normalizedSignature: '_|_|_',
                foodRange: null,
                referenceUnit: 'KG',
                yieldPercent: null,
                status: 'PENDING_REVIEW',
                identityActive: true,
                contributedFromWorkspace: null,
                createdBy: actorId,
                updatedBy: actorId,
                createdAt: now,
                updatedAt: now,
            },
            {
                canonicalProduct: incompletePendingId,
                name: 'Produit sans catégorie historique',
                normalizedName: 'produit sans categorie historique',
                conservationType: 'FRAIS',
                normalizedForm: '',
                normalizedProcessingState: '',
                normalizedPreservation: '',
                normalizedSignature: '_|_|_',
                foodRange: null,
                referenceUnit: 'KG',
                yieldPercent: null,
                status: 'PENDING_REVIEW',
                identityActive: true,
                contributedFromWorkspace: null,
                createdBy: actorId,
                updatedBy: actorId,
                createdAt: now,
                updatedAt: now,
            },
            {
                canonicalProduct: rejectedId,
                name: 'Ancien doublon historique',
                normalizedName: 'ancien doublon historique',
                conservationType: 'FRAIS',
                normalizedForm: '',
                normalizedProcessingState: '',
                normalizedPreservation: '',
                normalizedSignature: '_|_|_',
                foodRange: null,
                referenceUnit: 'KG',
                yieldPercent: null,
                status: 'REJECTED',
                identityActive: false,
                contributedFromWorkspace: null,
                rejectionReason: 'DUPLICATE',
                createdBy: actorId,
                updatedBy: actorId,
                createdAt: now,
                updatedAt: now,
            },
        ]);

        const result = await backfillM002LegacyProductLifecycle();

        expect(result.products).toEqual({
            pendingActivated: 1,
            pendingArchived: 1,
            rejectedArchived: 1,
        });
        expect(result.variants).toEqual({
            pendingActivated: 1,
            pendingArchived: 1,
            rejectedArchived: 1,
        });

        const products = await CanonicalProduct.find({
            _id: mongoose.trusted({
                $in: [activePendingId, incompletePendingId, rejectedId],
            }),
        }).lean();
        const productById = new Map(
            products.map((product) => [product._id.toString(), product]),
        );

        expect(productById.get(activePendingId.toString()).status).toBe('ACTIVE');
        expect(productById.get(incompletePendingId.toString()).status).toBe('ARCHIVED');
        expect(productById.get(rejectedId.toString())).toEqual(
            expect.objectContaining({
                status: 'ARCHIVED',
                identityActive: false,
                rejectionReason: 'DUPLICATE',
            }),
        );

        expect(
            await ProductVariant.countDocuments({
                status: mongoose.trusted({
                    $in: ['PENDING_REVIEW', 'REJECTED'],
                }),
            }),
        ).toBe(0);
    });
});
