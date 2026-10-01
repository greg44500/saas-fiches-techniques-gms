import '../setup.js';

import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    M002_INDEX_NAMES,
    ensureM002CatalogIndexes,
} from '../../migrations/ensureM002CatalogIndexes.migration.js';
import {
    CanonicalProduct,
} from '../../modules/productCatalog/canonicalProduct.model.js';
import {
    ProductCharacteristic,
} from '../../modules/productCatalog/productCharacteristic.model.js';
import {
    PRODUCT_GOVERNANCE_STATUS,
} from '../../modules/productCatalog/productCatalog.registry.js';
import {
    ProductVariant,
} from '../../modules/productCatalog/productVariant.model.js';
import {
    ProductVariety,
} from '../../modules/productCatalog/productVariety.model.js';

describe('M-002 catalog index migration', () => {
    it('est idempotente et provisionne tous les indexes attendus', async () => {
        const first = await ensureM002CatalogIndexes();
        const second = await ensureM002CatalogIndexes();

        expect(first.totalExpected).toBe(M002_INDEX_NAMES.length);
        expect(second.totalExpected).toBe(M002_INDEX_NAMES.length);
        expect(first.ensuredCount).toBe(M002_INDEX_NAMES.length);
        expect(second.ensuredCount).toBe(M002_INDEX_NAMES.length);
    });

    it('backfill les documents legacy avec sanitizeFilter actif sans modifier updatedAt', async () => {
        const previousSanitizeFilter = mongoose.get('sanitizeFilter');
        const legacyUpdatedAt = new Date('2026-01-01T00:00:00.000Z');
        const actorId = new mongoose.Types.ObjectId();
        const productId = new mongoose.Types.ObjectId();
        const varietyId = new mongoose.Types.ObjectId();
        const characteristicId = new mongoose.Types.ObjectId();
        const variantId = new mongoose.Types.ObjectId();

        mongoose.set('sanitizeFilter', true);

        try {
            await CanonicalProduct.collection.insertOne({
                _id: productId,
                name: 'Produit legacy',
                normalizedName: 'produit legacy',
                aliases: [],
                searchKeys: ['produit legacy'],
                searchGrams: ['produit legacy'],
                category: null,
                status: 'ACTIVE',
                identityActive: true,
                contributedFromWorkspace: null,
                createdBy: actorId,
                updatedBy: actorId,
                createdAt: legacyUpdatedAt,
                updatedAt: legacyUpdatedAt,
            });
            await ProductVariety.collection.insertOne({
                _id: varietyId,
                canonicalProduct: productId,
                name: 'Variété legacy',
                normalizedName: 'variete legacy',
                aliases: [],
                searchKeys: ['variete legacy'],
                searchGrams: ['variete legacy'],
                status: 'ACTIVE',
                identityActive: true,
                contributedFromWorkspace: null,
                createdBy: actorId,
                updatedBy: actorId,
                createdAt: legacyUpdatedAt,
                updatedAt: legacyUpdatedAt,
            });
            await ProductCharacteristic.collection.insertOne({
                _id: characteristicId,
                canonicalProduct: productId,
                kind: 'PRESENTATION',
                name: 'Présentation legacy',
                normalizedName: 'presentation legacy',
                aliases: [],
                searchKeys: ['presentation legacy'],
                searchGrams: ['presentation legacy'],
                status: 'ACTIVE',
                identityActive: true,
                contributedFromWorkspace: null,
                createdBy: actorId,
                updatedBy: actorId,
                createdAt: legacyUpdatedAt,
                updatedAt: legacyUpdatedAt,
            });
            await ProductVariant.collection.insertOne({
                _id: variantId,
                canonicalProduct: productId,
                name: 'Référence legacy',
                normalizedName: 'reference legacy',
                variety: varietyId,
                characteristics: [characteristicId],
                processingState: null,
                normalizedProcessingState: '',
                normalizedSignature: 'reference-legacy',
                conservationType: 'FRAIS',
                foodRange: null,
                referenceUnit: 'g',
                yieldPercent: null,
                status: 'ACTIVE',
                identityActive: true,
                contributedFromWorkspace: null,
                createdBy: actorId,
                updatedBy: actorId,
                createdAt: legacyUpdatedAt,
                updatedAt: legacyUpdatedAt,
            });

            const result = await ensureM002CatalogIndexes();

            const governedModels = [
                ['CanonicalProduct', CanonicalProduct, productId],
                ['ProductVariety', ProductVariety, varietyId],
                ['ProductCharacteristic', ProductCharacteristic, characteristicId],
                ['ProductVariant', ProductVariant, variantId],
            ];

            for (const [modelName, model, id] of governedModels) {
                const document = await model.collection.findOne({ _id: id });
                const backfill = result.governanceBackfill.find(
                    ({ model: resultModel }) => resultModel === modelName,
                );

                expect(document.governanceStatus).toBe(
                    PRODUCT_GOVERNANCE_STATUS.APPROVED,
                );
                expect(document.updatedAt).toEqual(legacyUpdatedAt);
                expect(backfill).toMatchObject({
                    model: modelName,
                    matchedCount: 1,
                    modifiedCount: 1,
                });
            }
        } finally {
            mongoose.set('sanitizeFilter', previousSanitizeFilter);
        }
    });
});
