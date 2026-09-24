import '../setup.js';

import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    migrateM002FoodRangeUsageType,
} from '../../migrations/migrateM002FoodRangeUsageType.migration.js';
import {
    ProductReferenceBootstrapRun,
} from '../../modules/productCatalog/productReferenceBootstrapRun.model.js';
import {
    ProductVariant,
} from '../../modules/productCatalog/productVariant.model.js';
import {
    WorkspaceProduct,
} from '../../modules/productCatalog/workspaceProduct.model.js';
import {
    createActiveProductReference,
} from '../helpers/productCatalogTest.fixtures.js';

const markV2Installed = async (actorId) => {
    await ProductReferenceBootstrapRun.create({
        version: 'm002-reference-v2',
        datasetHash: 'a'.repeat(64),
        actor: actorId,
        categoryCount: 12,
        productCount: 135,
        varietyCount: 0,
        characteristicCount: 0,
        variantCount: 1,
    });
};

const toLegacyRange6 = async (variantId) => {
    await ProductVariant.collection.updateOne(
        { _id: variantId },
        {
            $set: {
                foodRange: 6,
                processingState: 'PAI / PAE',
                normalizedProcessingState: 'pai pae',
                normalizedSignature: 'v:_|c:_|r:6|s:pai pae',
            },
            $unset: { usageType: '' },
        },
    );
};

describe('M-002 food range / usage type migration', () => {
    it('ajoute usageType à la signature et reste idempotente', async () => {
        const reference = await createActiveProductReference({
            name: 'Carotte usage',
            foodRange: 1,
        });

        await ProductVariant.collection.updateOne(
            { _id: reference.variant._id },
            {
                $set: {
                    normalizedSignature:
                        'v:_|c:_|r:1|s:produit frais',
                },
                $unset: { usageType: '' },
            },
        );

        const first = await migrateM002FoodRangeUsageType();
        const migrated = await ProductVariant.collection.findOne({
            _id: reference.variant._id,
        });

        expect(first).toMatchObject({
            matchedCount: 1,
            retiredLegacyRange6: 0,
        });
        expect(migrated.usageType).toBeNull();
        expect(migrated.normalizedSignature).toBe(
            'v:_|c:_|r:1|s:produit frais|u:_',
        );

        const second = await migrateM002FoodRangeUsageType();
        expect(second.modifiedCount).toBe(0);
    });

    it('retire une Gamme 6 v2 non utilisée et reste idempotente', async () => {
        const reference = await createActiveProductReference({
            name: 'Jambon blanc',
            categoryName: 'Charcuteries',
            foodRange: 1,
        });
        await markV2Installed(reference.variant.createdBy);
        await toLegacyRange6(reference.variant._id);

        const first = await migrateM002FoodRangeUsageType();
        const migrated = await ProductVariant.collection.findOne({
            _id: reference.variant._id,
        });

        expect(first.retiredLegacyRange6).toBe(1);
        expect(migrated).toMatchObject({
            status: 'ARCHIVED',
            identityActive: false,
            foodRange: null,
            usageType: null,
            processingState: null,
        });
        expect(migrated.normalizedSignature)
            .toContain('__m002_retired_range6__');

        const second = await migrateM002FoodRangeUsageType();
        expect(second).toMatchObject({
            matchedCount: 0,
            modifiedCount: 0,
            retiredLegacyRange6: 0,
        });
    });

    it('refuse une Gamme 6 déjà utilisée par un Workspace', async () => {
        const reference = await createActiveProductReference({
            name: 'Jambon blanc',
            categoryName: 'Charcuteries',
            foodRange: 1,
        });
        await markV2Installed(reference.variant.createdBy);
        await toLegacyRange6(reference.variant._id);

        await WorkspaceProduct.create({
            workspace: new mongoose.Types.ObjectId(),
            productVariant: reference.variant._id,
            status: 'ACTIVE',
            createdBy: reference.variant.createdBy,
            updatedBy: reference.variant.updatedBy,
        });

        await expect(migrateM002FoodRangeUsageType()).rejects.toThrow(
            /déjà utilisée par un Workspace/,
        );

        const untouched = await ProductVariant.collection.findOne({
            _id: reference.variant._id,
        });
        expect(untouched.foodRange).toBe(6);
        expect(untouched.identityActive).toBe(true);
    });

    it('refuse une Gamme 6 qui ne correspond pas au bootstrap v2', async () => {
        const reference = await createActiveProductReference({
            name: 'Produit arbitraire',
            foodRange: 1,
        });
        await markV2Installed(reference.variant.createdBy);
        await toLegacyRange6(reference.variant._id);

        await expect(migrateM002FoodRangeUsageType()).rejects.toThrow(
            /ne correspond pas exactement au bootstrap v2/,
        );
    });
});
